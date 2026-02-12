# AI Prompt Builder - Implementation Plan

## Project Overview
**Goal:** Build an AI-powered prompt builder that helps users create effective prompts for order automation tasks using PDFs, voice input, and examples.

**Timeline:** 3-4 weeks

**Approach:** Leverage Claude 3.5 Sonnet for prompt engineering and OpenAI Whisper for voice transcription

**Status:** Foundation complete (storage + API clients configured)

---

## Feature Description

The AI Prompt Builder allows users to:
1. Upload PDF documents containing order data
2. Record voice descriptions of what they want to accomplish
3. Provide example inputs/outputs
4. Generate optimized prompts for n8n workflows or other automation tasks
5. Iterate and refine prompts with AI assistance
6. Save and version prompts for reuse

**Use Cases:**
- Create prompts for PDF extraction workflows
- Generate data validation prompts
- Build customer-specific processing rules
- Document complex business logic as prompts
- Train new CSRs with standardized prompts

---

## Architecture Overview

### Infrastructure (Already Complete ✅)

**Storage:**
- Supabase bucket: `prompt-builder-temp`
- File types: PDF, audio (webm, wav, mpeg)
- 10MB per file limit
- Auto-delete after 7 days
- User-isolated via RLS policies

**AI Services:**
- **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`)
  - Use: Prompt generation and refinement
  - Cost: $0.003/1K input tokens, $0.015/1K output tokens
  - Max tokens: 4096

- **OpenAI Whisper** (`whisper-1`)
  - Use: Audio transcription
  - Cost: $0.006/minute
  - Max file: 25MB

**API Clients:**
- `/lib/ai/anthropic.ts` - Claude API wrapper
- `/lib/ai/openai.ts` - Whisper API wrapper with validation

---

## Database Schema

### Table: `prompt_builder_sessions`
```sql
CREATE TABLE prompt_builder_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, generating, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Input data
  pdf_urls TEXT[], -- Array of Supabase storage URLs
  audio_urls TEXT[], -- Array of audio file URLs
  voice_transcript TEXT, -- Transcribed audio
  example_input TEXT, -- User-provided example input
  example_output TEXT, -- User-provided example output
  requirements TEXT, -- Text description of requirements

  -- AI-generated outputs
  generated_prompt TEXT, -- The final prompt
  prompt_versions JSONB DEFAULT '[]', -- Array of {version, prompt, timestamp, feedback}
  ai_suggestions TEXT[], -- AI suggestions for improvement

  -- Metadata
  total_tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  claude_model VARCHAR(100),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_prompt_sessions_user ON prompt_builder_sessions(user_id);
CREATE INDEX idx_prompt_sessions_status ON prompt_builder_sessions(status);
CREATE INDEX idx_prompt_sessions_created ON prompt_builder_sessions(created_at DESC);
```

### Table: `saved_prompts`
```sql
CREATE TABLE saved_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES prompt_builder_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  category VARCHAR(100), -- e.g., 'pdf_extraction', 'validation', 'enrichment'
  tags TEXT[], -- Searchable tags
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false, -- Share with team
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_prompts_user ON saved_prompts(user_id);
CREATE INDEX idx_saved_prompts_category ON saved_prompts(category);
CREATE INDEX idx_saved_prompts_tags ON saved_prompts USING GIN(tags);
```

### RLS Policies
```sql
-- prompt_builder_sessions
ALTER TABLE prompt_builder_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON prompt_builder_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON prompt_builder_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON prompt_builder_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- saved_prompts
ALTER TABLE saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or public prompts"
  ON saved_prompts FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own prompts"
  ON saved_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON saved_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON saved_prompts FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Phase 1: UI Foundation (Week 1)

### Task 1.1: Create Main Builder Page
**Duration:** 6-8 hours
**Status:** ⬜ Not Started

**Create:** `/app/prompt-builder/page.tsx`

**UI Structure:**
```
┌─────────────────────────────────────────────────┐
│ Header: "AI Prompt Builder"                     │
│ Subtitle: "Create optimized prompts with AI"    │
├─────────────────────────────────────────────────┤
│                                                  │
│  [New Session] [Load Saved] [My Sessions]       │
│                                                  │
│  Recent Sessions:                                │
│  ┌────────────────────────────────────┐         │
│  │ PDF Order Extraction - 2 hrs ago   │ [Open]  │
│  │ Validation Rules - Yesterday       │ [Open]  │
│  │ Price Matching Logic - 2 days ago  │ [Open]  │
│  └────────────────────────────────────┘         │
│                                                  │
│  Saved Prompts Library:                         │
│  ┌────────────────────────────────────┐         │
│  │ 🏷️ PDF Extraction (5)              │ [View]  │
│  │ 🏷️ Validation (3)                  │ [View]  │
│  │ 🏷️ Data Enrichment (2)             │ [View]  │
│  └────────────────────────────────────┘         │
└─────────────────────────────────────────────────┘
```

**Features:**
- Create new session button
- List recent sessions (last 10)
- Saved prompts organized by category
- Search/filter sessions
- Quick actions (duplicate, delete)

**Cursor Prompt:**
```
Create the AI Prompt Builder landing page at /app/prompt-builder/page.tsx:

1. Header section:
   - Title: "AI Prompt Builder"
   - Subtitle explaining the feature
   - "New Session" button (primary, blue)

2. Recent Sessions section:
   - Fetch from prompt_builder_sessions table
   - Show last 10 sessions
   - Display: title, status badge, time ago, Open button
   - Status badges: Draft (gray), Generating (blue), Completed (green)

3. Saved Prompts Library:
   - Group by category
   - Show count per category
   - Click to view category

4. Empty states:
   - No sessions: "Create your first prompt session"
   - No saved prompts: "Saved prompts will appear here"

5. Data fetching:
   - Use Supabase client
   - Real-time subscriptions for updates
   - Loading states with skeletons

Follow the existing style guide and component patterns from the order portal.
```

**Deliverables:**
- ✅ Landing page with navigation
- ✅ Recent sessions list
- ✅ Saved prompts library
- ✅ Create session flow initiated

---

### Task 1.2: Session Builder Interface
**Duration:** 8-10 hours
**Status:** ⬜ Not Started

**Create:** `/app/prompt-builder/session/[id]/page.tsx`

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Sessions    Session: [Editable Title]             │
│                                        [Save] [Generate]     │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                       │
│ 1. Upload Context    │  Generated Prompt Preview            │
│ ┌─────────────────┐  │  ┌──────────────────────────────┐   │
│ │ 📄 PDF Files    │  │  │                              │   │
│ │ [Upload PDF]    │  │  │  Your prompt will appear     │   │
│ │                 │  │  │  here after generation...    │   │
│ │ ✓ order.pdf     │  │  │                              │   │
│ └─────────────────┘  │  └──────────────────────────────┘   │
│                      │                                       │
│ 2. Voice Input       │  AI Suggestions:                     │
│ ┌─────────────────┐  │  ┌──────────────────────────────┐   │
│ │ 🎤 [Record]     │  │  │ • Consider adding examples   │   │
│ │ ⏸️ [Stop]       │  │  │ • Define edge cases          │   │
│ │                 │  │  │ • Specify output format      │   │
│ │ Transcript:     │  │  └──────────────────────────────┘   │
│ │ [transcribed]   │  │                                       │
│ └─────────────────┘  │  Previous Versions: (3)              │
│                      │  [v3] [v2] [v1]                      │
│ 3. Requirements      │                                       │
│ ┌─────────────────┐  │  Cost Estimate:                      │
│ │ What should it  │  │  Input: 2.5K tokens ($0.008)         │
│ │ do?             │  │  Output: ~1K tokens (~$0.015)        │
│ │                 │  │  Total: ~$0.023                      │
│ └─────────────────┘  │                                       │
│                      │                                       │
│ 4. Examples (opt)    │                                       │
│ ┌─────────────────┐  │                                       │
│ │ Input example   │  │                                       │
│ │ Output example  │  │                                       │
│ └─────────────────┘  │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

**Features:**
1. **PDF Upload Section:**
   - Drag-and-drop zone
   - Multiple file support
   - Preview uploaded files
   - Extract text preview
   - Remove files option

2. **Voice Recording:**
   - Record button with timer
   - Audio waveform visualization
   - Playback controls
   - Auto-transcribe on stop
   - Show transcription in real-time

3. **Requirements Text:**
   - Large textarea
   - Markdown support
   - Character count
   - AI suggestions as you type

4. **Examples Section:**
   - Input/output pairs
   - Add multiple examples
   - Format validation

5. **Right Panel:**
   - Generated prompt display (syntax highlighted)
   - Copy to clipboard button
   - Download as .txt
   - Version history
   - AI suggestions
   - Cost estimate

**Cursor Prompt:**
```
Create the Session Builder interface at /app/prompt-builder/session/[id]/page.tsx:

1. Two-column layout (40/60 split):
   - Left: Input collection
   - Right: Output display

2. PDF Upload component:
   - Use react-dropzone for drag-and-drop
   - Upload to Supabase storage: prompt-builder-temp/{userId}/{sessionId}/
   - Show upload progress
   - Display file list with remove option
   - Extract text preview using pdf.js (first 500 chars)

3. Voice Recording component:
   - Use MediaRecorder API
   - Show recording timer
   - Visualize audio with simple waveform (use Web Audio API)
   - Auto-save recording to Supabase storage
   - Call OpenAI Whisper API for transcription
   - Display transcript below
   - Handle errors (mic permissions, browser support)

4. Requirements textarea:
   - Rich text editor or markdown support
   - Character count (0/5000)
   - Save draft on change (debounced)

5. Examples section:
   - Add/remove example pairs
   - Input and output textareas
   - Validate both are filled

6. Generated Prompt Panel:
   - Display in code block with syntax highlighting
   - Copy button
   - Download button
   - Version selector dropdown
   - Show creation timestamp per version

7. AI Suggestions panel:
   - List format
   - Checkmark completed suggestions
   - Refresh suggestions button

8. Cost Estimate:
   - Real-time token counting (approximate)
   - Show input/output breakdown
   - Total cost estimate
   - Use estimateClaudeCost from @/lib/ai/anthropic

9. Action buttons:
   - Save Session (auto-save on change)
   - Generate Prompt (primary action, blue)
   - Loading states for all async operations

Follow existing patterns from order portal for file uploads and forms.
Include proper error handling and loading states.
```

**Deliverables:**
- ✅ Two-column builder interface
- ✅ PDF upload with preview
- ✅ Voice recording with transcription
- ✅ Requirements input
- ✅ Examples management
- ✅ Prompt display panel
- ✅ Cost estimation

---

## Phase 2: AI Integration (Week 2)

### Task 2.1: File Upload & Storage API
**Duration:** 4-5 hours
**Status:** ⬜ Not Started

**Create:** `/app/api/prompt-builder/upload/route.ts`

**Functionality:**
- Accept file uploads (PDF or audio)
- Validate file type and size
- Upload to Supabase storage
- Return public URL
- Handle errors

**API Specification:**
```typescript
POST /api/prompt-builder/upload

Request (multipart/form-data):
{
  file: File,
  sessionId: string,
  fileType: 'pdf' | 'audio'
}

Response (200):
{
  success: true,
  url: string, // Supabase storage URL
  fileName: string,
  fileSize: number,
  uploadedAt: string
}

Response (400/500):
{
  success: false,
  error: string
}
```

**Cursor Prompt:**
```
Create the file upload API route at /app/api/prompt-builder/upload/route.ts:

1. Accept POST requests with multipart/form-data
2. Validate request:
   - User is authenticated (check session)
   - File is present
   - File type is allowed (pdf, audio/webm, audio/wav, audio/mpeg)
   - File size <= 10MB

3. Upload to Supabase storage:
   - Bucket: prompt-builder-temp
   - Path: {userId}/{sessionId}/{timestamp}_{filename}
   - Use Supabase storage client from @/lib/supabase/server

4. For PDFs:
   - Extract text using pdf-parse package
   - Store text preview (first 1000 chars)

5. Return response with:
   - Storage URL
   - File metadata
   - Text preview (for PDFs)

6. Error handling:
   - Validation errors (400)
   - Upload errors (500)
   - Authentication errors (401)
   - Detailed error messages for debugging

Include proper TypeScript types and JSDoc comments.
```

**Deliverables:**
- ✅ Upload API endpoint
- ✅ File validation
- ✅ Supabase storage integration
- ✅ PDF text extraction
- ✅ Error handling

---

### Task 2.2: Audio Transcription API
**Duration:** 3-4 hours
**Status:** ⬜ Not Started

**Create:** `/app/api/prompt-builder/transcribe/route.ts`

**Functionality:**
- Accept audio file URL
- Download from Supabase storage
- Send to OpenAI Whisper
- Return transcript
- Calculate cost

**API Specification:**
```typescript
POST /api/prompt-builder/transcribe

Request:
{
  audioUrl: string, // Supabase storage URL
  language?: string // Optional language hint (e.g., 'en')
}

Response (200):
{
  success: true,
  transcript: string,
  language: string,
  duration: number, // seconds
  cost: number // USD
}

Response (400/500):
{
  success: false,
  error: string
}
```

**Cursor Prompt:**
```
Create the transcription API route at /app/api/prompt-builder/transcribe/route.ts:

1. Accept POST with audioUrl and optional language
2. Validate:
   - User authenticated
   - URL is from our Supabase storage
   - File exists

3. Fetch audio from Supabase storage:
   - Use Supabase client with service role key
   - Download file as Blob

4. Transcribe using OpenAI Whisper:
   - Import transcribeAudio from @/lib/ai/openai
   - Pass audio blob and language
   - Handle transcription errors

5. Calculate cost:
   - Use estimateWhisperCost from @/lib/ai/openai
   - Return cost to user

6. Update session record:
   - Save transcript to prompt_builder_sessions.voice_transcript
   - Increment total cost

7. Return transcript and metadata

Include rate limiting (max 10 requests per minute per user).
Add comprehensive error handling.
```

**Deliverables:**
- ✅ Transcription API endpoint
- ✅ Whisper integration
- ✅ Cost calculation
- ✅ Session update
- ✅ Rate limiting

---

### Task 2.3: Prompt Generation API
**Duration:** 8-10 hours
**Status:** ⬜ Not Started

**Create:** `/app/api/prompt-builder/generate/route.ts`

**Functionality:**
- Collect all session inputs
- Build context for Claude
- Generate optimized prompt
- Save version history
- Return suggestions

**API Specification:**
```typescript
POST /api/prompt-builder/generate

Request:
{
  sessionId: string,
  regenerate?: boolean, // If true, creates new version
  feedback?: string // User feedback on previous version
}

Response (200):
{
  success: true,
  prompt: string,
  version: number,
  suggestions: string[],
  tokens: {
    input: number,
    output: number
  },
  cost: number
}

Response (400/500):
{
  success: false,
  error: string
}
```

**System Prompt for Claude:**
```typescript
const PROMPT_BUILDER_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in business automation and order processing workflows.

Your task is to generate high-quality, production-ready prompts based on user requirements.

INPUT CONTEXT:
- PDF documents: {pdfContext}
- Voice transcript: {voiceTranscript}
- Written requirements: {requirements}
- Example input/output pairs: {examples}
- User feedback on previous versions: {feedback}

OUTPUT REQUIREMENTS:
1. Generate a clear, detailed prompt that accomplishes the user's goal
2. Include:
   - Clear objective statement
   - Step-by-step instructions
   - Expected input/output formats
   - Edge case handling
   - Validation criteria
3. Make prompts:
   - Specific and unambiguous
   - Structured with headers/sections
   - Include examples where helpful
   - Production-ready (no placeholders)
4. Optimize for:
   - Accuracy over speed
   - Error handling
   - Maintainability

Additionally, provide 3-5 suggestions for improving the prompt based on best practices.

Format your response as JSON:
{
  "prompt": "The generated prompt text",
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}`;
```

**Cursor Prompt:**
```
Create the prompt generation API at /app/api/prompt-builder/generate/route.ts:

1. Fetch session data:
   - Get prompt_builder_sessions record by sessionId
   - Verify user owns session
   - Get all PDFs, transcripts, requirements, examples

2. For each PDF, extract first 2000 chars of text as context

3. Build Claude API request:
   - Use system prompt template above
   - Inject all context variables
   - Add user feedback if regenerating
   - Use Claude 3.5 Sonnet model
   - Max tokens: 4096

4. Call Claude API:
   - Import anthropic client from @/lib/ai/anthropic
   - Handle streaming or single response
   - Parse JSON response
   - Extract prompt and suggestions

5. Create new version:
   - Get current prompt_versions array
   - Append new version: {version, prompt, timestamp, feedback, tokens, cost}
   - Increment version number

6. Update session:
   - Set generated_prompt to latest
   - Update prompt_versions array
   - Update ai_suggestions
   - Add tokens to total_tokens_used
   - Add cost to estimated_cost
   - Set status to 'completed'

7. Return response with:
   - Generated prompt
   - Version number
   - Suggestions
   - Token counts
   - Cost

8. Error handling:
   - API failures
   - Parsing errors
   - Rate limits
   - Invalid session

Include comprehensive logging for debugging.
Add request timeout (60 seconds).
```

**Deliverables:**
- ✅ Generation API endpoint
- ✅ Claude integration
- ✅ System prompt template
- ✅ Version management
- ✅ Cost tracking
- ✅ Suggestions generation

---

### Task 2.4: Real-time Generation Status
**Duration:** 3-4 hours
**Status:** ⬜ Not Started

**Feature:** Show real-time progress during prompt generation

**Implementation:**
1. Use Server-Sent Events (SSE) for streaming
2. Update UI with generation status
3. Show partial results as they arrive
4. Handle cancellation

**Create:** `/app/api/prompt-builder/generate-stream/route.ts`

**Cursor Prompt:**
```
Create a streaming endpoint for real-time prompt generation:

1. Use Next.js streaming response
2. Stream Claude API response in chunks
3. Send SSE events:
   - status: 'starting' | 'generating' | 'complete' | 'error'
   - chunk: partial text
   - suggestions: when available
   - tokens: running count

4. Update UI in real-time:
   - Show "Generating..." status
   - Display prompt as it's generated
   - Progress indicator
   - Allow cancellation

5. On client side:
   - Use EventSource API
   - Update state with chunks
   - Assemble final prompt
   - Handle connection errors

Example streaming format:
data: {"status":"starting","message":"Analyzing context..."}

data: {"status":"generating","chunk":"# Order Processing Prompt\n\n"}

data: {"status":"generating","chunk":"Extract the following..."}

data: {"status":"complete","prompt":"...","suggestions":[...]}
```

**Deliverables:**
- ✅ Streaming API endpoint
- ✅ SSE implementation
- ✅ Real-time UI updates
- ✅ Cancellation support

---

## Phase 3: Prompt Management (Week 3)

### Task 3.1: Save & Library Features
**Duration:** 6-8 hours
**Status:** ⬜ Not Started

**Features:**
1. Save generated prompts to library
2. Organize by category and tags
3. Search saved prompts
4. Edit and version saved prompts
5. Share prompts with team

**Create:** `/app/prompt-builder/library/page.tsx`

**UI Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Prompt Library                          [+ New Prompt]  │
├─────────────────────────────────────────────────────────┤
│ 🔍 [Search prompts...]        [Category ▼] [Tags ▼]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PDF Extraction (5 prompts)                              │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Extract Order Details from PDF                     │ │
│ │ Tags: pdf, orders, extraction                      │ │
│ │ Used: 12 times  •  Last used: 2 days ago          │ │
│ │ [View] [Edit] [Copy] [Delete]                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Extract Customer Information                       │ │
│ │ Tags: pdf, customer, data-extraction               │ │
│ │ Used: 8 times  •  Last used: 1 week ago           │ │
│ │ [View] [Edit] [Copy] [Delete]                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Validation (3 prompts)                                  │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Validate Price Against Price List                  │ │
│ │ Tags: validation, pricing                          │ │
│ │ 🌐 Shared with team                                │ │
│ │ [View] [Edit] [Unshare] [Delete]                  │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Cursor Prompt:**
```
Create the Prompt Library page at /app/prompt-builder/library/page.tsx:

1. Header with search and filters:
   - Search bar (fuzzy search on name, tags)
   - Category dropdown (from saved_prompts.category)
   - Tags multi-select
   - Sort by: Date, Usage, Name

2. Prompt cards grouped by category:
   - Show name, tags, usage stats
   - "Shared" badge if is_public = true
   - Actions: View, Edit, Copy, Delete
   - Click card to view full prompt

3. Save Prompt modal (from session):
   - Prompt name (required)
   - Category (dropdown or new)
   - Tags (comma-separated or tag input)
   - Make public checkbox (share with team)
   - Preview of prompt
   - Save button

4. View Prompt modal:
   - Full prompt text (syntax highlighted)
   - Metadata (created, last used, use count)
   - Copy to clipboard
   - Use in new session
   - Edit button

5. Edit Prompt:
   - Inline editing of prompt text
   - Update metadata
   - Version history
   - Save creates new version

6. Delete confirmation:
   - Warning modal
   - Cannot delete if used in active sessions

7. Data operations:
   - Fetch from saved_prompts table
   - Filter by user (and public prompts)
   - Increment use_count on copy/use
   - Update last_used_at

Follow existing modal patterns from order portal.
Include empty state for no prompts.
```

**Deliverables:**
- ✅ Library page with search/filter
- ✅ Save prompt workflow
- ✅ View/edit/delete prompts
- ✅ Category organization
- ✅ Team sharing feature
- ✅ Usage tracking

---

### Task 3.2: Prompt Testing & Validation
**Duration:** 4-5 hours
**Status:** ⬜ Not Started

**Feature:** Test prompts with sample data before using in production

**Create:** `/app/prompt-builder/test/[promptId]/page.tsx`

**UI Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Test Prompt: "Extract Order Details from PDF"           │
├────────────────────┬────────────────────────────────────┤
│                    │                                     │
│ Input Data         │ Output Result                       │
│ ┌────────────────┐ │ ┌─────────────────────────────┐   │
│ │ [Upload Test   │ │ │                             │   │
│ │  PDF]          │ │ │ Waiting for test run...     │   │
│ │                │ │ │                             │   │
│ │ OR             │ │ │                             │   │
│ │                │ │ │                             │   │
│ │ [Paste Text]   │ │ │                             │   │
│ │ ______________ │ │ └─────────────────────────────┘   │
│ │               │ │                                     │
│ │               │ │ Expected Output (optional)          │
│ └────────────────┘ │ ┌─────────────────────────────┐   │
│                    │ │ What you expect to see...   │   │
│ [Run Test] [Clear] │ │                             │   │
│                    │ └─────────────────────────────┘   │
│                    │                                     │
│ Test History:      │ Comparison:                         │
│ • Test #3 - 5m ago │ ✅ Matched expected (95%)           │
│ • Test #2 - 1h ago │                                     │
│ • Test #1 - 2h ago │ Cost: $0.012                        │
└────────────────────┴────────────────────────────────────┘
```

**Cursor Prompt:**
```
Create the Prompt Testing page:

1. Two-panel layout:
   - Left: Input configuration
   - Right: Results display

2. Input section:
   - Upload test file (PDF)
   - OR paste text input
   - Optional: Expected output for validation

3. Run Test button:
   - Sends input + prompt to Claude API
   - Shows loading state
   - Displays result in right panel

4. Results panel:
   - Formatted output
   - Syntax highlighting if JSON/structured
   - Copy result button
   - Download result

5. Comparison (if expected output provided):
   - Diff view showing differences
   - Similarity score (using string similarity)
   - Highlight matched/unmatched sections

6. Test history:
   - Save last 10 test runs
   - Show timestamp, input summary, result preview
   - Click to load previous test

7. Cost tracking:
   - Show tokens used per test
   - Cumulative cost for all tests

8. Export test results:
   - Download as JSON
   - Include input, output, prompt used, timestamp

Create API endpoint: /api/prompt-builder/test
- Accepts: promptText, input, expectedOutput
- Calls Claude API with prompt
- Returns: output, tokens, cost, similarity score
```

**Deliverables:**
- ✅ Test interface
- ✅ Claude API test execution
- ✅ Result comparison
- ✅ Test history
- ✅ Cost tracking per test

---

### Task 3.3: Prompt Templates
**Duration:** 3-4 hours
**Status:** ⬜ Not Started

**Feature:** Pre-built prompt templates for common use cases

**Templates to Create:**
1. **PDF Order Extraction**
   - Extract order number, customer, line items, totals
   - Handle multiple page formats
   - Validate extracted data

2. **Data Validation**
   - Compare against reference data
   - Flag discrepancies
   - Suggest corrections

3. **Price Matching**
   - Match items to price lists
   - Calculate variances
   - Identify invalid items

4. **Customer Enrichment**
   - Add customer metadata
   - Validate addresses
   - Assign shipping info

5. **Order Transformation**
   - Convert PDF to structured data
   - Map fields to target schema
   - Handle edge cases

**Create:** `/app/prompt-builder/templates/page.tsx`

**Cursor Prompt:**
```
Create a Templates gallery page:

1. Template cards:
   - Template name and description
   - Category badge
   - Preview of prompt
   - "Use Template" button
   - Edit template (admin only)

2. Use Template flow:
   - Click opens new session
   - Pre-fills prompt template
   - User can customize
   - Variables marked with {{placeholder}}
   - Helper text for each variable

3. Template structure:
   - Store in saved_prompts table
   - Mark as template (add is_template column)
   - Include example inputs/outputs
   - Variable definitions

4. Variable replacement:
   - Detect {{variableName}} syntax
   - Show form for variable values
   - Replace before generating

5. Create templates as seed data:
   - SQL migration to insert templates
   - Make them public (is_public = true)
   - Assign to system user

Add migration: 040_create_prompt_templates.sql
Insert 5-8 useful templates for order processing.
```

**Deliverables:**
- ✅ Templates gallery page
- ✅ 5-8 pre-built templates
- ✅ Use template workflow
- ✅ Variable replacement
- ✅ Database migration

---

## Phase 4: Polish & Integration (Week 4)

### Task 4.1: Usage Analytics Dashboard
**Duration:** 4-5 hours
**Status:** ⬜ Not Started

**Feature:** Track prompt builder usage and costs

**Create:** `/app/prompt-builder/analytics/page.tsx`

**Metrics to Track:**
- Total sessions created
- Prompts generated (by user, by month)
- Total tokens used
- Total cost (by user, by month)
- Most used prompts
- Average session duration
- Success rate (completed vs abandoned)
- Template usage

**UI Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Analytics Dashboard                [This Month ▼]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐    │
│ │ Sessions │ │ Prompts  │ │  Tokens  │ │  Cost   │    │
│ │    24    │ │    18    │ │   145K   │ │ $2.34   │    │
│ │  +12%    │ │   +8%    │ │  +15%    │ │ +10%    │    │
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘    │
│                                                          │
│ Usage Over Time                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │         [Line chart: sessions per day]             │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Top Prompts                     Cost by User            │
│ ┌──────────────────────────┐   ┌──────────────────┐   │
│ │ 1. PDF Extraction (12)   │   │ User A: $1.20    │   │
│ │ 2. Validation (8)        │   │ User B: $0.87    │   │
│ │ 3. Enrichment (5)        │   │ User C: $0.27    │   │
│ └──────────────────────────┘   └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Cursor Prompt:**
```
Create analytics dashboard:

1. Summary cards:
   - Query prompt_builder_sessions for counts
   - Calculate totals from tokens and costs
   - Show percentage change vs previous period

2. Charts (use recharts or similar):
   - Line chart: Sessions created per day
   - Bar chart: Prompts by category
   - Pie chart: Token distribution by user

3. Top prompts table:
   - Join saved_prompts with usage count
   - Sort by use_count DESC
   - Show name, category, uses, last used

4. Cost breakdown:
   - Group by user
   - Show input vs output token costs
   - Total per user

5. Export reports:
   - Download as CSV
   - Date range filter
   - User filter (admin only)

6. Real-time updates:
   - Refresh data every 30 seconds
   - Show last updated timestamp

Follow existing dashboard patterns from order portal tracking page.
```

**Deliverables:**
- ✅ Analytics dashboard
- ✅ Usage metrics
- ✅ Cost tracking
- ✅ Charts and visualizations
- ✅ CSV export

---

### Task 4.2: n8n Workflow Integration
**Duration:** 5-6 hours
**Status:** ⬜ Not Started

**Feature:** Export prompts for use in n8n workflows

**Functionality:**
1. Export prompt as n8n-compatible format
2. Include example workflow snippet
3. Copy to clipboard for n8n
4. Documentation on how to use in n8n

**Create:** Export modal component

**Export Formats:**

**Format 1: n8n Code Node (JavaScript)**
```javascript
// Generated from AI Prompt Builder
// Prompt: "Extract Order Details from PDF"

const prompt = `
[Generated prompt text here]
`;

const input = $input.all()[0].json;

// Call your AI service
const result = await $helpers.httpRequest({
  method: 'POST',
  url: 'https://api.anthropic.com/v1/messages',
  headers: {
    'x-api-key': $env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt + '\n\nData: ' + JSON.stringify(input)
    }]
  }
});

return [{ json: { result: result.content[0].text } }];
```

**Format 2: n8n HTTP Request Node Configuration**
```json
{
  "name": "Extract Order Details",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameter": [
        {
          "name": "anthropic-version",
          "value": "2023-06-01"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameter": [
        {
          "name": "model",
          "value": "claude-3-5-sonnet-20241022"
        },
        {
          "name": "max_tokens",
          "value": 4096
        },
        {
          "name": "messages",
          "value": "={{[{role: 'user', content: `[PROMPT]\n\nData: ${JSON.stringify($json)}`}]}}"
        }
      ]
    }
  }
}
```

**Cursor Prompt:**
```
Add n8n export functionality:

1. Add "Export for n8n" button in prompt view
2. Create export modal with format options:
   - Code Node (JavaScript)
   - HTTP Request Node (JSON config)
   - OpenAI format (for OpenAI nodes)

3. Generate exports:
   - Replace [PROMPT] with actual prompt text
   - Include model and token settings
   - Add comments explaining usage
   - Escape special characters

4. Copy to clipboard functionality
5. Download as .json file
6. Include usage instructions:
   - How to import in n8n
   - Required credentials
   - Expected input format
   - Example test data

7. Create guide: /docs/N8N_INTEGRATION.md
   - Step-by-step setup
   - Screenshots
   - Common issues
   - Example workflows
```

**Deliverables:**
- ✅ n8n export modal
- ✅ Multiple export formats
- ✅ Copy/download functionality
- ✅ Integration guide
- ✅ Example workflows

---

### Task 4.3: Collaboration Features
**Duration:** 4-5 hours
**Status:** ⬜ Not Started

**Features:**
1. Share sessions with team members
2. Comment on prompts
3. Version control with comments
4. Approve/reject prompts (workflow)

**Database Schema Addition:**
```sql
-- Add to existing tables
ALTER TABLE prompt_builder_sessions ADD COLUMN shared_with UUID[];
ALTER TABLE prompt_builder_sessions ADD COLUMN approval_status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE prompt_builder_sessions ADD COLUMN approved_by UUID;

CREATE TABLE prompt_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES prompt_builder_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_prompt_comments_session ON prompt_comments(session_id);
```

**UI Additions:**
- Share button in session view
- Comments panel
- Approval workflow buttons
- Notification system

**Cursor Prompt:**
```
Add collaboration features:

1. Share Session:
   - Modal to select team members
   - Add user IDs to shared_with array
   - Send email notification
   - Shared users can view (not edit)

2. Comments panel:
   - Side panel in session view
   - Add comment textarea
   - Display comment thread
   - Show user name and timestamp
   - Real-time updates (Supabase subscriptions)

3. Approval workflow:
   - "Request Approval" button
   - Changes status to 'pending_approval'
   - Notifies approvers
   - Approve/Reject buttons (for managers)
   - Rejection requires comment
   - Approved prompts locked from editing

4. Notifications:
   - In-app notifications
   - Email notifications
   - Show unread count in header

5. Activity log:
   - Track all actions (share, comment, approve)
   - Display in session view
   - Filter by action type

Create migration: 041_add_collaboration_features.sql
```

**Deliverables:**
- ✅ Share session feature
- ✅ Comment system
- ✅ Approval workflow
- ✅ Notifications
- ✅ Activity log

---

### Task 4.4: Mobile Responsive & Accessibility
**Duration:** 3-4 hours
**Status:** ⬜ Not Started

**Ensure:**
- Mobile-friendly layouts
- Touch-optimized controls
- Screen reader support
- Keyboard navigation
- WCAG 2.1 AA compliance

**Cursor Prompt:**
```
Make prompt builder fully responsive and accessible:

1. Mobile layouts:
   - Stack columns vertically on mobile
   - Collapsible sections
   - Bottom sheet modals instead of centered
   - Touch-friendly buttons (min 44x44px)
   - Swipe gestures for navigation

2. Tablet optimization:
   - Two-column where space allows
   - Landscape-optimized layouts

3. Accessibility:
   - Semantic HTML
   - ARIA labels for all interactive elements
   - Keyboard shortcuts (documented)
   - Focus management in modals
   - Skip links
   - High contrast mode support

4. Audio recording on mobile:
   - Request microphone permission properly
   - Show permission denied help
   - Optimize for mobile browsers

5. File upload on mobile:
   - Support camera capture for PDFs (using device camera)
   - Native file picker integration

Test on:
- Chrome mobile emulator
- Real iOS device (Safari)
- Real Android device (Chrome)
- NVDA screen reader
- Keyboard-only navigation
```

**Deliverables:**
- ✅ Fully responsive design
- ✅ Mobile optimizations
- ✅ WCAG AA compliant
- ✅ Screen reader compatible
- ✅ Keyboard navigation

---

## Phase 5: Testing & Documentation (Ongoing)

### Task 5.1: End-to-End Testing
**Duration:** 6-8 hours
**Status:** ⬜ Not Started

**Test Scenarios:**
1. Create new session
2. Upload PDF and verify text extraction
3. Record audio and verify transcription
4. Generate prompt from all inputs
5. Save prompt to library
6. Use saved prompt in new session
7. Test prompt with sample data
8. Export for n8n
9. Share session with team
10. Comment and approval workflow

**Testing Tools:**
- Playwright for E2E tests
- Jest for unit tests
- React Testing Library for components

**Cursor Prompt:**
```
Create E2E test suite using Playwright:

1. Setup Playwright:
   - Install @playwright/test
   - Configure for Next.js
   - Create test database

2. Test files:
   - tests/e2e/prompt-builder.spec.ts
   - tests/e2e/library.spec.ts
   - tests/e2e/collaboration.spec.ts

3. Test scenarios:
   - Happy path: Create → Generate → Save → Use
   - Error handling: Invalid files, API failures
   - Edge cases: Empty inputs, max file size
   - Mobile tests: Touch interactions

4. Mock external APIs:
   - Mock Anthropic API responses
   - Mock Whisper API responses
   - Use test fixtures for consistent results

5. Visual regression tests:
   - Screenshot comparison
   - Layout consistency

Run tests in CI/CD pipeline.
```

**Deliverables:**
- ✅ E2E test suite
- ✅ Unit tests for utilities
- ✅ Component tests
- ✅ API route tests
- ✅ CI/CD integration

---

### Task 5.2: Documentation
**Duration:** 4-6 hours
**Status:** ⬜ Not Started

**Documents to Create:**

1. **User Guide** (`/docs/PROMPT_BUILDER_USER_GUIDE.md`):
   - Getting started
   - Creating your first prompt
   - Using voice input
   - Uploading PDFs
   - Understanding suggestions
   - Saving and organizing prompts
   - Testing prompts
   - Sharing with team
   - Troubleshooting

2. **Developer Guide** (`/docs/PROMPT_BUILDER_DEV_GUIDE.md`):
   - Architecture overview
   - API documentation
   - Database schema
   - Adding new features
   - Testing strategy
   - Deployment process

3. **Integration Guide** (`/docs/PROMPT_BUILDER_INTEGRATION.md`):
   - Using prompts in n8n
   - Using prompts in other tools
   - API access
   - Webhooks
   - Example integrations

4. **Video Tutorials:**
   - Overview (3 min)
   - Creating a prompt (5 min)
   - Using templates (3 min)
   - Testing prompts (4 min)
   - n8n integration (6 min)

**Deliverables:**
- ✅ Complete user documentation
- ✅ Developer documentation
- ✅ Integration guides
- ✅ Video tutorials
- ✅ FAQ document

---

## Cost Estimates

### Development Costs

**Infrastructure:**
- Supabase storage: Included in existing plan
- No additional database costs

**AI API Costs (Monthly Estimate):**
- Claude API: ~$5-15/month (assuming 50 prompts generated)
- OpenAI Whisper: ~$2-5/month (assuming 100 minutes of audio)
- **Total AI Costs: $7-20/month**

**Development Time:**
- Week 1: 16-18 hours (UI Foundation)
- Week 2: 16-20 hours (AI Integration)
- Week 3: 13-17 hours (Prompt Management)
- Week 4: 16-20 hours (Polish & Integration)
- **Total: 61-75 hours**

**With AI Assistance (Cursor/Claude):**
- Reduce time by ~30-40%
- **Actual time: 40-50 hours**

### Per-Use Costs

**Typical Session Costs:**
- PDF text extraction: Free (local processing)
- Audio transcription (5 min): $0.03
- Prompt generation (3K input, 1K output): $0.024
- **Total per session: ~$0.05**

**Monthly Operating Costs (100 sessions):**
- AI API calls: ~$5
- Storage (auto-deleted after 7 days): Negligible
- **Total: ~$5-10/month**

---

## Success Metrics

### Technical Metrics
- [ ] API response time < 3 seconds (95th percentile)
- [ ] 99% uptime
- [ ] Zero data loss
- [ ] All files auto-deleted after 7 days

### User Metrics
- [ ] User satisfaction > 8/10
- [ ] 80% of sessions result in saved prompt
- [ ] Average session time < 10 minutes
- [ ] Prompt reuse rate > 50%

### Business Metrics
- [ ] 90% of users adopt feature within 1 month
- [ ] Reduce prompt creation time by 70%
- [ ] 5+ shared templates in library
- [ ] 50+ prompts saved in first month

---

## Risk Management

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude API rate limits | Medium | High | Implement queuing, show wait times |
| PDF text extraction fails | Medium | Medium | Fallback to manual input, support multiple formats |
| Audio quality issues | High | Low | Provide tips, show waveform, allow re-recording |
| Large file uploads timeout | Low | Medium | Implement chunked uploads, progress indicators |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| High API costs | Medium | Medium | Cost caps, usage alerts, batch processing |
| Low adoption | Low | High | Templates, training, integration with existing workflows |
| Quality of generated prompts | Medium | Medium | Refinement iterations, feedback loop, templates |

---

## Next Steps

### Immediate (This Week)
1. Review and approve this plan
2. Create database migration (041_create_prompt_builder_tables.sql)
3. Start Task 1.1: Create main builder page

### Questions to Resolve
1. Do you want version control for ALL prompts or just major revisions?
2. Should templates be editable by users or admin-only?
3. Do you want webhook support for integration with external tools?
4. Should there be usage quotas per user to control costs?

---

## Appendix

### Database Migration Files Needed
1. `041_create_prompt_builder_tables.sql` - Core tables
2. `042_add_collaboration_features.sql` - Sharing and comments
3. `043_create_prompt_templates.sql` - Seed templates

### Key Dependencies to Install
```bash
npm install @anthropic-ai/sdk
npm install pdf-parse
npm install react-dropzone
npm install recharts
npm install @playwright/test
```

### Environment Variables Required
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # For server-side operations
```

---

Last Updated: January 26, 2026
Status: Ready for Development
