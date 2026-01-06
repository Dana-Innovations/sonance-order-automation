'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ClipboardList, BarChart3 } from 'lucide-react'

const navigation = [
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Reports', href: '/reports/tracking', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside 
      className="hidden md:flex md:flex-col w-64 border-r border-[#2a353d]"
      style={{ backgroundColor: '#333F48' }}
    >
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#00A3E1] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-white' : 'text-white/50'
              )} />
              <span className="uppercase tracking-wide text-xs">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a353d]">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          © {new Date().getFullYear()} Sonance
        </p>
      </div>
    </aside>
  )
}
