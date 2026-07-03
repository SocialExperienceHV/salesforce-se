'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, HelpCircle, Search, ChevronDown } from 'lucide-react'

const breadcrumbs: Record<string, { parent?: string; parentHref?: string; label: string }> = {
  '/dashboard':       { label: 'Dashboard' },
  '/clientes':        { label: 'Clientes' },
  '/proyectos':       { label: 'Proyectos' },
  '/proyectos/nuevo': { parent: 'Proyectos', parentHref: '/proyectos', label: 'Nuevo proyecto' },
  '/seguimiento':     { parent: 'Proyectos', parentHref: '/proyectos', label: 'Seguimiento' },
  '/trafico':         { parent: 'Operación', label: 'Tráfico' },
  '/calendar':        { parent: 'Operación', label: 'Calendar' },
  '/plan-trabajo':    { parent: 'Operación', label: 'Plan de trabajo' },
  '/personas':        { parent: 'Equipo', label: 'Personas' },
  '/prospeccion':     { label: 'Prospección Comercial' },
  '/reportes':        { label: 'Reportes' },
  '/administracion':  { label: 'Administración' },
}

export function Topbar() {
  const pathname = usePathname()
  const crumb = breadcrumbs[pathname] ?? { label: '' }

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
            placeholder="Buscar en Calendar 2.0..."
            style={{
              width: '100%', height: 36, paddingLeft: 38, paddingRight: 16,
              fontSize: 13, background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 8, outline: 'none', color: '#111827'
            }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto">
        <button style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#6B7280', position: 'relative' }}
          className="hover:bg-gray-50">
          <Bell style={{ width: 20, height: 20 }} />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#EF4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
        </button>
        <button style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#6B7280' }}
          className="hover:bg-gray-50">
          <HelpCircle style={{ width: 20, height: 20 }} />
        </button>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 ml-1">
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>JC</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Juan Camilo</span>
          <ChevronDown style={{ width: 14, height: 14, color: '#9CA3AF' }} />
        </div>
      </div>
    </header>
  )
}
