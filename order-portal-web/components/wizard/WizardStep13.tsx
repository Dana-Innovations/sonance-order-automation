'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { Sparkles, Edit, CheckCircle, ArrowRight } from 'lucide-react'

export function WizardStep13({ session, onNext, isLoading }: WizardStepProps) {
  const [generating, setGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState(
    session.customer_data?.order_header_prompt || ''
  )
  const [isEditing, setIsEditing] = useState(false)

  const headerAnswers = session.question_answers?.filter(qa => qa.wizard_type === 'order_header') || []
  const answeredCount = headerAnswers.filter(qa => qa.text_answer).length

  const handleGeneratePrompt = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/wizard/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          promptType: 'order_header'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate prompt')
      }

      const data = await response.json()
      setGeneratedPrompt(data.prompt)
      setIsEditing(true)
    } catch (error) {
      console.error('Error generating prompt:', error)
      alert('Failed to generate prompt. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAndContinue = async () => {
    if (!generatedPrompt.trim()) {
      alert('Please generate a prompt before continuing.')
      return
    }

    // Save the prompt to customer_data
    await onNext({
      order_header_prompt: generatedPrompt
    })
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2 flex items-center gap-2">
          <Sparkles className="h-6 w-6" style={{ color: '#00A3E1' }} />
          Generate Order Header Prompt
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      {/* Summary of Answers */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-2">Ready to Generate</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1">
          <li>✓ {answeredCount} order header questions answered</li>
          <li>✓ {session.customer_data?.sample_pdfs?.length || 0} sample PDF(s) uploaded</li>
        </ul>
      </div>

      {!generatedPrompt && !generating && (
        <div className="text-center py-12">
          <p className="text-[#6b7a85] mb-6">
            Click the button below to use AI to generate a custom order header extraction prompt
            based on your answers and sample PDFs.
          </p>
          <button
            onClick={handleGeneratePrompt}
            disabled={generating}
            className="py-2 px-6 text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }}
          >
            <Sparkles className="h-4 w-4" />
            Generate Order Header Prompt
          </button>
        </div>
      )}

      {generating && (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#6b7a85] mb-2">Analyzing your answers and sample PDFs...</p>
          <p className="text-sm text-[#6b7a85]">This may take 10-20 seconds</p>
        </div>
      )}

      {generatedPrompt && !generating && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#333F48] flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generated Order Header Prompt
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="py-1 px-3 text-xs font-medium transition-colors flex items-center gap-1"
                style={{
                  border: '1px solid #00A3E1',
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#00A3E1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.color = '#00A3E1'
                }}
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              rows={20}
              className="w-full border-2 border-gray-300 rounded-lg p-4 focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none text-sm font-mono"
            />
          ) : (
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
              <pre className="text-sm font-mono whitespace-pre-wrap text-[#333F48]">
                {generatedPrompt}
              </pre>
            </div>
          )}

          <p className="text-xs text-[#6b7a85] mt-2">
            💡 Review and edit the prompt above if needed. This will be used by your n8n workflow
            to extract order header data from PDFs.
          </p>
        </div>
      )}

      {generatedPrompt && !generating && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveAndContinue}
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
            {isLoading ? 'Saving...' : (
              <>
                Save & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
