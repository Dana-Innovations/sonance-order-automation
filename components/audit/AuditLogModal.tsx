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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '900px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
        {/* Header */}
        <div className="border-b border-gray-300 flex items-center justify-between" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '32px', paddingRight: '32px' }}>
          <h2 className="font-semibold" style={{ color: '#666', fontSize: '14px' }}>Audit Log</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '4px',
                paddingBottom: '4px',
                fontSize: '9px',
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
              Export CSV
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'white', padding: '32px' }}>
          {isLoading ? (
            <div className="text-center" style={{ color: '#666', fontSize: '12px' }}>Loading audit log...</div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="border border-gray-300 rounded-md p-4"
                  style={{ backgroundColor: '#f9fafb' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ fontSize: '12px', color: '#333' }}>
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-medium" style={{ fontSize: '10px', color: '#1e40af' }}>
                      {log.action_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    User: {log.user_email || 'Unknown'}
                  </div>
                  {log.field_name && (
                    <div style={{ fontSize: '11px', color: '#333', marginTop: '8px' }}>
                      <span className="font-medium">Field:</span> {log.field_name}
                    </div>
                  )}
                  {(log.old_value || log.new_value) && (
                    <div style={{ fontSize: '11px', color: '#333', marginTop: '8px' }}>
                      <span className="font-medium">Change:</span>{' '}
                      <span className="line-through" style={{ color: '#dc2626' }}>{log.old_value || 'N/A'}</span>
                      {' → '}
                      <span style={{ color: '#059669' }}>{log.new_value || 'N/A'}</span>
                    </div>
                  )}
                  {log.reason && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                      <span className="font-medium">Reason:</span> {log.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center" style={{ color: '#666', fontSize: '12px' }}>No audit log entries found</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 flex justify-center" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px' }}>
          <button
            onClick={onClose}
            className="font-medium transition-colors"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '6px',
              paddingBottom: '6px',
              fontSize: '9px',
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

