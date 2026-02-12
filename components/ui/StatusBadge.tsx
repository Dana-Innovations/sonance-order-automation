import { cn } from '@/lib/utils'

// Sonance-aligned status colors with subtle borders
const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  '01': { // New
    bg: 'bg-sky-50',
    text: 'text-[#00A3E1]',
    border: 'border-sky-200',
    dot: 'bg-[#00A3E1]'
  },
  '02': { // Rev No Changes
    bg: 'bg-sky-50',
    text: 'text-[#00A3E1]',
    border: 'border-sky-200',
    dot: 'bg-[#00A3E1]'
  },
  '03': { // Rev W/ Changes
    bg: 'bg-sky-50',
    text: 'text-[#00A3E1]',
    border: 'border-sky-200',
    dot: 'bg-[#00A3E1]'
  },
  '04': { // Upload in Process
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500'
  },
  '05': { // Import Successful
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500'
  },
  '06': { // Cancelled
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-600'
  },
}

const defaultStyle = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  dot: 'bg-gray-400'
}

export function StatusBadge({
  statusCode,
  statusName,
}: {
  statusCode: string
  statusName: string
}) {
  const style = statusStyles[statusCode] || defaultStyle
  const isCancelled = statusCode === '06'
  const isImportSuccessful = statusCode === '05'
  const isUploadInProcess = statusCode === '04'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-medium',
        style.bg,
        style.text,
        style.border
      )}
      style={{
        fontSize: isCancelled || isImportSuccessful || isUploadInProcess ? '12px' : '11px',
        color: isCancelled ? '#dc2626' : isImportSuccessful ? '#15803d' : isUploadInProcess ? '#ea580c' : undefined,
        fontWeight: isCancelled || isImportSuccessful || isUploadInProcess ? 700 : undefined
      }}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {statusName || statusCode}
    </span>
  )
}
