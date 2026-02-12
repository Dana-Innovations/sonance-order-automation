import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Providers } from '@/app/providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const disableAuth = process.env.DISABLE_AUTH === 'true'

  let user

  if (disableAuth) {
    // Mock user for development when auth is disabled
    user = {
      id: 'dev-user',
      email: 'dev@sonance.com',
    } as any
  } else {
    // Normal authentication flow
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      redirect('/login')
    }

    user = authUser
  }

  return (
    <Providers>
      <ErrorBoundary>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header user={user} />
            <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F5F5F5', padding: '0px 12px', paddingTop: '0px' }}>
              {children}
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </Providers>
  )
}

