import { PDFPageProxy, TextItem as PDFTextItem } from 'pdfjs-dist/types/src/display/api';

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageTextData {
  items: TextItem[];
  shipToRegion?: Region;
  lineRowMap?: Map<number, Region>;
}

/**
 * Extract text with positions from a PDF page
 */
export async function extractTextWithPositions(page: PDFPageProxy): Promise<TextItem[]> {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1.0 });
  const items: TextItem[] = [];

  for (const item of textContent.items) {
    if ('str' in item && item.str.trim()) {
      const tx = item.transform;

      // Transform coordinates from PDF space to viewport space
      // PDF.js provides transform matrix [a, b, c, d, e, f]
      // where e and f are x and y positions
      const x = tx[4];

      // Get font height from transform matrix (vertical scale factor)
      const fontSize = Math.abs(tx[3]) || 12;

      // Y coordinate: PDF has origin at bottom-left, we need top-left
      // tx[5] is the baseline Y position in PDF space
      // We need to flip it and adjust for the font height
      const y = viewport.height - tx[5] - fontSize;

      // Estimate width and height
      const width = item.width || 0;
      const height = fontSize;

      items.push({
        text: item.str,
        x,
        y,
        width,
        height
      });
    }
  }

  return items;
}

/**
 * Detect the Ship-To region in the PDF
 * Looks for "Ship To" anchor text and defines a bounding box
 * Explicitly excludes "Bill To" region
 */
export function detectShipToRegion(textItems: TextItem[]): Region | undefined {
  // Find "Ship To" text (case insensitive, must match "ship to" specifically)
  const shipToItem = textItems.find(item =>
    /ship\s+to/i.test(item.text) && !/bill/i.test(item.text)
  );

  // Also find "Bill To" to avoid it
  const billToItem = textItems.find(item =>
    /bill\s+to/i.test(item.text)
  );

  if (!shipToItem) {
    console.warn('Could not find "Ship To" anchor in PDF');
    return undefined;
  }

  // Calculate height: either distance to next major section or default
  let height = 200; // Default typical address block height

  // If Bill To is below Ship To, adjust height to not overlap
  if (billToItem && billToItem.y > shipToItem.y) {
    height = Math.min(billToItem.y - shipToItem.y - 10, 200);
  }

  // Find the rightmost X position of ship-to related text to determine width
  const shipToRegionItems = textItems.filter(item =>
    item.y >= shipToItem.y &&
    item.y <= shipToItem.y + height &&
    item.x < 450 // Only left side of page
  );

  const maxX = shipToRegionItems.length > 0
    ? Math.max(...shipToRegionItems.map(item => item.x + item.width))
    : shipToItem.x + 350;

  console.log(`[PDF] Ship-To region: X=${shipToItem.x.toFixed(1)}, Y=${shipToItem.y.toFixed(1)}, Width=${(maxX - shipToItem.x).toFixed(1)}, Height=${height.toFixed(1)}`);

  // Define region extending from Ship To heading downward
  return {
    x: shipToItem.x - 10, // Small padding
    y: shipToItem.y,
    width: Math.max(maxX - shipToItem.x + 20, 350), // Dynamic width or minimum 350
    height: height
  };
}

/**
 * Detect line item rows by finding line numbers in leftmost column
 * Returns a map of line number to row bounding box
 */
export function detectLineItemRows(textItems: TextItem[]): Map<number, Region> {
  // Find items that are pure numbers in the leftmost area (x < 100)
  const lineNumberItems = textItems
    .filter(item => /^\d+$/.test(item.text) && item.x < 100)
    .map(item => ({
      lineNumber: parseInt(item.text, 10),
      x: item.x,
      y: item.y,
      height: item.height
    }))
    .sort((a, b) => a.y - b.y); // Sort by vertical position

  if (lineNumberItems.length === 0) {
    console.warn('Could not detect line item rows in PDF');
    return new Map();
  }

  const rowMap = new Map<number, Region>();

  // Create NON-OVERLAPPING bounding boxes for each line
  for (let i = 0; i < lineNumberItems.length; i++) {
    const current = lineNumberItems[i];
    const next = lineNumberItems[i + 1];

    // Calculate row height based on distance to next line or default
    let rowHeight: number;

    if (next) {
      // Distance to next line, reduced slightly to prevent overlap
      rowHeight = Math.max((next.y - current.y) * 0.90, 20); // Minimum 20px
    } else {
      // Last line - use a generous default height
      rowHeight = Math.max(current.height * 3, 40); // Minimum 40px for last line
    }

    rowMap.set(current.lineNumber, {
      x: 0,
      y: current.y - 2, // Small padding above
      width: 1000, // Cover full page width
      height: rowHeight
    });
  }

  console.log(`[PDF] Detected ${rowMap.size} line rows with heights:`,
    Array.from(rowMap.entries()).map(([line, region]) =>
      `Line ${line}: ${region.height.toFixed(1)}px`
    ).join(', ')
  );

  return rowMap;
}

/**
 * Find text items within a specific context (line row or ship-to region)
 */
export function findTextInContext(
  textItems: TextItem[],
  searchValue: string | number,
  context: {
    type: 'line_item' | 'shipto_address';
    lineNumber?: number;
    region?: Region;
    lineRowMap?: Map<number, Region>;
  }
): TextItem[] {
  const searchStr = String(searchValue).trim();
  let filteredItems = textItems;

  // Filter by spatial region
  if (context.type === 'line_item' && context.lineNumber && context.lineRowMap) {
    const rowRegion = context.lineRowMap.get(context.lineNumber);
    if (rowRegion) {
      filteredItems = textItems.filter(item =>
        item.y >= rowRegion.y &&
        item.y < rowRegion.y + rowRegion.height
      );
    }
  } else if (context.type === 'shipto_address' && context.region) {
    const region = context.region;
    filteredItems = textItems.filter(item =>
      item.x >= region.x &&
      item.x < region.x + region.width &&
      item.y >= region.y &&
      item.y < region.y + region.height
    );
  }

  // Find exact or partial matches
  return filteredItems.filter(item => item.text.includes(searchStr));
}

/**
 * Extract and process all text data for a page
 */
export async function extractPageTextData(page: PDFPageProxy): Promise<PageTextData> {
  const items = await extractTextWithPositions(page);
  const shipToRegion = detectShipToRegion(items);
  const lineRowMap = detectLineItemRows(items);

  return {
    items,
    shipToRegion,
    lineRowMap
  };
}
