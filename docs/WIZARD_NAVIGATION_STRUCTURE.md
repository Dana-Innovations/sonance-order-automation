# Customer Setup Wizard - Navigation Structure

## Overview

The Customer Setup Wizard is a **separate page** accessed from the main Settings page. The existing customer form (`/settings/customers/new` and `/settings/customers/[id]/edit`) remains unchanged.

This provides **two paths** for customer management:
1. **Quick Form** - Existing customer form for advanced users who know what they're doing
2. **Guided Wizard** - New comprehensive wizard for complete setup with AI prompts

---

## Navigation Structure

```
┌─────────────────────────────────────────────────────────┐
│ Main Settings Page (/settings)                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Card] Carriers & Ship Methods → /settings/carriers     │
│ [Card] Inside Sales Representatives → /settings/csrs    │
│ [Card] Customers → /settings/customers                  │
│ [Card] Customer Setup Wizard → /settings/wizard   ← NEW │
│                                                          │
└─────────────────────────────────────────────────────────┘
                    │
                    ├─────────────────────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌───────────────────────┐    ┌──────────────────────────┐
        │ Customers List        │    │ Customer Setup Wizard    │
        │ /settings/customers   │    │ /settings/wizard         │
        ├───────────────────────┤    ├──────────────────────────┤
        │                       │    │                          │
        │ [New Customer] ─┐     │    │ Start New Setup          │
        │ [Edit] buttons  │     │    │ (30+ step wizard)        │
        │                 │     │    │                          │
        │                 ▼     │    │ • Copy from existing     │
        │   /customers/new      │    │ • Customer info          │
        │   (Quick form)        │    │ • Upload PDFs            │
        │                       │    │ • Voice questions        │
        │   /customers/[id]/edit│    │ • Generate prompts       │
        │   (Quick edit)        │    │                          │
        │                       │    │ Complete customer setup  │
        │ ✓ Keeps existing form │    │ with AI prompts in one   │
        │ ✓ No changes needed   │    │ guided experience        │
        └───────────────────────┘    └──────────────────────────┘
```

---

## Updated Main Settings Page

### New Card Added

```tsx
// app/(dashboard)/settings/page.tsx

import { Settings, Truck, Users, Building2, Sparkles } from 'lucide-react'

export default async function SettingsPage() {
  // ... existing code ...

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div style={{ lineHeight: '1.2', marginLeft: '24px', marginTop: '0px', paddingTop: '4px', marginBottom: '36px' }}>
        <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px' }}>
          Settings
        </h1>
        <p className="text-sm text-[#6b7a85]" style={{ margin: '0px' }}>
          Manage Shipping Carriers, ISRs and Customer Accounts
        </p>
      </div>

      {/* Navigation Cards - UPDATE TO 2x2 GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '32px', paddingLeft: '48px', paddingRight: '24px' }}>

        {/* Existing Cards - UNCHANGED */}

        {/* Carriers Card */}
        <Link href="/settings/carriers" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Truck className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]">Carriers & Ship Methods</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage shipping carriers and ship-via codes for order fulfillment
            </p>
          </div>
        </Link>

        {/* CSRs Card */}
        <Link href="/settings/csrs" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Users className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]">Inside Sales Representatives</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage Inside Sales Representatives
            </p>
          </div>
        </Link>

        {/* Customers Card */}
        <Link href="/settings/customers" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Building2 className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]">Customers</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage customer accounts, email addresses, and ISR assignments
            </p>
          </div>
        </Link>

        {/* NEW: Customer Setup Wizard Card */}
        <Link href="/settings/wizard" className="no-underline">
          <div className="rounded-md shadow-sm border-2 border-[#00A3E1] bg-gradient-to-br from-white to-blue-50 p-6 hover:border-[#0082b8] hover:shadow-lg transition-all cursor-pointer relative">
            {/* "NEW" badge */}
            <div className="absolute top-2 right-2 bg-[#00A3E1] text-white text-xs font-bold px-2 py-1 rounded-full">
              NEW
            </div>

            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Sparkles className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]">Customer Setup Wizard</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              AI-guided setup for new customers with automated prompt generation
            </p>
            <div className="mt-3 ml-12 flex items-center gap-2 text-xs text-[#00A3E1]">
              <span>✨ Voice-guided questions</span>
              <span>•</span>
              <span>🤖 AI prompt generation</span>
            </div>
          </div>
        </Link>

      </div>
    </div>
  )
}
```

### Visual Design

```
┌────────────────────────────────────────────────────────────────┐
│ Settings                                                        │
│ Manage Shipping Carriers, ISRs and Customer Accounts           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────┐  ┌─────────────────────────┐      │
│ │ 🚚 Carriers & Ship      │  │ 👥 Inside Sales         │      │
│ │    Methods              │  │    Representatives      │      │
│ │ ───────────────────────│  │ ───────────────────────│      │
│ │ Manage shipping carriers│  │ Manage Inside Sales     │      │
│ │ and ship-via codes...   │  │ Representatives         │      │
│ └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│ ┌─────────────────────────┐  ┌─────────────────────────┐      │
│ │ 🏢 Customers            │  │ ✨ Customer Setup       │ NEW  │
│ │                         │  │    Wizard               │      │
│ │ ───────────────────────│  │ ═══════════════════════ │      │
│ │ Manage customer         │  │ AI-guided setup for new │      │
│ │ accounts, email         │  │ customers with automated│      │
│ │ addresses, and ISR...   │  │ prompt generation       │      │
│ │                         │  │                         │      │
│ │                         │  │ ✨ Voice-guided • 🤖 AI │      │
│ └─────────────────────────┘  └─────────────────────────┘      │
│                                    ^ Blue gradient border      │
└────────────────────────────────────────────────────────────────┘
```

---

## Wizard Page Structure

### Main Wizard Landing Page

**Path:** `/settings/wizard`
**File:** `app/(dashboard)/settings/wizard/page.tsx`

```tsx
// app/(dashboard)/settings/wizard/page.tsx

export default async function WizardLandingPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Sparkles className="h-8 w-8 text-[#00A3E1]" />
        </div>
        <h1 className="text-3xl font-light text-[#333F48] mb-3">
          Customer Setup Wizard
        </h1>
        <p className="text-lg text-[#6b7a85]">
          Complete guided setup for new customers with AI-powered prompt generation
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-[#333F48] mb-2">Complete Setup</h3>
          <p className="text-sm text-[#6b7a85]">
            Configure all customer details, defaults, and settings in one flow
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">🎤</div>
          <h3 className="font-semibold text-[#333F48] mb-2">Voice Input</h3>
          <p className="text-sm text-[#6b7a85]">
            Answer questions naturally by speaking - AI transcribes automatically
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="font-semibold text-[#333F48] mb-2">AI Prompts</h3>
          <p className="text-sm text-[#6b7a85]">
            Automatically generate optimized AI prompts for order processing
          </p>
        </div>
      </div>

      {/* What You'll Do */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
        <h2 className="font-semibold text-[#333F48] mb-4">What You'll Do:</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-[#00A3E1] font-semibold">1.</span>
            <div>
              <strong>Customer Information</strong>
              <p className="text-sm text-[#6b7a85]">
                Enter customer details, email, SharePoint folder, and assign ISR
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#00A3E1] font-semibold">2.</span>
            <div>
              <strong>Upload Sample PDFs</strong>
              <p className="text-sm text-[#6b7a85]">
                Provide 1-3 example order PDFs to help AI understand the format
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#00A3E1] font-semibold">3.</span>
            <div>
              <strong>Answer Voice Questions (20 questions)</strong>
              <p className="text-sm text-[#6b7a85]">
                Speak naturally to describe how to extract order information
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#00A3E1] font-semibold">4.</span>
            <div>
              <strong>Review & Save</strong>
              <p className="text-sm text-[#6b7a85]">
                AI generates prompts, you review, and save the complete customer setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="text-center mb-8">
        <p className="text-sm text-[#6b7a85]">
          ⏱️ Estimated time: 15-20 minutes
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Link href="/settings/wizard/new">
          <button className="px-8 py-3 bg-[#00A3E1] text-white rounded-lg font-semibold hover:bg-[#0082b8] transition-colors">
            Start New Customer Setup
          </button>
        </Link>

        <Link href="/settings/customers">
          <button className="px-8 py-3 bg-white border border-gray-300 text-[#333F48] rounded-lg font-semibold hover:bg-gray-50 transition-colors">
            Use Quick Form Instead
          </button>
        </Link>
      </div>

      {/* Help Text */}
      <div className="text-center mt-8">
        <p className="text-xs text-[#6b7a85]">
          💡 Prefer a simpler approach? Use the{' '}
          <Link href="/settings/customers/new" className="text-[#00A3E1] underline">
            quick customer form
          </Link>{' '}
          for manual setup without AI assistance.
        </p>
      </div>
    </div>
  )
}
```

### Wizard Session Pages

**Path:** `/settings/wizard/new` → Creates session, redirects to `/settings/wizard/[sessionId]`
**Path:** `/settings/wizard/[sessionId]` → Main wizard interface

---

## Comparison: Quick Form vs. Wizard

| Feature | Quick Form (/customers/new) | Wizard (/wizard) |
|---------|----------------------------|------------------|
| **Access** | Customers list → New Customer | Settings → Wizard card |
| **Fields** | All customer fields manually | Guided step-by-step |
| **AI Prompts** | Paste/edit manually | Generated via voice Q&A |
| **Multi-Account** | Manual setup | Guided child account setup |
| **PDF Upload** | Not supported | 1-3 sample PDFs |
| **Voice Input** | No | Yes, 20 questions |
| **Time** | 5 min (if you know what to do) | 15-20 min (guided) |
| **Best For** | Advanced users, quick edits | First-time setup, AI prompts |
| **Copy from Existing** | Manual copy/paste | Built-in copy feature |

---

## File Structure

```
app/(dashboard)/settings/
├── page.tsx                    ← UPDATE: Add wizard card
├── carriers/
│   └── ...                     (unchanged)
├── csrs/
│   └── ...                     (unchanged)
├── customers/
│   ├── page.tsx                (unchanged)
│   ├── new/
│   │   └── page.tsx            ← KEEP AS IS: Quick form
│   └── [id]/
│       └── edit/
│           └── page.tsx        ← UPDATE: Add child account mgmt
└── wizard/                     ← NEW DIRECTORY
    ├── page.tsx                ← Landing page with features
    ├── new/
    │   └── route.ts            ← Creates session, redirects
    └── [sessionId]/
        └── page.tsx            ← Main wizard UI (30+ steps)
```

---

## Implementation Steps

### Step 1: Update Main Settings Page
```bash
# File: app/(dashboard)/settings/page.tsx
# Changes:
# - Change grid from 3 columns to 2 columns (2x2 layout)
# - Add new "Customer Setup Wizard" card
# - Import Sparkles icon
# - Style new card with gradient and "NEW" badge
```

### Step 2: Create Wizard Landing Page
```bash
# File: app/(dashboard)/settings/wizard/page.tsx
# Create new landing page with:
# - Hero section
# - Features overview
# - Step-by-step explanation
# - "Start New Customer Setup" button
# - Link to quick form as alternative
```

### Step 3: Create Wizard Session Handler
```bash
# File: app/(dashboard)/settings/wizard/new/route.ts
# API route that:
# - Creates new prompt_builder_sessions record
# - Sets is_customer_wizard = true
# - Generates UUID
# - Redirects to /settings/wizard/[sessionId]
```

### Step 4: Create Main Wizard Interface
```bash
# File: app/(dashboard)/settings/wizard/[sessionId]/page.tsx
# Main wizard component with:
# - 30+ step flow
# - Voice recording
# - PDF upload
# - Child account management
# - AI generation
# - Final save to customers table
```

### Step 5: Keep Existing Forms Unchanged
```bash
# NO CHANGES to these files:
# - app/(dashboard)/settings/customers/page.tsx
# - app/(dashboard)/settings/customers/new/page.tsx
# - components/settings/CustomerForm.tsx (except child account section)
```

---

## User Journey Examples

### Journey 1: New User Setting Up First Customer

1. Go to Settings page
2. See "Customer Setup Wizard" card with "NEW" badge
3. Click card → Wizard landing page
4. Read features and steps
5. Click "Start New Customer Setup"
6. Go through 30+ step wizard
7. Complete setup with AI prompts
8. Customer created and ready for orders

### Journey 2: Advanced User Creating Customer

1. Go to Settings page
2. Click "Customers" card
3. Click "New Customer" button
4. Use existing quick form
5. Fill in fields manually
6. Paste AI prompts if needed
7. Save customer

### Journey 3: User Copying from Existing

1. Go to Settings page
2. Click "Customer Setup Wizard"
3. Click "Start New Customer Setup"
4. Choose "Copy from existing customer"
5. Select source customer
6. Review pre-filled settings
7. Change name, email, etc.
8. Skip AI questions (use copied prompts)
9. Save new customer

---

## Next Steps

1. ✅ Update main settings page (add wizard card)
2. ✅ Create wizard landing page
3. ✅ Create wizard session handler
4. ✅ Build main wizard interface
5. ✅ Keep existing forms unchanged
6. ✅ Test both paths work independently

---

Last Updated: January 26, 2026
Status: Ready for Implementation
