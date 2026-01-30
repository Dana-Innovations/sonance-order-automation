import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId, promptType } = body

    // Fetch the wizard session
    const { data: session, error: sessionError } = await supabase
      .from('prompt_builder_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get question answers for the requested prompt type
    const questionAnswers = session.question_answers?.filter(
      (qa: any) => qa.wizard_type === promptType
    ) || []

    // Get PDF samples
    const pdfSamples = session.customer_data?.sample_pdfs || []

    // Build the meta-prompt for Claude
    let metaPrompt = ''

    if (promptType === 'order_header') {
      metaPrompt = buildOrderHeaderMetaPrompt(session, questionAnswers, pdfSamples)
    } else if (promptType === 'order_line') {
      metaPrompt = buildOrderLineMetaPrompt(session, questionAnswers, pdfSamples)
    } else if (promptType === 'account_routing') {
      metaPrompt = buildAccountRoutingMetaPrompt(session, questionAnswers, pdfSamples)
    }

    // Get Anthropic API key from database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('service_name', 'anthropic')
      .single()

    if (apiKeyError || !apiKeyData) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add it in Settings > API Keys.' },
        { status: 400 }
      )
    }

    // Initialize Anthropic client with user's API key
    const anthropic = new Anthropic({
      apiKey: apiKeyData.api_key
    })

    // Call Claude API to generate the prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: metaPrompt
      }]
    })

    const generatedPrompt = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt
    })
  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}

function buildOrderHeaderMetaPrompt(
  session: any,
  questionAnswers: any[],
  pdfSamples: any[]
): string {
  const customerName = session.customer_data?.customer_name || 'this customer'
  const defaultCarrier = session.customer_data?.default_carrier || ''
  const defaultShipVia = session.customer_data?.default_ship_via || ''

  const answersText = questionAnswers
    .map(qa => `Q: ${qa.question_text}\nA: ${qa.text_answer}`)
    .join('\n\n')

  return `You are an AI prompt engineer creating a data extraction prompt for an n8n workflow that processes PDF orders.

CUSTOMER: ${customerName}

TASK: Create a detailed extraction prompt that another AI (Claude) will use to extract order header information from PDF orders for this customer.

USER'S ANSWERS TO QUESTIONS ABOUT THIS CUSTOMER'S ORDER FORMAT:
${answersText}

${pdfSamples.length > 0 ? `NOTE: The user has uploaded ${pdfSamples.length} sample PDF(s) for reference. You should reference these PDFs when creating the extraction instructions.` : ''}

REQUIRED FIELDS TO EXTRACT:
1. customer_order_number - The customer's PO or order number
2. customer_order_date - The date of the order
3. ship_to_name - The destination/recipient name
4. ship_to_address - Full address (can be up to 4 lines)
5. ship_to_city - City
6. ship_to_state - State
7. ship_to_postal_code - Zip/postal code
8. carrier - Shipping carrier (e.g., UPS, FedEx) ${defaultCarrier ? `- DEFAULT: "${defaultCarrier}" if not specified on order` : ''}
9. ship_via - Shipping method/service level ${defaultShipVia ? `- DEFAULT: "${defaultShipVia}" if not specified on order` : ''}
10. header_notes - Any notes, comments, or special instructions in the order header

INSTRUCTIONS:
- Create a clear, detailed prompt that tells the AI exactly where to find each field on this customer's orders
- Include specific labels, positions (top-right, left side, etc.), and any formatting details
- Reference the user's answers about the order layout and structure
- If a field has a default value (carrier/ship_via), instruct the AI to use the default when the field is not present on the order
- Make the prompt specific to this customer's unique order format
- Use clear, direct language that an AI can follow precisely
- Include examples from the user's answers when helpful
- Format the prompt as clear instructions that will be used in an n8n Code node

OUTPUT FORMAT:
Return ONLY the extraction prompt text that will be given to Claude. Do not include any meta-commentary, explanations, or wrapper text. Just the prompt itself that will be used for extraction.`
}

function buildOrderLineMetaPrompt(
  session: any,
  questionAnswers: any[],
  pdfSamples: any[]
): string {
  const customerName = session.customer_data?.customer_name || 'this customer'

  const answersText = questionAnswers
    .map(qa => `Q: ${qa.question_text}\nA: ${qa.text_answer}`)
    .join('\n\n')

  return `You are an AI prompt engineer creating a data extraction prompt for an n8n workflow that processes PDF orders.

CUSTOMER: ${customerName}

TASK: Create a detailed extraction prompt that another AI (Claude) will use to extract line item information from PDF orders for this customer.

USER'S ANSWERS TO QUESTIONS ABOUT THIS CUSTOMER'S ORDER FORMAT:
${answersText}

${pdfSamples.length > 0 ? `NOTE: The user has uploaded ${pdfSamples.length} sample PDF(s) for reference. You should reference these PDFs when creating the extraction instructions.` : ''}

REQUIRED FIELDS TO EXTRACT FOR EACH LINE ITEM:
1. line_number - Line or item number (auto-number if not specified)
2. customer_product_code - Customer's product/item/SKU
3. quantity - Quantity ordered
4. unit_of_measure - Unit of measure (EA, CS, BX, etc.)
5. unit_price - Price per unit
6. extended_price - Line total (quantity × unit_price)
7. sonance_product_code - Sonance SKU/item number (if present on order)

INSTRUCTIONS:
- Create a clear, detailed prompt that tells the AI exactly how to extract line items from this customer's orders
- Describe the table/list format and where each column is located
- Include instructions for handling line numbers (auto-number if not present)
- Specify how to calculate extended_price if not shown
- Explain how to identify the Sonance product code if it exists
- Make the prompt specific to this customer's unique order format
- Use clear, direct language that an AI can follow precisely
- Format the output as a JSON array of line items

OUTPUT FORMAT:
Return ONLY the extraction prompt text that will be given to Claude. Do not include any meta-commentary, explanations, or wrapper text. Just the prompt itself that will be used for extraction.`
}

function buildAccountRoutingMetaPrompt(
  session: any,
  questionAnswers: any[],
  pdfSamples: any[]
): string {
  const customerName = session.customer_data?.customer_name || 'this customer'
  const childAccounts = session.child_accounts || []

  const accountsList = childAccounts
    .map(acc => `- ${acc.ps_account_id}: ${acc.routing_description}`)
    .join('\n')

  const answersText = questionAnswers
    .map(qa => `Q: ${qa.question_text}\nA: ${qa.text_answer}`)
    .join('\n\n')

  return `You are an AI prompt engineer creating a routing prompt for an n8n workflow that processes PDF orders.

CUSTOMER: ${customerName} (Multi-Account Customer)

TASK: Create a detailed prompt that another AI (Claude) will use to determine which PeopleSoft account ID to route each order to.

AVAILABLE ACCOUNTS:
${accountsList}

USER'S ANSWERS TO QUESTIONS ABOUT ROUTING LOGIC:
${answersText}

${pdfSamples.length > 0 ? `NOTE: The user has uploaded ${pdfSamples.length} sample PDF(s) for reference.` : ''}

INSTRUCTIONS:
- Create a clear prompt that tells the AI how to analyze the order and determine the correct account
- Reference the user's answers about what fields/data indicate routing
- Include specific rules, patterns, or logic from the user's responses
- Make it clear and unambiguous which account to select based on order contents
- Handle edge cases mentioned by the user
- Output should be just the account ID (e.g., "12345")

OUTPUT FORMAT:
Return ONLY the routing prompt text that will be given to Claude. Do not include any meta-commentary, explanations, or wrapper text. Just the prompt itself that will be used for routing decisions.`
}
