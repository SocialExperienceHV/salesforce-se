'use client'

import { CreditCard } from 'lucide-react'

export default function TarjetaCredito() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
          Tarjeta Crédito
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
          Gestión y control de gastos con tarjeta de crédito corporativa.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CreditCard style={{ width: 32, height: 32, color: '#D97706' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Módulo en construcción</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '6px 0 0' }}>
            Próximamente podrás registrar y controlar los gastos con tarjeta de crédito corporativa.
          </p>
        </div>
      </div>
    </div>
  )
}
