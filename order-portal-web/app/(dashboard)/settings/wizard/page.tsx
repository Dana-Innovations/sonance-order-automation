import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WizardLandingButtons } from '@/components/wizard/WizardLandingButtons'
import { DraftSessionCard } from '@/components/wizard/DraftSessionCard'

export default async function WizardLandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch draft wizard sessions for this user
  const { data: draftSessions } = await supabase
    .from('prompt_builder_sessions')
    .select('id, customer_name, wizard_step, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_customer_wizard', true)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto py-6 px-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-[#333F48] mb-2 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-[#00A3E1]" style={{ marginRight: '16px' }} />
          Customer Setup Wizard
        </h1>
      </div>

      {/* Progress Stepper */}
      <div className="bg-blue-50 rounded-lg mb-8" style={{ padding: '32px' }}>
        <div style={{ paddingLeft: '140px', paddingRight: '140px' }}>
          {/* Line with circles - relative positioning */}
          <div style={{ position: 'relative', height: '16px', marginBottom: '16px' }}>
            {/* Continuous background line */}
            <div style={{
              position: 'absolute',
              top: '7px',
              left: '8px',
              right: '8px',
              height: '2px',
              backgroundColor: '#6b7a85'
            }}></div>

            {/* Circles positioned on top of line */}
            <div className="flex justify-between" style={{ position: 'relative' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#00A3E1'
              }}></div>

              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '2px solid #6b7a85'
              }}></div>

              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '2px solid #6b7a85'
              }}></div>

              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '2px solid #6b7a85'
              }}></div>
            </div>
          </div>

          {/* Step labels centered below circles */}
          <div className="flex justify-between text-center text-sm">
            <div style={{ width: '16px', flex: '0 0 auto' }}>
              <div className="font-semibold text-[#00A3E1]" style={{ marginBottom: '4px', whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>1. Customer Info</div>
              <div className="text-xs text-[#6b7a85]" style={{ whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>Basic details</div>
            </div>
            <div style={{ width: '16px', flex: '0 0 auto' }}>
              <div className="font-semibold text-[#333F48]" style={{ marginBottom: '4px', whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>2. Upload PDFs</div>
              <div className="text-xs text-[#6b7a85]" style={{ whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>Sample orders</div>
            </div>
            <div style={{ width: '16px', flex: '0 0 auto' }}>
              <div className="font-semibold text-[#333F48]" style={{ marginBottom: '4px', whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>3. Voice Q&A</div>
              <div className="text-xs text-[#6b7a85]" style={{ whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>20 questions</div>
            </div>
            <div style={{ width: '16px', flex: '0 0 auto' }}>
              <div className="font-semibold text-[#333F48]" style={{ marginBottom: '4px', whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>4. Review</div>
              <div className="text-xs text-[#6b7a85]" style={{ whiteSpace: 'nowrap', marginLeft: '-50px', marginRight: '-50px' }}>AI generates prompts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <WizardLandingButtons />

      {/* Footer Info */}
      <div className="text-center text-xs text-[#6b7a85] mb-6">
        <p>Guided setup with AI-powered prompt generation • ⏱️ 15-20 minutes</p>
      </div>

      {/* Back Link */}
      <div className="text-center mb-6">
        <Link href="/settings" className="text-sm text-[#6b7a85] hover:text-[#333F48]">
          ← Back to Settings
        </Link>
      </div>

      {/* Draft Sessions */}
      {draftSessions && draftSessions.length > 0 && (
        <div className="mb-8 mx-auto" style={{ maxWidth: '30%' }}>
          <h2 className="text-lg font-semibold text-[#333F48] mb-4">Continue In-Progress Setup</h2>
          <div className="space-y-3">
            {draftSessions.map((session) => (
              <DraftSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
