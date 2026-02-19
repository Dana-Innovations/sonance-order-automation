import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { WizardFlow } from '@/components/wizard/WizardFlow'
import type { WizardSession } from '@/lib/types/wizard'

interface WizardPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function WizardSessionPage({ params }: WizardPageProps) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Await params (Next.js 15+ requirement)
  const { sessionId } = await params

  // Fetch the wizard session
  const { data: session, error } = await supabase
    .from('prompt_builder_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id) // Ensure user owns this session
    .eq('is_customer_wizard', true)
    .single()

  if (error || !session) {
    notFound()
  }

  // Coerce nullable DB fields to the non-nullable WizardSession shape
  const wizardSession: WizardSession = {
    ...session,
    is_customer_wizard: session.is_customer_wizard ?? false,
    wizard_step: session.wizard_step ?? 0,
    customer_data: (session.customer_data as WizardSession['customer_data']) ?? {},
    child_accounts: (session.child_accounts as WizardSession['child_accounts']) ?? [],
    question_answers: (session.question_answers as WizardSession['question_answers']) ?? [],
  }

  // Get current step from session
  const currentStep = wizardSession.wizard_step
  // Total steps: 0-15 (16 steps) - routing questions/prompt for multi-account can be added later
  const totalSteps = 16

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href="/settings/wizard" className="text-[#6b7a85] hover:text-[#333F48]">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-[#333F48]">Customer Setup Wizard</h1>
                <p className="text-xs text-[#6b7a85]">
                  {wizardSession.customer_data?.customer_name || 'New Customer'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#333F48]">
                Step {currentStep + 1} of {totalSteps}
              </p>
              <p className="text-xs text-[#6b7a85]">
                {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#00A3E1] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Wizard Flow Component */}
          <WizardFlow initialSession={wizardSession} />
        </div>
      </div>
    </div>
  )
}
