'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { VoiceQuestionCard } from './VoiceQuestionCard'
import { Package } from 'lucide-react'

const ORDER_LINE_QUESTIONS = [
  "Where are the line items located on this customer's orders? Describe the table structure and general layout (columns, headers, etc.)",
  "Where is the customer's product number, SKU, or item code located? What is this field typically called on their orders?",
  "Where is the product description located? Is it a long detailed description or a short summary?",
  "Where is the quantity field located? What format is it in (whole numbers, decimals with commas, etc.)?",
  "Where is the unit of measure (UOM) located? What codes does this customer typically use (EA, CS, BX, PCS, etc.)? If not shown, what should be the default?",
  "Where are the prices located? Does this customer show unit price, extended price (line total), or both? Describe the format.",
  "Does this customer show any discounts, adjustments, or special pricing indicators on line items? If yes, describe where and how they appear.",
  "Are there any common issues with this customer's line items? For example: line items split across pages, subtotal rows mixed in, or special formatting for certain types of items?"
]

export function WizardStep14({ session, onNext, isLoading }: WizardStepProps) {
  const existingAnswers = session.question_answers?.filter(qa => qa.wizard_type === 'order_line') || []
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>(
    existingAnswers.reduce((acc, qa) => {
      acc[qa.question_number] = qa.text_answer || ''
      return acc
    }, {} as Record<number, string>)
  )

  const handleAnswerContinue = (answer: string) => {
    // Save the answer
    const newAnswers = { ...answers, [currentQuestionIndex]: answer }
    setAnswers(newAnswers)

    // Move to next question or finish
    if (currentQuestionIndex < ORDER_LINE_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, save and continue to next step
      saveAndContinue(newAnswers)
    }
  }

  const handleSkip = () => {
    // Move to next question without saving answer
    if (currentQuestionIndex < ORDER_LINE_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Last question, save what we have and continue
      saveAndContinue(answers)
    }
  }

  const saveAndContinue = async (finalAnswers: Record<number, string>) => {
    // Convert answers to question_answers format
    const questionAnswers = ORDER_LINE_QUESTIONS.map((question, index) => ({
      question_id: `line_q${index + 1}`,
      question_number: index,
      wizard_type: 'order_line' as const,
      question_text: question,
      text_answer: finalAnswers[index] || '',
      answered_at: finalAnswers[index] ? new Date().toISOString() : undefined
    })).filter(qa => qa.text_answer) // Only include answered questions

    // Merge with existing answers from other sections
    const otherAnswers = session.question_answers?.filter(qa => qa.wizard_type !== 'order_line') || []
    const allAnswers = [...otherAnswers, ...questionAnswers]

    // Save to session via the updateSession endpoint
    try {
      const response = await fetch(`/api/wizard/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_answers: allAnswers
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save answers')
      }

      // Now advance to next step
      await onNext({})
    } catch (error) {
      console.error('Error saving question answers:', error)
      alert('Failed to save your answers. Please try again.')
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2 flex items-center gap-2">
          <Package className="h-6 w-6" style={{ color: '#00A3E1' }} />
          Order Line Item Questions
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Tip:</strong> You can record your answer using your microphone or type it directly.
          Feel free to skip questions if they don't apply to this customer.
        </p>
      </div>

      <VoiceQuestionCard
        key={currentQuestionIndex}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={ORDER_LINE_QUESTIONS.length}
        questionText={ORDER_LINE_QUESTIONS[currentQuestionIndex]}
        initialAnswer={answers[currentQuestionIndex] || ''}
        onContinue={handleAnswerContinue}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
    </div>
  )
}
