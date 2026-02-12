'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardSession, CustomerData, ChildAccount } from '@/lib/types/wizard'
import { WizardStep0 } from './WizardStep0'
import { WizardStep1 } from './WizardStep1'
import { WizardStep2 } from './WizardStep2'
import { WizardStep3a } from './WizardStep3a'
import { WizardStep3b } from './WizardStep3b'
import { WizardStep4 } from './WizardStep4'
import { WizardStep5 } from './WizardStep5'
import { WizardStep6 } from './WizardStep6'
import { WizardStep7 } from './WizardStep7'
import { WizardStep9 } from './WizardStep9'
import { WizardStep10 } from './WizardStep10'
import { WizardStep11 } from './WizardStep11'
import { WizardStep12 } from './WizardStep12'
import { WizardStep13 } from './WizardStep13'
import { WizardStep14 } from './WizardStep14'
import { WizardStep15 } from './WizardStep15'
import { WizardStep16 } from './WizardStep16'
import { ArrowLeft, Save } from 'lucide-react'

interface WizardFlowProps {
  initialSession: WizardSession
}

export function WizardFlow({ initialSession }: WizardFlowProps) {
  const [session, setSession] = useState<WizardSession>(initialSession)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const updateSession = async (
    updates: {
      wizard_step?: number
      customer_data?: Partial<CustomerData>
      child_accounts?: ChildAccount[]
      status?: string
    }
  ) => {
    const response = await fetch(`/api/wizard/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update session')
    }

    const data = await response.json()
    setSession(data.session)
    router.refresh()
  }

  const handleNext = async (data: Partial<CustomerData>, childAccounts?: ChildAccount[]) => {
    setIsLoading(true)
    try {
      const updates: any = {
        wizard_step: session.wizard_step + 1,
        customer_data: {
          ...session.customer_data,
          ...data
        }
      }

      if (childAccounts !== undefined) {
        updates.child_accounts = childAccounts
      }

      await updateSession(updates)
    } catch (error) {
      console.error('Error advancing wizard:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = async () => {
    setIsLoading(true)
    try {
      await updateSession({ wizard_step: Math.max(0, session.wizard_step - 1) })
    } catch (error) {
      console.error('Error going back:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJumpToStep = async (stepNumber: number) => {
    setIsLoading(true)
    try {
      await updateSession({ wizard_step: stepNumber })
    } catch (error) {
      console.error('Error jumping to step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    try {
      await updateSession({ status: 'draft' })
      alert('Draft saved successfully!')
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Failed to save draft. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    const currentStep = session.wizard_step
    const stepProps = {
      session,
      onNext: handleNext,
      onBack: handleBack,
      onSaveDraft: handleSaveDraft,
      onJumpToStep: handleJumpToStep,
      isLoading
    }

    switch (currentStep) {
      case 0:
        return <WizardStep0 {...stepProps} />
      case 1:
        return <WizardStep1 {...stepProps} />
      case 2:
        return <WizardStep4 {...stepProps} /> // Customer Email moved here
      case 3:
        return <WizardStep2 {...stepProps} /> // Multi-Account question moved here
      case 4:
        // Branch based on multi-account
        return session.customer_data?.is_multi_account
          ? <WizardStep3a {...stepProps} />
          : <WizardStep3b {...stepProps} />
      case 5:
        return <WizardStep5 {...stepProps} />
      case 6:
        return <WizardStep6 {...stepProps} />
      case 7:
        return <WizardStep7 {...stepProps} />
      case 8:
        return <WizardStep9 {...stepProps} />
      case 9:
        return <WizardStep10 {...stepProps} />
      case 10:
        return <WizardStep11 {...stepProps} />
      case 11:
        return <WizardStep12 {...stepProps} />
      case 12:
        return <WizardStep13 {...stepProps} />
      case 13:
        return <WizardStep14 {...stepProps} />
      case 14:
        return <WizardStep15 {...stepProps} />
      case 15:
        return <WizardStep16 {...stepProps} />
      default:
        return (
          <div className="text-center py-12">
            <p className="text-[#6b7a85]">
              Step {currentStep + 1} is not yet implemented.
            </p>
            <p className="text-sm text-[#6b7a85] mt-2">
              This step will be part of Phase 2 (PDF Upload & Voice Questions).
            </p>
          </div>
        )
    }
  }

  return (
    <div>
      {/* Step Content */}
      <div className="mb-6">
        {renderStep()}
      </div>

      {/* Navigation Footer (only show for steps > 0 and not step 9 which has its own footer) */}
      {session.wizard_step > 0 && session.wizard_step !== 9 && (
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '16px',
              paddingRight: '16px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isLoading}
            className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '16px',
              paddingRight: '16px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }}
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
        </div>
      )}
    </div>
  )
}
