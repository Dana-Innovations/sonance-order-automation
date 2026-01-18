'use client'

import Link from 'next/link'
import { Tables } from '@/lib/types/database'
import { format } from 'date-fns'

type CSR = Tables<'csrs'>

export function CSRsTable({ csrs }: { csrs: CSR[] }) {

  return (
    <div className="rounded-md shadow-sm border border-gray-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#D9D9D6]" style={{ backgroundColor: '#F5F5F5' }}>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Email
            </th>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Name
            </th>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Status
            </th>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Slack ID
            </th>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Teams ID
            </th>
            <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Updated
            </th>
            <th className="px-4 py-4 text-right font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '13px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D9D9D6]">
          {csrs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#6b7a85]">
                No CSRs found
              </td>
            </tr>
          ) : (
            csrs.map((csr) => (
              <tr key={csr.email} className="bg-white hover:bg-[#F5F5F5]/50 transition-colors">
                <td className="px-4 text-[#333F48] font-medium" style={{ fontSize: '15px', paddingTop: '10px', paddingBottom: '10px' }}>
                  {csr.email}
                </td>
                <td className="px-4 text-[#333F48]" style={{ fontSize: '15px', paddingTop: '10px', paddingBottom: '10px' }}>
                  {csr.first_name} {csr.last_name}
                </td>
                <td className="px-4" style={{ fontSize: '15px', paddingTop: '10px', paddingBottom: '10px', color: csr.is_active ? '#333F48' : '#DC2626' }}>
                  {csr.is_active ? 'Active' : 'Inactive'}
                </td>
                <td className="px-4 text-[#6b7a85]" style={{ fontSize: '15px', paddingTop: '10px', paddingBottom: '10px' }}>
                  {csr.slack_id || 'N/A'}
                </td>
                <td className="px-4 text-[#6b7a85]" style={{ fontSize: '15px', paddingTop: '10px', paddingBottom: '10px' }}>
                  {csr.teams_id || 'N/A'}
                </td>
                <td className="px-4 text-[#6b7a85]" style={{ fontSize: '14px', paddingTop: '10px', paddingBottom: '10px' }}>
                  {csr.updated_at ? format(new Date(csr.updated_at), 'MMM d, yyyy') : 'N/A'}
                </td>
                <td className="px-4 text-right" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <Link
                    href={`/settings/csrs/${encodeURIComponent(csr.email)}/edit`}
                    className="inline-flex items-center py-1.5 text-xs font-medium transition-colors no-underline"
                    style={{
                      border: '1px solid #00A3E1',
                      borderRadius: '20px',
                      backgroundColor: 'white',
                      color: '#00A3E1',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      textDecoration: 'none'
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
                    Edit
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
