// Types for Customer Setup Wizard

export interface WizardSession {
  id: string
  user_id: string
  customer_name: string | null
  status: 'draft' | 'generating' | 'completed' | 'error'
  is_customer_wizard: boolean
  wizard_step: number
  customer_data: CustomerData
  child_accounts: ChildAccount[]
  question_answers: QuestionAnswer[]
  created_at: string
  updated_at: string
}

export interface CustomerData {
  // Basic Info
  customer_name?: string
  ps_customer_id?: string
  is_multi_account?: boolean

  // Contact
  sender_email?: string
  sharepoint_folder_id?: string
  Folder_ID_Proc?: string | null
  csr_id?: string

  // Defaults
  default_carrier?: string
  default_ship_via?: string
  default_shipto_name?: string

  // Status
  is_active?: boolean

  // Copy tracking
  copied_from_customer_id?: string
  copied_from_customer_name?: string

  // Sample PDFs (up to 5)
  sample_pdfs?: Array<{
    name: string
    path: string
    size: number
  }>

  // Generated AI Prompts
  order_header_prompt?: string
  order_line_prompt?: string
  multi_account_prompt?: string
}

export interface ChildAccount {
  ps_account_id: string
  routing_description: string
  display_order: number
}

export interface QuestionAnswer {
  question_id: string
  question_number: number
  wizard_type: 'order_header' | 'order_line' | 'account_routing'
  question_text: string
  voice_url?: string
  transcript?: string
  text_answer?: string
  examples?: string[]
  answered_at?: string
}

export interface WizardStepProps {
  session: WizardSession
  onNext: (data: Partial<CustomerData>, childAccounts?: ChildAccount[]) => Promise<void>
  onBack: () => void
  onSaveDraft: () => Promise<void>
  onJumpToStep?: (stepNumber: number) => Promise<void>
  isLoading?: boolean
}

export interface Customer {
  ps_customer_id: string
  customer_name: string
  sender_email: string
  csr_id: string | null
  sharepoint_folder_id: string | null
  Folder_ID_Proc: string | null
  default_carrier: string | null
  default_ship_via: string | null
  default_shipto_name: string | null
  is_active: boolean
  order_header_prompt: string | null
  order_line_prompt: string | null
  MultiAccount_Prompt: string | null
}

export interface CSR {
  email: string
  first_name: string
  last_name: string
}

export interface Carrier {
  carrier_id: string
  carrier_descr: string
}

export interface ShipVia {
  ship_via_code: string
  ship_via_desc: string
}
