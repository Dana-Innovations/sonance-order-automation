import { cn } from '@/lib/utils'

// Sonance-aligned status colors with subtle borders
const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  '01': { // Pending
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400'
  },
  '02': { // Under Review
    bg: 'bg-sky-50',
    text: 'text-[#00A3E1]',
    border: 'border-sky-200',
    dot: 'bg-[#00A3E1]'
  },
  '03': { // Validated
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  '04': { // Exported
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500'
  },
  '05': { // ERP Processed
    bg: 'bg-[#333F48]/5',
    text: 'text-[#333F48]',
    border: 'border-[#333F48]/20',
    dot: 'bg-[#333F48]'
  },
  '06': { // Cancelled
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500'
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium',
        style.bg,
        style.text,
        style.border
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {statusName || statusCode}
    </span>
  )
}
