# AI Prompt Wizard - Implementation Plan

## Overview

**Goal:** Create a guided wizard that helps users build 3 customer-specific prompts for order processing automation.

**Approach:** Step-by-step question wizard where users answer via voice recording (Whisper) or text, with PDF examples as context.

**Wizard Output:** 3 optimized prompts per customer:
1. **Order Header Prompt** - Extract ship-to address, carrier, ship via
2. **Order Line Prompt** - Extract product details, pricing, UOM
3. **Multi-Account Routing Prompt** - (Optional) Determine PeopleSoft account number

---

## Wizard Flow Architecture

### Step 0: Customer Selection & Setup
```
┌────────────────────────────────────────────┐
│  Create Prompts for Customer               │
├────────────────────────────────────────────┤
│                                             │
│  Select Customer:                          │
│  [Dropdown: Customer Name]                 │
│                                             │
│  Upload Sample PDF Orders (1-3 files):     │
│  ┌───────────────────────────────────────┐ │
│  │ 📄 Drag & drop or click to upload    │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Uploaded:                                  │
│  ✓ sample_order_1.pdf                      │
│  ✓ sample_order_2.pdf                      │
│                                             │
│  ⚠️ Is this customer associated with       │
│     multiple PeopleSoft account numbers?   │
│     ○ Yes - I'll need routing logic        │
│     ○ No - Single account only             │
│                                             │
│            [Next: Start Wizard →]          │
└────────────────────────────────────────────┘
```

**Features:**
- Select customer from existing customers table
- Upload 1-3 sample PDFs (provides context for all prompts)
- Multi-account question determines if Step 3 is needed
- PDFs are analyzed to extract structure/layout

---

### Wizard Structure

```
Multi-Account?
    ↓
    ├─ YES → Generate 3 prompts
    │        Step 1: Order Header (5-7 questions)
    │        Step 2: Order Lines (6-8 questions)
    │        Step 3: Account Routing (4-5 questions)
    │
    └─ NO  → Generate 2 prompts
             Step 1: Order Header (5-7 questions)
             Step 2: Order Lines (6-8 questions)
```

---

## Step 1: Order Header Prompt Questions

### Question 1: Ship-To Address Location
```
┌────────────────────────────────────────────────────────┐
│ Step 1 of 7: Order Header Information                  │
│ Question 1: Ship-To Address                            │
├────────────────────────────────────────────────────────┤
│                                                         │
│ 📍 Where on the PDF is the ship-to address located?   │
│                                                         │
│ 🎤 [Record Answer] ⏺️ Recording... 0:23                │
│                                                         │
│ Transcript:                                            │
│ ┌─────────────────────────────────────────────────┐   │
│ │ "The ship-to address is usually in the top      │   │
│ │  right corner of the PDF, below the order       │   │
│ │  number. It includes street, city, state, zip." │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ OR enter text manually:                                │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Add additional details or examples...]         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 💡 Tip: Look at your uploaded PDFs and describe the   │
│    exact location and format of the address.          │
│                                                         │
│ ← Back                          [Next Question →]     │
└────────────────────────────────────────────────────────┘
```

### Question 2: Address Format & Variations
```
❓ How is the address formatted? Are there any variations
   across different orders?

🎤 Record your answer or type below
📝 Examples: Multi-line vs single-line, PO Box handling, etc.
```

### Question 3: Shipping Carrier Identification
```
❓ Where is the shipping carrier specified?
   (e.g., UPS, FedEx, USPS)

🎤 Record your answer
📝 Is it labeled clearly or do you need to infer it from
   tracking numbers or other clues?
```

### Question 4: Carrier Variations & Edge Cases
```
❓ What carrier names appear on the PDFs? Are there
   abbreviations or multiple ways they're written?

🎤 Record your answer
📝 Examples: "FedEx", "Federal Express", "FEDEX", etc.
```

### Question 5: Ship Via Method
```
❓ Where is the ship-via method indicated?
   (e.g., Ground, 2-Day Air, Overnight)

🎤 Record your answer
📝 Is it a separate field or combined with the carrier info?
```

### Question 6: Default Values & Missing Data
```
❓ What should we do if shipping information is missing
   from the PDF?

🎤 Record your answer
📝 Should we use a default value? Flag for manual review?
   How do you currently handle this?
```

### Question 7: Additional Header Fields (Optional)
```
❓ Are there any other important fields in the order
   header we should extract?

🎤 Record your answer
📝 Examples: PO Number, Order Date, Requested Ship Date,
   Special Instructions, etc.
```

### Summary & Examples
```
┌────────────────────────────────────────────────────────┐
│ Order Header Prompt - Review Your Answers              │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ✓ Ship-to address: Top right, multi-line format        │
│ ✓ Carrier: Bottom left, various spellings              │
│ ✓ Ship via: Combined with carrier                      │
│ ✓ Missing data: Flag for manual review                 │
│                                                         │
│ 📄 Add text examples (optional but recommended):       │
│                                                         │
│ Example 1: Typical ship-to address format              │
│ ┌─────────────────────────────────────────────────┐   │
│ │ SHIP TO:                                        │   │
│ │ Acme Corporation                                │   │
│ │ 123 Main Street                                 │   │
│ │ Los Angeles, CA 90001                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Example 2: Carrier format                              │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Ship Via: FedEx Ground                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Add Another Example]                                │
│                                                         │
│ ← Back to Questions    [Continue to Order Lines →]    │
└────────────────────────────────────────────────────────┘
```

---

## Step 2: Order Line Prompt Questions

### Question 1: Line Items Location
```
❓ Where are the line items located on the PDF?

🎤 Record your answer
📝 Describe the table structure: columns, headers,
   how many lines per page, etc.
```

### Question 2: Product Number/SKU
```
❓ Where is the product number or SKU located?
   What is this field typically called?

🎤 Record your answer
📝 Examples: "Item #", "Part Number", "SKU", "Product Code"
   Are there prefixes or special formats?
```

### Question 3: Product Description
```
❓ Where is the product description?
   Are there short and long descriptions?

🎤 Record your answer
📝 Is the description ever truncated or split across lines?
```

### Question 4: Quantity Field
```
❓ Where is the quantity specified?
   What format is it in?

🎤 Record your answer
📝 Is it always a whole number? Decimals? How are
   large quantities formatted (commas)?
```

### Question 5: Unit of Measure (UOM)
```
❓ Where is the unit of measure indicated?
   What UOM types appear?

🎤 Record your answer
📝 Examples: EA (Each), CS (Case), BX (Box), DZ (Dozen)
   List all possible UOM codes you see
```

### Question 6: Pricing Information
```
❓ Where are prices located? Unit price, extended price,
   or both?

🎤 Record your answer
📝 Are prices clearly labeled? Any currency symbols?
   How are decimals formatted?
```

### Question 7: Price Variations
```
❓ Do prices ever have discounts, adjustments, or
   special pricing indicators?

🎤 Record your answer
📝 How can we tell if a price is discounted or promotional?
```

### Question 8: Line Item Edge Cases
```
❓ What are common issues with line items?

🎤 Record your answer
📝 Examples: Items split across pages, subtotal rows,
   shipping charges appearing as line items, etc.
```

### Summary & Examples
```
┌────────────────────────────────────────────────────────┐
│ Order Line Prompt - Review Your Answers                │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ✓ Line items: Table starting ~middle of page           │
│ ✓ Product #: First column, format: ABC-1234            │
│ ✓ Description: Second column, may wrap                 │
│ ✓ Quantity: Third column, whole numbers with commas    │
│ ✓ UOM: Fourth column (EA, CS, BX most common)          │
│ ✓ Pricing: Unit price and extended price               │
│                                                         │
│ 📄 Add example line item(s):                           │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Item #  Description       Qty  UOM  Unit  Ext   │   │
│ │ VP62    Visual Performance 10  EA   $299  $2990 │   │
│ │ VP66    6.5" In-Ceiling    5   EA   $399  $1995 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Add Another Example]                                │
│                                                         │
│ ← Back to Header    [Continue to Account Routing →]   │
│                     (or [Generate Prompts] if single)  │
└────────────────────────────────────────────────────────┘
```

---

## Step 3: Multi-Account Routing Prompt (Conditional)

**Only shown if user answered "Yes" to multi-account question**

### Question 1: Account Identification Fields
```
❓ What information on the PDF tells you which
   PeopleSoft account to use?

🎤 Record your answer
📝 Examples: Ship-to address, specific project codes,
   department names, location identifiers, etc.
```

### Question 2: Account Mapping Rules
```
❓ How do you currently determine which account to use?
   What are the rules?

🎤 Record your answer
📝 Walk through your decision process. Example:
   "If ship-to state is CA, use account A. If state is
   TX, use account B."
```

### Question 3: All Account Numbers
```
❓ What are all the possible PeopleSoft account numbers
   for this customer?

🎤 Record your answer
📝 List each account number and what it's for.
   Example: "Account 12345 for West Coast,
   Account 67890 for East Coast"
```

### Question 4: Edge Cases & Conflicts
```
❓ What happens if the routing logic is unclear or
   multiple accounts could apply?

🎤 Record your answer
📝 Should we have a default account? Flag for manual review?
   How do you handle ambiguous cases?
```

### Question 5: Validation
```
❓ How can we verify we selected the correct account?

🎤 Record your answer
📝 Are there any cross-checks we can perform? Fields that
   should match certain patterns for each account?
```

### Summary & Examples
```
┌────────────────────────────────────────────────────────┐
│ Multi-Account Routing - Review Your Answers            │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ✓ Routing based on: Ship-to state and city             │
│ ✓ Account logic: CA → 12345, TX → 67890, other → 55555│
│ ✓ Default account: 55555 (main account)                │
│ ✓ Validation: Check ZIP code ranges                    │
│                                                         │
│ 📄 Add example scenarios:                              │
│                                                         │
│ Scenario 1:                                             │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Ship to: Los Angeles, CA 90001                  │   │
│ │ Expected account: 12345                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Scenario 2:                                             │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Ship to: Houston, TX 77001                      │   │
│ │ Expected account: 67890                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Add Another Scenario]                               │
│                                                         │
│ ← Back to Order Lines       [Generate Prompts →]      │
└────────────────────────────────────────────────────────┘
```

---

## Final Step: Generate & Review Prompts

```
┌────────────────────────────────────────────────────────┐
│ 🎉 Ready to Generate Your Prompts!                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│ We'll use all your inputs to create optimized prompts: │
│                                                         │
│ ✅ Customer: Acme Corporation                          │
│ ✅ Sample PDFs: 2 files uploaded                       │
│ ✅ Voice recordings: 18 questions answered             │
│ ✅ Text examples: 6 examples provided                  │
│                                                         │
│ Prompts to generate:                                    │
│ 1️⃣ Order Header Prompt (Ship-to, Carrier, Ship Via)  │
│ 2️⃣ Order Line Prompt (Products, Pricing, UOM)        │
│ 3️⃣ Account Routing Prompt (Multi-account logic)      │
│                                                         │
│ Estimated cost: $0.08                                  │
│ Generation time: ~30-45 seconds                        │
│                                                         │
│        [← Review Answers]    [Generate Prompts →]     │
└────────────────────────────────────────────────────────┘

↓ After clicking "Generate Prompts"

┌────────────────────────────────────────────────────────┐
│ 🤖 Generating Your Prompts...                          │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ⏳ Analyzing your PDFs and extracting structure...     │
│ ██████████░░░░░░░░░░ 50%                               │
│                                                         │
│ ⏳ Processing voice transcripts...                     │
│ ████████████████████ 100% ✓                            │
│                                                         │
│ ⏳ Generating Order Header Prompt...                   │
│ ████████████░░░░░░░░ 60%                               │
│                                                         │
│ Please wait, this may take 30-45 seconds...            │
│                                                         │
└────────────────────────────────────────────────────────┘

↓ After generation complete

┌────────────────────────────────────────────────────────┐
│ ✅ Prompts Generated Successfully!                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Your 3 prompts are ready. Review and save them:        │
│                                                         │
│ Tabs: [Order Header] [Order Lines] [Account Routing]  │
│                                                         │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ Order Header Extraction Prompt                   ║  │
│ ╠══════════════════════════════════════════════════╣  │
│ ║                                                  ║  │
│ ║ # Extract Order Header Information              ║  │
│ ║                                                  ║  │
│ ║ You are processing order PDFs for Acme Corp...  ║  │
│ ║                                                  ║  │
│ ║ ## Ship-To Address                              ║  │
│ ║ - Location: Top right corner of the PDF         ║  │
│ ║ - Format: Multi-line address                    ║  │
│ ║ - Extract: Company name, street, city, state... ║  │
│ ║                                                  ║  │
│ ║ [Scroll to see full prompt...]                  ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                         │
│ [📋 Copy]  [💾 Save to Customer]  [🔄 Regenerate]     │
│                                                         │
│ 💡 AI Suggestions:                                     │
│ • Consider adding validation for international addrs   │
│ • Add handling for PO Box addresses                    │
│ • Define behavior when carrier is abbreviated          │
│                                                         │
│         [← Start Over]        [Save All Prompts →]    │
└────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### New Table: `customer_prompts`
```sql
CREATE TABLE customer_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Wizard session data
  wizard_session_id UUID NOT NULL REFERENCES prompt_builder_sessions(id),
  is_multi_account BOOLEAN DEFAULT false,

  -- Generated prompts
  header_prompt TEXT NOT NULL,
  line_prompt TEXT NOT NULL,
  routing_prompt TEXT, -- NULL if single account

  -- Metadata
  sample_pdf_urls TEXT[], -- Uploaded sample PDFs
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active', -- active, archived, draft

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE INDEX idx_customer_prompts_customer ON customer_prompts(customer_id);
CREATE INDEX idx_customer_prompts_status ON customer_prompts(status);
```

### Updated Table: `prompt_builder_sessions`
```sql
ALTER TABLE prompt_builder_sessions
  ADD COLUMN customer_id UUID REFERENCES customers(id),
  ADD COLUMN wizard_type VARCHAR(50), -- 'order_header', 'order_line', 'account_routing'
  ADD COLUMN wizard_step INTEGER DEFAULT 1,
  ADD COLUMN is_multi_account BOOLEAN,
  ADD COLUMN question_answers JSONB DEFAULT '[]';
  -- Structure: [{question_id, question_text, voice_url, transcript, text_answer, examples: []}]
```

### New Table: `wizard_questions`
```sql
CREATE TABLE wizard_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wizard_type VARCHAR(50) NOT NULL, -- 'order_header', 'order_line', 'account_routing'
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  help_text TEXT,
  tip_text TEXT,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(wizard_type, question_number)
);

CREATE INDEX idx_wizard_questions_type ON wizard_questions(wizard_type);

-- Seed with the questions defined above
```

---

## Implementation Phases

### Phase 1: Wizard UI Framework (Week 1)

**Task 1.1: Customer Selection & Setup Page**
- Customer dropdown
- PDF upload with preview
- Multi-account Yes/No question
- Navigation to wizard

**Task 1.2: Wizard Shell Component**
- Step progress indicator
- Question display framework
- Navigation (Back/Next)
- Save draft functionality

**Task 1.3: Voice Recording Component**
- Record button with timer
- Audio waveform visualization
- Playback controls
- Auto-transcribe on stop
- Display transcript

**Task 1.4: Text Input & Examples Component**
- Additional text input field
- Multiple examples support
- Rich text formatting
- Character count

**Deliverables:**
- ✅ Working wizard shell
- ✅ Voice recording functional
- ✅ Example input working
- ✅ Navigation between steps

---

### Phase 2: Question Flow Implementation (Week 1-2)

**Task 2.1: Seed Wizard Questions**
- Create migration with all questions
- Order Header questions (7)
- Order Line questions (8)
- Account Routing questions (5)

**Task 2.2: Dynamic Question Renderer**
- Load questions from database
- Display current question
- Capture voice + text + examples
- Save answers to session

**Task 2.3: Conditional Logic**
- Skip routing questions if single account
- Show/hide based on previous answers
- Progress calculation

**Task 2.4: Review & Summary Pages**
- Display all answers per prompt type
- Edit individual answers
- Add/remove examples
- Validation checks

**Deliverables:**
- ✅ All 20 questions implemented
- ✅ Conditional flow working
- ✅ Review pages functional
- ✅ Data persistence

---

### Phase 3: AI Generation Engine (Week 2)

**Task 3.1: Context Builder**
- Combine all voice transcripts
- Include text answers
- Extract text from PDFs
- Organize by prompt type

**Task 3.2: Prompt Generation API**
- Build Claude API request
- Separate system prompts for each type
- Include PDF structure analysis
- Generate 3 prompts

**Task 3.3: System Prompts for Each Type**

**Order Header System Prompt:**
```
You are an expert at creating prompts for PDF data extraction,
specifically for order header information.

Based on the user's answers and PDF examples, create a detailed
prompt that:
1. Identifies the ship-to address location and format
2. Extracts shipping carrier and ship-via method
3. Handles variations and edge cases
4. Provides clear extraction instructions

User's Context:
- PDF Structure: {pdfAnalysis}
- Voice Answers: {transcripts}
- Text Answers: {textAnswers}
- Examples: {examples}

Generate a production-ready prompt that can be used in an n8n
workflow with Claude API to extract this information reliably.
```

**Order Line System Prompt:**
```
You are an expert at creating prompts for PDF table extraction,
specifically for order line items.

Based on the user's answers and PDF examples, create a detailed
prompt that:
1. Identifies the line items table structure
2. Extracts product numbers, descriptions, quantities, UOM, pricing
3. Handles multi-page tables and edge cases
4. Returns structured JSON output

User's Context:
- PDF Structure: {pdfAnalysis}
- Voice Answers: {transcripts}
- Text Answers: {textAnswers}
- Examples: {examples}

Generate a production-ready prompt optimized for accuracy and
handling of common issues like wrapped text, subtotals, etc.
```

**Account Routing System Prompt:**
```
You are an expert at creating decision logic prompts for
multi-account order routing.

Based on the user's rules and examples, create a detailed
prompt that:
1. Analyzes the extracted order data
2. Applies the routing rules to determine the correct account
3. Handles edge cases and ambiguous situations
4. Returns the account number with confidence score

User's Context:
- Routing Rules: {transcripts}
- Account Numbers: {textAnswers}
- Example Scenarios: {examples}

Generate a production-ready prompt that makes accurate routing
decisions and flags uncertain cases for review.
```

**Task 3.4: Result Display & Review**
- Show all 3 generated prompts
- Tab interface for switching
- Copy to clipboard
- Download individually or all
- Regenerate with feedback

**Deliverables:**
- ✅ Context builder working
- ✅ 3 specialized system prompts
- ✅ Generation API functional
- ✅ Result display polished

---

### Phase 4: Save & Integration (Week 3)

**Task 4.1: Save to Customer**
- Store prompts in customer_prompts table
- Link to customer record
- Version control (if regenerating)
- Archive old versions

**Task 4.2: Customer Prompts View**
- View current prompts for customer
- Edit/regenerate wizard
- Test prompts
- Version history

**Task 4.3: n8n Export**
- Export all 3 prompts as n8n workflow
- Pre-configured nodes for each prompt
- Include credentials setup
- Sequential workflow structure

**Task 4.4: Apply to Customer Settings**
- Add "View AI Prompts" link in customer detail
- Show active prompts
- Quick test with sample PDF
- Integration with existing order processing

**Deliverables:**
- ✅ Prompts saved to customer
- ✅ Customer prompts management
- ✅ n8n export functional
- ✅ Integrated with customer settings

---

## Cursor Implementation Prompts

### Create Wizard Shell

```
Create the AI Prompt Wizard shell at /app/prompt-builder/wizard/[sessionId]/page.tsx:

1. Wizard layout:
   - Progress bar at top showing step X of Y
   - Three main sections: Order Header, Order Lines, Account Routing
   - Current question display area
   - Voice recording component
   - Text input area
   - Examples input section
   - Navigation buttons (Back, Save Draft, Next)

2. Progress indicator:
   - Show section name and question number
   - Visual progress bar (percentage complete)
   - Mark completed sections with checkmarks

3. Voice recording component:
   - Large "Record Answer" button with microphone icon
   - Recording timer
   - Waveform visualization during recording
   - Stop button
   - Playback controls after recording
   - Auto-transcribe using /api/prompt-builder/transcribe
   - Show transcript below

4. Text input:
   - "Add additional details" textarea
   - Character count
   - Optional field

5. Examples input:
   - "Add Example" button
   - Multiple text boxes for examples
   - Each example can be edited/removed
   - Label each example

6. Save answers:
   - Auto-save on Next
   - Save draft button (save and exit)
   - Store in prompt_builder_sessions.question_answers as JSONB

7. Navigation:
   - Back button (go to previous question)
   - Next button (validates and moves forward)
   - Skip button (if question is optional)
   - Exit wizard (confirm modal)

Follow existing UI patterns from order portal.
Include loading states and error handling.
```

### Implement Question Flow

```
Create the question flow logic:

1. Load questions from wizard_questions table
2. Filter by wizard_type (order_header, order_line, account_routing)
3. Sort by display_order
4. If is_multi_account = false, skip account_routing questions

5. For each question:
   - Display question_text as heading
   - Show help_text as description
   - Show tip_text in info box
   - Render recording component
   - Render text input
   - Render examples section

6. Validation:
   - Check is_required flag
   - Ensure either voice OR text is provided
   - Prevent Next if validation fails
   - Show error message

7. Answer storage format:
```json
{
  "question_answers": [
    {
      "question_id": "uuid",
      "question_number": 1,
      "wizard_type": "order_header",
      "question_text": "Where is the ship-to address?",
      "voice_url": "storage-url",
      "transcript": "The address is in the top right...",
      "text_answer": "Additional details...",
      "examples": [
        "SHIP TO:\nAcme Corp\n123 Main St",
        "Another example format"
      ],
      "answered_at": "2026-01-26T10:30:00Z"
    }
  ]
}
```

8. Update wizard_step in session on each Next
9. Calculate progress: (current_step / total_questions) * 100
```

### Create Generation Engine

```
Create the prompt generation API at /app/api/prompt-builder/generate-all/route.ts:

1. Accept sessionId in request
2. Fetch session with all question_answers
3. Group answers by wizard_type (header, line, routing)
4. For each type, build context:
   - Combine all voice transcripts
   - Include text answers
   - Add examples
   - Extract text from uploaded PDFs (first 2000 chars)

5. Call Claude API 3 times (one per prompt type):
   - Use appropriate system prompt template
   - Inject context variables
   - Max tokens: 4096 per prompt
   - Model: claude-3-5-sonnet-20241022

6. Parse responses and extract generated prompts

7. Save to customer_prompts table:
   - customer_id from session
   - header_prompt, line_prompt, routing_prompt
   - Link wizard_session_id
   - Set status to 'active'

8. Return all 3 prompts + metadata:
   - Tokens used per prompt
   - Total cost
   - Generation time
   - AI suggestions (if any)

9. Update session status to 'completed'

Include comprehensive error handling and logging.
```

---

## Example Generated Prompts

### Example Order Header Prompt (Output)

```markdown
# Order Header Extraction - Acme Corporation

Extract the following order header information from the PDF:

## Ship-To Address
**Location:** Top right corner of the PDF, below the order number
**Format:** Multi-line address format

Extract:
1. Company/Recipient name (first line)
2. Street address (may be multiple lines)
3. City, State ZIP (last line)

**Validation:**
- Address must include street, city, state, and ZIP
- State should be 2-letter abbreviation
- ZIP should be 5 or 9 digits
- Flag if any components are missing

**Example formats:**
```
SHIP TO:
Acme Corporation
123 Main Street, Suite 200
Los Angeles, CA 90001
```

## Shipping Carrier
**Location:** Bottom left of order, near shipping charges
**Field label:** Usually "Ship Via" or "Carrier"

Extract the carrier name. Normalize variations:
- "FedEx", "Federal Express", "FEDEX" → "FedEx"
- "UPS", "United Parcel Service" → "UPS"
- "USPS", "US Postal" → "USPS"

**Default:** If carrier is missing or unclear, use "Ground" and flag for review.

## Ship Via Method
**Location:** Combined with carrier or separate line
**Examples:** Ground, 2-Day Air, Overnight, Standard

Extract the service level. Common values:
- Ground, Standard → "Ground"
- 2-Day, 2nd Day Air → "2-Day"
- Overnight, Next Day, Express → "Overnight"

**Output Format:**
Return JSON:
```json
{
  "shipTo": {
    "company": "Acme Corporation",
    "address": "123 Main Street, Suite 200",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "carrier": "FedEx",
  "shipVia": "Ground",
  "flags": [] // Any issues or missing data
}
```

**Error Handling:**
- If ship-to address is incomplete, set flag: "incomplete_address"
- If carrier cannot be determined, set flag: "carrier_missing"
- Always return a valid JSON structure even with missing data
```

---

## Cost & Time Estimates

### Per Wizard Session
- Voice transcription (18 questions × 30 sec avg): $0.054
- PDF text extraction: Free (local)
- Prompt generation (3 prompts): ~$0.080
- **Total per session: ~$0.13**

### Development Time
- Phase 1 (Wizard UI): 12-16 hours
- Phase 2 (Question Flow): 10-14 hours
- Phase 3 (AI Generation): 12-16 hours
- Phase 4 (Save & Integration): 8-12 hours
- **Total: 42-58 hours**

### With AI Assistance
- Reduce by 35-40%
- **Actual: 27-35 hours (3-4 weeks part-time)**

---

## Success Metrics

- [ ] Users can complete wizard in < 15 minutes
- [ ] 90%+ of questions answered via voice
- [ ] Generated prompts achieve 85%+ accuracy on test PDFs
- [ ] 80% of users save prompts after generation
- [ ] Prompts work in n8n without modification

---

## Next Steps

1. **Review this plan** - Does this match your vision?
2. **Create database migration** - wizard_questions table + seed data
3. **Start Phase 1** - Build wizard shell and voice recording
4. **Question**: Should questions be editable by admins or fixed in migration?

---

Last Updated: January 26, 2026
Ready for Implementation
