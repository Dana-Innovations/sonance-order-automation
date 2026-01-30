'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { VoiceQuestionCard } from './VoiceQuestionCard'
import { FileText } from 'lucide-react'

const ORDER_HEADER_QUESTIONS = [
  "Where is the customer's order number or purchase order number located on the order? Describe what it's typically called on this customer's orders.",
  "Where is the order date located? What format is the date in (e.g., MM/DD/YYYY, spelled out, etc.)?",
  "Where is the ship-to name or destination name located? Is it labeled as 'Ship To', 'Deliver To', or something else?",
  "Where is the ship-to address located? How many address lines does this customer typically use (1-4 lines)? Describe the format.",
  "Where are the ship-to city, state, and postal code located? Are they on the same line or separate lines?",
  "Does this customer specify a carrier (like UPS, FedEx, etc.) on their orders? If yes, where is it located and what is it called? If no, just say 'not specified' and we'll use the default.",
  "Does this customer specify a shipping method or service level (like Ground, 2-Day Air, etc.) on their orders? If yes, where is it located? If no, just say 'not specified' and we'll use the default.",
  "Does this customer include any notes, comments, or special instructions in the order header? If yes, where are they located and what are they typically labeled as?",
  "Describe the overall layout of this customer's orders. Where are the header details positioned (top, left, right, etc.) relative to the line items?",
  "Are this customer's orders typically single-page or multi-page? If multi-page, which page contains the header information?"
]

export function WizardStep12({ session, onNext, isLoading }: WizardStepProps) {
  const existingAnswers = session.question_answers?.filter(qa => qa.wizard_type === 'order_header') || []
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
    if (currentQuestionIndex < ORDER_HEADER_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, save and continue to next step
      saveAndContinue(newAnswers)
    }
  }

  const handleSkip = () => {
    // Move to next question without saving answer
    if (currentQuestionIndex < ORDER_HEADER_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Last question, save what we have and continue
      saveAndContinue(answers)
    }
  }

  const saveAndContinue = async (finalAnswers: Record<number, string>) => {
    // Convert answers to question_answers format
    const questionAnswers = ORDER_HEADER_QUESTIONS.map((question, index) => ({
      question_id: `header_q${index + 1}`,
      question_number: index,
      wizard_type: 'order_header' as const,
      question_text: question,
      text_answer: finalAnswers[index] || '',
      answered_at: finalAnswers[index] ? new Date().toISOString() : undefined
    })).filter(qa => qa.text_answer) // Only include answered questions

    // Merge with existing answers from other sections
    const otherAnswers = session.question_answers?.filter(qa => qa.wizard_type !== 'order_header') || []
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
          <FileText className="h-6 w-6" style={{ color: '#00A3E1' }} />
          Order Header Questions
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
        totalQuestions={ORDER_HEADER_QUESTIONS.length}
        questionText={ORDER_HEADER_QUESTIONS[currentQuestionIndex]}
        initialAnswer={answers[currentQuestionIndex] || ''}
        onContinue={handleAnswerContinue}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
    </div>
  )
}
