'use client'

import { ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SinAcceso() {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldOff style={{ width: 30, height: 30, color: '#DC2626' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
          Acceso restringido
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
          No tienes permisos para ver este módulo. Contacta a tu administrador si crees que esto es un error.
        </p>
        <button onClick={() => router.back()}
          style={{ padding: '8px 20px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    </div>
  )
}
