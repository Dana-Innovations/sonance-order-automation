'use client'

import { useToast, ToastContainer } from '@/components/ui/Toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToast()

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}




