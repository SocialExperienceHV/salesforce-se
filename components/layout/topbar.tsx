'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Search, LogOut, CheckCheck, FolderOpen, TrendingUp, UserCheck, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useState, useRef, useEffect } from 'react'
import type { Notificacion } from '@/lib/store'

const breadcrumbs: Record<string, { parent?: string; parentHref?: string; label: string }> = {
  '/dashboard':       { label: 'Dashboard' },
  '/clientes':        { label: 'Clientes' },
  '/proyectos':       { label: 'Proyectos' },
  '/proyectos/nuevo': { parent: 'Proyectos', parentHref: '/proyectos', label: 'Nuevo proyecto' },
  '/seguimiento':     { parent: 'Proyectos', parentHref: '/proyectos', label: 'Seguimiento' },
  '/ppto':            { parent: 'Proyectos', parentHref: '/proyectos', label: 'PPTO' },
  '/dashboard-comercial': { parent: 'Proyectos', parentHref: '/proyectos', label: 'Dashboard Comercial' },
  '/trafico':         { parent: 'Operación', label: 'Tráfico' },
  '/calendar':        { parent: 'Operación', label: 'Calendar' },
  '/plan-trabajo':    { parent: 'Operación', label: 'Plan de trabajo' },
  '/personas':        { parent: 'Equipo', label: 'Personas' },
  '/prospeccion':     { label: 'Prospección Comercial' },
  '/tarjeta-credito': { label: 'Tarjeta Crédito' },
  '/reportes':        { label: 'Reporte Legalizaciones' },
  '/administracion':  { label: 'Administración' },
}

function NotifIcon({ tipo }: { tipo: Notificacion['tipo'] }) {
  if (tipo === 'proyecto_nuevo') return <FolderOpen style={{ width: 15, height: 15, color: '#1A56DB' }} />
  if (tipo === 'proyecto_vendido') return <TrendingUp style={{ width: 15, height: 15, color: '#16a34a' }} />
  if (tipo === 'prospecto_nuevo') return <UserPlus style={{ width: 15, height: 15, color: '#7C3AED' }} />
  return <UserCheck style={{ width: 15, height: 15, color: '#D97706' }} />
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, setCurrentUser, notificaciones, marcarLeida, marcarTodasLeidas } = useStore()
  const crumb = breadcrumbs[pathname] ?? { label: '' }
  const [panelOpen, setPanelOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const misNotifs = notificaciones.filter(
    n => n.para === 'todos' || n.para === currentUser?.id
  )
  const noLeidas = misNotifs.filter(n => !n.leida).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function initiales(nombre: string) {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  function handleLogout() {
    setCurrentUser(null)
    router.push('/login')
  }

  return (
    <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}
      className="flex items-center gap-4 px-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5" style={{ fontSize: 14 }}>
        {crumb.parent && (
          <>
            {crumb.parentHref
              ? <Link href={crumb.parentHref} style={{ color: '#1A56DB', fontWeight: 500 }}>{crumb.parent}</Link>
              : <span style={{ color: '#1A56DB', fontWeight: 500 }}>{crumb.parent}</span>
            }
            <span style={{ color: '#D1D5DB', margin: '0 2px' }}>/</span>
          </>
        )}
        <span style={{ color: '#111827', fontWeight: 400 }}>{crumb.label}</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 360, marginLeft: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
          <input
            placeholder="Buscar en Salesforce SE..."
            style={{
              width: '100%', height: 36, paddingLeft: 38, paddingRight: 16,
              fontSize: 13, background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 8, outline: 'none', color: '#111827'
            }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto" style={{ position: 'relative' }}>
        <button ref={bellRef}
          onClick={() => setPanelOpen(v => !v)}
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#6B7280', position: 'relative' }}
          className="hover:bg-gray-50">
          <Bell style={{ width: 20, height: 20 }} />
          {noLeidas > 0 && (
            <span style={{ position: 'absolute', top: 7, right: 7, minWidth: 16, height: 16, background: '#EF4444', borderRadius: 8, border: '1.5px solid #fff', fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>

        {/* Panel notificaciones */}
        {panelOpen && (
          <div ref={panelRef} style={{ position: 'absolute', top: 44, right: 0, width: 360, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999 }}>
            {/* Header */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas}
                  style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCheck style={{ width: 13, height: 13 }} />
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {misNotifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No tienes notificaciones
                </div>
              ) : (
                misNotifs.map(n => (
                  <div key={n.id}
                    onClick={() => { marcarLeida(n.id); if (n.href) { router.push(n.href); setPanelOpen(false) } }}
                    style={{ padding: '11px 16px', borderBottom: '1px solid #F9FAFB', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: n.href ? 'pointer' : 'default', background: n.leida ? '#fff' : '#EFF6FF' }}
                    className={n.href ? 'hover:bg-blue-50' : ''}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: n.leida ? '#F3F4F6' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <NotifIcon tipo={n.tipo} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.leida ? 400 : 600, color: '#111827', marginBottom: 2 }}>{n.titulo}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{n.mensaje}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.leida && (
                      <div style={{ width: 8, height: 8, background: '#1A56DB', borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 ml-1">
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: currentUser?.foto ? 'transparent' : '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {currentUser?.foto
              ? <img src={currentUser.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{initiales(currentUser?.nombre ?? 'U')}</span>
            }
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{currentUser?.nombre?.split(' ')[0] ?? ''}</span>
          <button onClick={handleLogout} title="Cerrar sesión"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
            className="hover:bg-gray-100">
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </header>
  )
}
