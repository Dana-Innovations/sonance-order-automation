'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Type, ArrowRight } from 'lucide-react'

interface VoiceQuestionCardProps {
  questionNumber: number
  totalQuestions: number
  questionText: string
  initialAnswer?: string
  onContinue: (answer: string) => void
  onSkip: () => void
  isLoading?: boolean
}

export function VoiceQuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  initialAnswer = '',
  onContinue,
  onSkip,
  isLoading
}: VoiceQuestionCardProps) {
  const [answer, setAnswer] = useState(initialAnswer)
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showTextInput, setShowTextInput] = useState(initialAnswer.length > 0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioURL) URL.revokeObjectURL(audioURL)
    }
  }, [audioURL])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Unable to access microphone. Please check your browser permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const togglePlayback = () => {
    if (!audioRef.current && audioURL) {
      const audio = new Audio(audioURL)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const transcribeRecording = async () => {
    // For now, this opens the text input area
    // In a full implementation, you could send the audio to a transcription service
    setShowTextInput(true)
    alert('Please type or paste your answer in the text area below. (Auto-transcription can be added later with a transcription API.)')
  }

  const handleContinue = () => {
    if (answer.trim()) {
      onContinue(answer.trim())
    } else {
      alert('Please provide an answer or skip this question.')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#6b7a85]">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs text-[#6b7a85]">
            {Math.round((questionNumber / totalQuestions) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#00A3E1] h-2 rounded-full transition-all"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#333F48] mb-4">
          {questionText}
        </h3>

        {/* Recording Controls */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {!isRecording && !audioURL && (
              <button
                onClick={startRecording}
                className="py-2 px-4 text-sm font-medium transition-colors flex items-center gap-2"
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
                <Mic className="h-4 w-4" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={stopRecording}
                  className="py-2 px-4 text-sm font-medium transition-colors flex items-center gap-2"
                  style={{
                    border: '1px solid #dc2626',
                    borderRadius: '20px',
                    backgroundColor: 'white',
                    color: '#dc2626'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#dc2626'
                  }}
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </button>
                <span className="text-sm text-[#dc2626] font-medium flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  {formatTime(recordingTime)}
                </span>
              </>
            )}

            {audioURL && !isRecording && (
              <>
                <button
                  onClick={togglePlayback}
                  className="py-2 px-4 text-sm font-medium transition-colors flex items-center gap-2"
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
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play Recording'}
                </button>

                <button
                  onClick={transcribeRecording}
                  className="py-2 px-4 text-sm font-medium transition-colors flex items-center gap-2"
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
                  <Type className="h-4 w-4" />
                  Type Answer
                </button>
              </>
            )}

            {!isRecording && !audioURL && (
              <button
                onClick={() => setShowTextInput(true)}
                className="py-2 px-4 text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  border: '1px solid #6b7a85',
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#6b7a85'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7a85'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.color = '#6b7a85'
                }}
              >
                <Type className="h-4 w-4" />
                Type Answer Instead
              </button>
            )}
          </div>
        </div>

        {/* Text Answer Area */}
        {showTextInput && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#333F48] mb-2">
              Your Answer
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none text-sm"
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            border: '1px solid #6b7a85',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#6b7a85',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#6b7a85'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#6b7a85'
          }}
        >
          Skip Question
        </button>

        <button
          onClick={handleContinue}
          disabled={isLoading || !answer.trim()}
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
            if (!isLoading && answer.trim()) {
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
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
