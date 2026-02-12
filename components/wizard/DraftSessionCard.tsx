'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DraftSessionCardProps {
  session: {
    id: string
    customer_name: string | null
    wizard_step: number
    updated_at: string
  }
}

export function DraftSessionCard({ session }: DraftSessionCardProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = confirm(
      `Are you sure you want to delete the draft setup for "${session.customer_name || 'Untitled Customer'}"?\n\nThis will permanently delete:\n• All entered customer information\n• Uploaded PDF files\n• Any recorded answers\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    try {
      // 1. Get the session data to find uploaded files
      const { data: sessionData } = await supabase
        .from('prompt_builder_sessions')
        .select('customer_data')
        .eq('id', session.id)
        .single()

      // 2. Delete uploaded PDF files from storage
      if (sessionData?.customer_data?.sample_pdfs) {
        const filePaths = sessionData.customer_data.sample_pdfs.map((pdf: any) => pdf.path)
        if (filePaths.length > 0) {
          await supabase.storage
            .from('prompt-builder-temp')
            .remove(filePaths)
        }
      }

      // 3. Delete the wizard session (this will cascade to any related data)
      const { error: deleteError } = await supabase
        .from('prompt_builder_sessions')
        .delete()
        .eq('id', session.id)

      if (deleteError) {
        console.error('Error deleting session:', deleteError)
        alert('Failed to delete wizard session. Please try again.')
        setDeleting(false)
        return
      }

      // Refresh the page to update the list
      router.refresh()
    } catch (error) {
      console.error('Error deleting wizard session:', error)
      alert('An error occurred while deleting. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-[#333F48] mb-1">
            {session.customer_name || 'Untitled Customer'}
          </p>
          <p className="text-sm text-[#6b7a85]">
            Step {session.wizard_step + 1} of 10+ • Last updated: {new Date(session.updated_at).toLocaleDateString()}
          </p>
        </div>

        {/* Buttons Container */}
        <div className="flex items-center" style={{ gap: '12px' }}>
          {/* Resume Button */}
          <Link href={`/settings/wizard/${session.id}`} className="no-underline">
            <button
              className="py-1.5 text-xs font-medium transition-colors flex items-center gap-2"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '16px',
                paddingRight: '16px'
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
              Resume
              <ArrowRight className="h-3 w-3" />
            </button>
          </Link>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="transition-colors flex items-center justify-center"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '50%',
              backgroundColor: 'white',
              color: '#00A3E1',
              width: '26px',
              height: '26px',
              padding: '0',
              opacity: deleting ? 0.5 : 1,
              cursor: deleting ? 'not-allowed' : 'pointer',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#00A3E1'
              }
            }}
            title="Delete draft"
          >
            {deleting ? (
              <div className="animate-spin border-2 border-[#00A3E1] border-t-transparent rounded-full" style={{ width: '11px', height: '11px' }}></div>
            ) : (
              <Trash2 style={{ width: '11px', height: '11px' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
