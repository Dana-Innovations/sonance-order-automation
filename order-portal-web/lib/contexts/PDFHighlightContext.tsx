'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { PageViewport } from 'pdfjs-dist';

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageTextData {
  items: TextItem[];
  shipToRegion?: Region;
  lineRowMap?: Map<number, Region>;
}

interface HighlightConfig {
  fieldType: 'line_item' | 'shipto_address' | 'order_header';
  fieldName?: string;
  value: string | number;
  lineNumber?: number;
  context: string;
  columnHint?: 'left' | 'center' | 'right'; // Optional column position hint
}

interface MousePosition {
  x: number;
  y: number;
  pageX: number;
  pageY: number;
}

interface HighlightMatch {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

interface PDFHighlightContextType {
  isEnabled: boolean;
  activeHighlight: HighlightConfig | null;
  pdfTextData: Map<string, Map<number, PageTextData>>;
  mousePosition: MousePosition | null;
  highlightMatches: HighlightMatch[];
  debugMessage: string | null;
  setEnabled: (enabled: boolean) => void;
  setHighlight: (config: HighlightConfig | null) => void;
  clearHighlight: () => void;
  setMousePosition: (position: MousePosition | null) => void;
  setPDFTextData: (pdfUrl: string, pageNumber: number, data: PageTextData) => void;
  findTextMatches: (config: HighlightConfig, pdfUrl: string, pageNumber: number) => HighlightMatch[];
}

const PDFHighlightContext = createContext<PDFHighlightContextType | undefined>(undefined);

export function PDFHighlightProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pdfHighlightEnabled') === 'true';
    }
    return false;
  });

  const [activeHighlight, setActiveHighlightState] = useState<HighlightConfig | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
  const [highlightMatches, setHighlightMatches] = useState<HighlightMatch[]>([]);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  // Cache: Map<pdfUrl, Map<pageNumber, PageTextData>>
  const pdfTextDataRef = useRef<Map<string, Map<number, PageTextData>>>(new Map());

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdfHighlightEnabled', enabled.toString());
    }
    if (!enabled) {
      setActiveHighlightState(null);
      setHighlightMatches([]);
    }
  }, []);

  const setHighlight = useCallback((config: HighlightConfig | null) => {
    if (!isEnabled) return;
    setActiveHighlightState(config);
    if (!config) {
      setHighlightMatches([]);
    }
  }, [isEnabled]);

  const clearHighlight = useCallback(() => {
    setActiveHighlightState(null);
    setHighlightMatches([]);
    setDebugMessage(null);
  }, []);

  const setPDFTextData = useCallback((pdfUrl: string, pageNumber: number, data: PageTextData) => {
    const urlMap = pdfTextDataRef.current.get(pdfUrl) || new Map();
    urlMap.set(pageNumber, data);
    pdfTextDataRef.current.set(pdfUrl, urlMap);
  }, []);

  const findTextMatches = useCallback((
    config: HighlightConfig,
    pdfUrl: string,
    pageNumber: number
  ): HighlightMatch[] => {
    const urlMap = pdfTextDataRef.current.get(pdfUrl);
    if (!urlMap) return [];

    const pageData = urlMap.get(pageNumber);
    if (!pageData) return [];

    let filteredItems = pageData.items;
    const searchValue = String(config.value).trim();

    // Context-aware filtering by spatial region
    if (config.fieldType === 'line_item' && config.lineNumber && pageData.lineRowMap) {
      const rowRegion = pageData.lineRowMap.get(config.lineNumber);
      if (rowRegion) {
        filteredItems = filteredItems.filter(item =>
          item.y >= rowRegion.y &&
          item.y < rowRegion.y + rowRegion.height
        );
      } else {
        console.warn(`[PDF] No row region for line ${config.lineNumber}`);
      }
    } else if (config.fieldType === 'shipto_address' && pageData.shipToRegion) {
      const region = pageData.shipToRegion;
      filteredItems = filteredItems.filter(item =>
        item.x >= region.x &&
        item.x < region.x + region.width &&
        item.y >= region.y &&
        item.y < region.y + region.height
      );
    } else if (config.fieldType === 'order_header') {
      // Special handling for order total - it's at the bottom, not the top
      if (config.fieldName === 'cust_order_total') {
        // Strategy: Exclude line item rows, then search for the value
        // This way we find totals without accidentally matching line items
        if (pageData.lineRowMap && pageData.lineRowMap.size > 0) {
          // Exclude all items that are within line item rows
          filteredItems = filteredItems.filter(item => {
            // Check if this item is within any line item row
            for (const [lineNum, rowRegion] of pageData.lineRowMap.entries()) {
              if (item.y >= rowRegion.y && item.y < rowRegion.y + rowRegion.height) {
                return false; // Exclude - this is in a line item row
              }
            }
            return true; // Include - not in any line item row
          });

          // Optional: Further refine by looking for items near "Total" text
          const totalLabels = filteredItems.filter(item =>
            /total/i.test(item.text) && item.text.length < 20 // Short text, likely a label
          );

          if (totalLabels.length > 0) {
            // Find the bottom-most "Total" label
            const orderTotalLabel = totalLabels.reduce((lowest, current) =>
              current.y > lowest.y ? current : lowest
            );

            // Filter to items near this Total label (within ±25px vertically, to the right)
            const nearTotalItems = filteredItems.filter(item =>
              Math.abs(item.y - orderTotalLabel.y) < 25 &&
              item.x > orderTotalLabel.x - 50 // Allow slight left overlap
            );

            // Use the refined list if we found items, otherwise use all non-line-item items
            if (nearTotalItems.length > 0) {
              filteredItems = nearTotalItems;
            }
          }
        }
        // If no line row map, search entire page (will match first occurrence)
      } else {
        // Other order header fields are typically in the top portion of the PDF
        // Filter to top 300px of the page
        filteredItems = filteredItems.filter(item => item.y < 300);
      }
    }

    // Find exact or partial matches (case-insensitive)
    const searchLower = searchValue.toLowerCase();
    const candidates: HighlightMatch[] = [];

    // Special handling for dates and currency - try multiple formats
    let searchPatterns: string[] = [searchValue];

    if (config.fieldName === 'cust_order_date') {
      // If searching for a date, generate alternative formats
      // e.g., "12/2/2025" -> try "02-DEC-2025", "2-DEC-2025", "DEC-2025", etc.
      const dateParts = searchValue.split('/');
      if (dateParts.length === 3) {
        const month = parseInt(dateParts[0]);
        const day = parseInt(dateParts[1]);
        const year = dateParts[2];

        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        if (month >= 1 && month <= 12) {
          const monthAbbr = monthNames[month - 1];
          searchPatterns = [
            searchValue,                              // "12/2/2025"
            `${day.toString().padStart(2, '0')}-${monthAbbr}-${year}`,  // "02-DEC-2025"
            `${day}-${monthAbbr}-${year}`,           // "2-DEC-2025"
            `${monthAbbr}-${day}-${year}`,           // "DEC-2-2025"
            `${monthAbbr} ${day}, ${year}`,          // "DEC 2, 2025"
            monthAbbr,                                // "DEC"
            year                                      // "2025"
          ];
        }
      }
    } else if (config.fieldName === 'cust_order_total' || config.fieldName === 'cust_line_total' || config.fieldName === 'cust_unit_price') {
      // If searching for a currency value, try multiple formats
      // e.g., "1,121.28" -> try "$1,121.28", "1121.28", "$1121.28", "$ 1,121.28", etc.
      const noComma = searchValue.replace(/,/g, '');
      searchPatterns = [
        searchValue,                    // "1,121.28"
        noComma,                        // "1121.28"
        `$${searchValue}`,              // "$1,121.28"
        `$${noComma}`,                  // "$1121.28"
        `$ ${searchValue}`,             // "$ 1,121.28"
        `$ ${noComma}`,                 // "$ 1121.28"
      ];
    }

    // First pass: Try to find exact or partial matches in individual items
    for (const item of filteredItems) {
      const itemTextLower = item.text.toLowerCase();

      for (const pattern of searchPatterns) {
        const patternLower = pattern.toLowerCase();

        // Try exact match first
        if (itemTextLower === patternLower || item.text === pattern) {
          candidates.push({
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            text: item.text
          });
          break; // Found a match, no need to try other patterns
        }
        // Then try partial match
        else if (itemTextLower.includes(patternLower)) {
          candidates.push({
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            text: item.text
          });
          break; // Found a match, no need to try other patterns
        }
      }
    }

    // Second pass: If no match, try combining adjacent items (text might be split)
    if (candidates.length === 0 && filteredItems.length > 1) {
      // Sort items by X position (left to right)
      const sortedItems = [...filteredItems].sort((a, b) => a.x - b.x);

      for (let i = 0; i < sortedItems.length - 1; i++) {
        const combined = sortedItems[i].text + sortedItems[i + 1].text;
        if (combined.toLowerCase().includes(searchLower)) {
          // Use position of first item
          candidates.push({
            x: sortedItems[i].x,
            y: sortedItems[i].y,
            width: (sortedItems[i + 1].x + sortedItems[i + 1].width) - sortedItems[i].x,
            height: Math.max(sortedItems[i].height, sortedItems[i + 1].height),
            text: combined
          });
          break; // Found a match
        }
      }
    }

    if (candidates.length === 0) {
      // Show what we actually found for debugging
      const itemTexts = filteredItems.map(i => i.text).join(' | ');
      console.warn(`[PDF] No match for "${searchValue}" in line ${config.lineNumber}. Found ${filteredItems.length} items: ${itemTexts}`);

      // Set debug message for visual display
      const rowRegion = config.fieldType === 'line_item' && config.lineNumber && pageData.lineRowMap
        ? pageData.lineRowMap.get(config.lineNumber)
        : null;

      const debugInfo = [
        `Line ${config.lineNumber}: "${searchValue}" NOT FOUND`,
        `Items in row: ${filteredItems.length}`,
        rowRegion ? `Y-range: ${rowRegion.y.toFixed(1)} - ${(rowRegion.y + rowRegion.height).toFixed(1)}` : '',
        `Texts: ${itemTexts || '(none)'}`
      ].filter(Boolean).join('\n');

      setDebugMessage(debugInfo);

      return [];
    }

    // Clear debug message when match found
    setDebugMessage(null);

    // If we have a column hint and multiple matches, filter by column position
    if (config.columnHint && candidates.length > 1) {
      const pageWidth = 800; // Approximate PDF page width
      let targetMatches = candidates;

      if (config.columnHint === 'left') {
        // Left third of page (0-266)
        targetMatches = candidates.filter(c => c.x < pageWidth / 3);
      } else if (config.columnHint === 'center') {
        // Center third of page (266-533)
        targetMatches = candidates.filter(c => c.x >= pageWidth / 3 && c.x < (pageWidth * 2) / 3);
      } else if (config.columnHint === 'right') {
        // Right third of page (533-800)
        targetMatches = candidates.filter(c => c.x >= (pageWidth * 2) / 3);
      }

      if (targetMatches.length > 0) {
        candidates.length = 0;
        candidates.push(...targetMatches);
      }
    }

    // Return only the first match to avoid highlighting duplicates
    return [candidates[0]];
  }, []);

  const value: PDFHighlightContextType = {
    isEnabled,
    activeHighlight,
    pdfTextData: pdfTextDataRef.current,
    mousePosition,
    highlightMatches,
    debugMessage,
    setEnabled,
    setHighlight,
    clearHighlight,
    setMousePosition,
    setPDFTextData,
    findTextMatches
  };

  return (
    <PDFHighlightContext.Provider value={value}>
      {children}
    </PDFHighlightContext.Provider>
  );
}

export function usePDFHighlight() {
  const context = useContext(PDFHighlightContext);
  if (context === undefined) {
    throw new Error('usePDFHighlight must be used within a PDFHighlightProvider');
  }
  return context;
}
