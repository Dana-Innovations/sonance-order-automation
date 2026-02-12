'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, CheckCircle, X, ArrowRight, Trash2 } from 'lucide-react'

const MAX_FILES = 5

export function WizardStep11({ session, onNext, isLoading }: WizardStepProps) {
  const [uploading, setUploading] = useState(false)
  const initialFiles = session.customer_data?.sample_pdfs || []
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string
    path: string
    size: number
  }>>(initialFiles)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const supabase = createClient()

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return

    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + files.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} files`)
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to upload files')
        setUploading(false)
        return
      }

      const newFiles: Array<{ name: string; path: string; size: number }> = []

      for (const file of files) {
        // Validate file type
        if (file.type !== 'application/pdf') {
          setError(`${file.name} is not a PDF file. Skipping.`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} exceeds 10MB limit. Skipping.`)
          continue
        }

        // Create a unique file name with user_id prefix for RLS
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(7)
        const fileName = `${session.id}_${timestamp}_${random}_${file.name}`
        const filePath = `${user.id}/wizard-samples/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('prompt-builder-temp')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setError(`Failed to upload ${file.name}`)
          continue
        }

        newFiles.push({
          name: file.name,
          path: filePath,
          size: file.size
        })
      }

      setUploadedFiles([...uploadedFiles, ...newFiles])
      setUploading(false)
    } catch (err) {
      console.error('Error uploading files:', err)
      setError('An error occurred during upload')
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await uploadFiles(files)
    // Clear the input so the same file can be selected again if needed
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    await uploadFiles(files)
  }

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = uploadedFiles[index]

    // Delete from storage
    await supabase.storage
      .from('prompt-builder-temp')
      .remove([fileToRemove.path])

    // Remove from state
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
  }

  const handleContinue = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one sample PDF before continuing')
      return
    }

    await onNext({
      sample_pdfs: uploadedFiles
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Upload Sample PDF Orders
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-2 flex items-center gap-3">
          <FileText className="h-5 w-5 flex-shrink-0" style={{ color: '#00A3E1' }} />
          Why do we need this?
        </h3>
        <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '32px' }}>
          Upload sample PDF orders from this customer (up to {MAX_FILES} files). Claude AI will analyze the PDF layouts
          and structure along with your voice-recorded instructions to generate highly accurate
          data extraction prompts tailored to this customer's specific order format.
        </p>
      </div>

      {/* Upload Area */}
      <div className="mb-6">
        {uploadedFiles.length < MAX_FILES && (
          <div className="mb-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <label
                htmlFor="pdf-upload"
                className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#00A3E1] bg-blue-100'
                    : 'border-gray-300 hover:border-[#00A3E1] hover:bg-blue-50'
                }`}
              >
                <Upload className="h-12 w-12 mx-auto mb-3 text-[#00A3E1]" />
                <p className="text-sm font-medium text-[#333F48] mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-[#6b7a85]">
                  PDF files only (max 10MB each) • {uploadedFiles.length} of {MAX_FILES} uploaded
                </p>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                  multiple
                />
              </label>
            </div>
            {uploading && (
              <div className="mt-4 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-[#6b7a85]">Uploading...</p>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Sample Orders */}
        {uploadedFiles.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#333F48] mb-3">
              Uploaded Sample Orders ({uploadedFiles.length})
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#333F48] truncate">
                          {file.name}
                        </p>
                        {file.size > 0 && (
                          <p className="text-xs text-[#6b7a85]">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="transition-colors flex items-center justify-center flex-shrink-0"
                      style={{
                        border: '1px solid #00A3E1',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        color: '#00A3E1',
                        width: '26px',
                        height: '26px',
                        padding: '0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#00A3E1'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.color = '#00A3E1'
                      }}
                      title="Remove file"
                    >
                      <Trash2 style={{ width: '11px', height: '11px' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Tip:</strong> Upload typical orders that include all the fields you want
          to extract (PO number, dates, addresses, line items, etc.). Multiple samples help
          Claude understand variations in your customer's order format.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || uploadedFiles.length === 0}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px',
            marginTop: '3pt'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && uploadedFiles.length > 0) {
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
