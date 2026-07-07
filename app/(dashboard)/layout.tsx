'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { RouteGuard } from '@/components/layout/route-guard'
import { useStore } from '@/lib/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, ready } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (ready && currentUser === null) router.replace('/login')
  }, [ready, currentUser, router])

  if (!ready || !currentUser) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F9FAFB' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto" style={{ background: '#F9FAFB' }}>
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>
    </div>
  )
}
