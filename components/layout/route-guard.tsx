'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { tieneAcceso } from '@/lib/permisos'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser } = useStore()

  useEffect(() => {
    if (!currentUser) return
    if (!tieneAcceso(currentUser.permiso, pathname)) {
      router.replace('/sin-acceso')
    }
  }, [pathname, currentUser, router])

  if (!currentUser) return null
  if (!tieneAcceso(currentUser.permiso, pathname)) return null

  return <>{children}</>
}
