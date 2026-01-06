'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export function AuditLogModal({
  orderId,
  onClose,
}: {
  orderId: string
  onClose: () => void
}) {
  const supabase = createClient()

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-log', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Note: User email fetching requires admin access
      // For now, we'll just return the logs with user_id
      // In production, you might want to create a view or function that joins with auth.users
      return (data || []).map((log: any) => ({
        ...log,
        user_email: log.user_id ? `User ${log.user_id.substring(0, 8)}...` : 'System',
      }))
    },
  })

  const handleExport = () => {
    if (!auditLogs) return

    const csv = [
      ['Timestamp', 'User', 'Action Type', 'Field', 'Old Value', 'New Value', 'Reason'].join(','),
      ...auditLogs.map((log: any) =>
        [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.user_email || 'Unknown',
          log.action_type,
          log.field_name || '',
          log.old_value || '',
          log.new_value || '',
          log.reason || '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${orderId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg border border-border bg-card shadow-lg flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">Audit Log</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading audit log...</div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="border border-border rounded-md p-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {log.action_type}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    User: {log.user_email || 'Unknown'}
                  </div>
                  {log.field_name && (
                    <div className="text-sm text-foreground mt-2">
                      <span className="font-medium">Field:</span> {log.field_name}
                    </div>
                  )}
                  {(log.old_value || log.new_value) && (
                    <div className="text-sm text-foreground mt-2">
                      <span className="font-medium">Change:</span>{' '}
                      <span className="text-red-600 line-through">{log.old_value || 'N/A'}</span>
                      {' → '}
                      <span className="text-green-600">{log.new_value || 'N/A'}</span>
                    </div>
                  )}
                  {log.reason && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Reason:</span> {log.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No audit log entries found</div>
          )}
        </div>
      </div>
    </div>
  )
}

