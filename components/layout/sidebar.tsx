'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, Search,
  FolderOpen, TrendingUp, Layers, Calendar,
  List, BarChart3, Settings, ChevronLeft, Wallet, Receipt, CreditCard, FileSpreadsheet, ClipboardCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { tieneAcceso } from '@/lib/permisos'

const ALL_NAV = [
  { href: '/clientes',        label: 'Clientes',               icon: Building2 },
  { href: '/proyectos',       label: 'Proyectos',              icon: FolderOpen },
  { href: '/seguimiento',     label: 'Seguimiento',            icon: TrendingUp },
  { href: '/ppto',            label: 'PPTO',                   icon: FileSpreadsheet },
  { href: '/real-ejecutado',  label: 'Real Ejecutado',         icon: ClipboardCheck },
  { href: '/trafico',         label: 'Tráfico',                icon: Layers },
  { href: '/plan-trabajo',    label: 'Plan de trabajo',        icon: List },
  { href: '/calendar',        label: 'Calendar',               icon: Calendar },
  { href: '/personas',        label: 'Equipo',                 icon: Users },
  { href: '/nomina',          label: 'Nómina',                 icon: Wallet },
  { href: '/prospeccion',     label: 'Prospección',            icon: Search },
  { href: '/legalizaciones',  label: 'Legalizaciones',         icon: Receipt },
  { href: '/tarjeta-credito', label: 'Tarjeta Crédito',        icon: CreditCard },
  { href: '/reportes',        label: 'Reporte Legalizaciones', icon: BarChart3 },
  { href: '/dashboard',       label: 'Dashboard',              icon: LayoutDashboard },
  { href: '/administracion',  label: 'Administración',         icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentUser } = useStore()
  const rol = currentUser?.permiso
  const navItems = ALL_NAV.filter(item => tieneAcceso(rol, item.href))

  return (
    <aside style={{ width: 192, minHeight: '100vh', background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #E5E7EB' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: '#1A56DB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar style={{ width: 16, height: 16, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
            Salesforce <span style={{ color: '#1A56DB' }}>SE</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/proyectos' && pathname.startsWith(href + '/')) || (href === '/proyectos' && pathname === '/proyectos')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: active ? 500 : 400,
                color: active ? '#1A56DB' : '#6B7280',
                background: active ? '#EFF6FF' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              className={cn(!active && 'hover:bg-gray-50 hover:text-gray-800')}
            >
              <Icon style={{ width: 17, height: 17, flexShrink: 0, color: active ? '#1A56DB' : '#9CA3AF' }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #E5E7EB' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF', padding: '6px 10px', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          className="hover:text-gray-500">
          <ChevronLeft style={{ width: 15, height: 15 }} />
          Colapsar menú
        </button>
      </div>
    </aside>
  )
}
