'use client'

import { useStore } from '@/lib/store'
import { useMemo, useState } from 'react'
import { DollarSign, CreditCard, ChevronsUpDown } from 'lucide-react'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function labelMes(iso: string) {
  if (iso === 'Todos') return 'Todos'
  const [y, m] = iso.split('-')
  return `${MESES_ES[parseInt(m, 10) - 1]} ${y}`
}

const fmt = (n: number) =>
  '$ ' + Math.round(n).toLocaleString('es-CO')

const pct = (num: number, den: number) =>
  den > 0 ? ((num / den) * 100).toFixed(1) + '%' : '—'

const sel: React.CSSProperties = {
  height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 8,
  fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
}

export default function ReporteLegalizaciones() {
  const { proyectos, legalizaciones, documentosTC } = useStore()

  const [filtroCliente, setFiltroCliente] = useState('Todos')
  const [filtroProductor, setFiltroProductor] = useState('Todos')
  const [filtroMes, setFiltroMes] = useState('Todos')
  const [sortCol, setSortCol] = useState<'proyecto' | 'cliente' | 'cc' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: 'proyecto' | 'cliente' | 'cc') {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Opciones para filtros
  const clientes = useMemo(() => {
    const set = new Set(proyectos.filter(p => p.estadoComercial === 'Vendido' && p.centroCosto).map(p => p.cliente))
    return ['Todos', ...Array.from(set).sort()]
  }, [proyectos])

  const productores = useMemo(() => {
    const set = new Set(legalizaciones.map(l => l.responsable).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [legalizaciones])

  const meses = useMemo(() => {
    const set = new Set(legalizaciones.map(l => l.fecha?.slice(0, 7)).filter(Boolean))
    return ['Todos', ...Array.from(set).sort().reverse()]
  }, [legalizaciones])

  const filas = useMemo(() => {
    const vendidos = proyectos.filter(p =>
      p.estadoComercial === 'Vendido' &&
      p.centroCosto &&
      (filtroCliente === 'Todos' || p.cliente === filtroCliente)
    )

    return vendidos.map(p => {
      let legsProyecto = legalizaciones.filter(l =>
        l.gastos.some(g => g.centroCosto === p.centroCosto)
      )

      if (filtroProductor !== 'Todos') {
        legsProyecto = legsProyecto.filter(l => l.responsable === filtroProductor)
      }

      if (filtroMes !== 'Todos') {
        legsProyecto = legsProyecto.filter(l => l.fecha?.startsWith(filtroMes))
      }

      const anticipos = legsProyecto.reduce((sum, l) =>
        sum + l.gastos
          .filter(g => g.centroCosto === p.centroCosto && (g.tipoFactura === 'FE' || !g.tipoFactura))
          .reduce((s, g) => s + g.total, 0)
      , 0)

      const cuentasCobro = legsProyecto.reduce((sum, l) =>
        sum + l.gastos
          .filter(g => g.centroCosto === p.centroCosto && g.tipoFactura === 'Cuenta de cobro')
          .reduce((s, g) => s + g.total, 0)
      , 0)

      const montoReal = p.montoRealVendido ?? p.monto

      // TC: sumar ítems del módulo Tarjeta Crédito con ese CC
      const tcItems = documentosTC.flatMap(d => d.items.filter(i => i.centroCosto === p.centroCosto))
      const tarjetaCredito = tcItems.reduce((s, i) => s + i.monto, 0)

      return {
        id: p.id,
        centroCosto: p.centroCosto!,
        proyecto: p.nombre,
        cliente: p.cliente,
        montoReal,
        anticipos,
        anticiposPct: montoReal > 0 ? (anticipos / montoReal) * 100 : 0,
        cuentasCobro,
        cuentasCobroPct: montoReal > 0 ? (cuentasCobro / montoReal) * 100 : 0,
        tarjetaCredito,
        tcPct: montoReal > 0 ? (tarjetaCredito / montoReal) * 100 : 0,
      }
    }).filter(f => f.anticipos > 0 || f.cuentasCobro > 0 || f.tarjetaCredito > 0)
  }, [proyectos, legalizaciones, documentosTC, filtroCliente, filtroProductor, filtroMes])

  const filasOrdenadas = useMemo(() => {
    if (!sortCol) return filas
    return [...filas].sort((a, b) => {
      const va = sortCol === 'proyecto' ? a.proyecto : sortCol === 'cliente' ? a.cliente : (a.centroCosto ?? '')
      const vb = sortCol === 'proyecto' ? b.proyecto : sortCol === 'cliente' ? b.cliente : (b.centroCosto ?? '')
      return sortDir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
    })
  }, [filas, sortCol, sortDir])

  const totales = useMemo(() => ({
    montoReal: filas.reduce((s, f) => s + f.montoReal, 0),
    anticipos: filas.reduce((s, f) => s + f.anticipos, 0),
    cuentasCobro: filas.reduce((s, f) => s + f.cuentasCobro, 0),
    tarjetaCredito: filas.reduce((s, f) => s + f.tarjetaCredito, 0),
  }), [filas])

  const th: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6B7280',
    textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB',
    background: '#F9FAFB', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const thR: React.CSSProperties = { ...th, textAlign: 'right' }
  const td: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6',
  }
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontWeight: 600 }

  const pctBadge = (val: number, base: number) => {
    const p = base > 0 ? (val / base) * 100 : 0
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700,
        background: p > 80 ? '#FEF2F2' : p > 50 ? '#FFF7ED' : '#F0FDF4',
        color: p > 80 ? '#DC2626' : p > 50 ? '#C2410C' : '#15803D',
      }}>
        {pct(val, base)}
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
          Reporte Legalizaciones
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
          Resumen de gastos legalizados por proyecto vendido.
        </p>
      </div>

      {/* KPI cards — solo 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {([
          { label: 'Anticipos + Reembolsos', value: fmt(totales.anticipos), pctVal: totales.montoReal > 0 ? (totales.anticipos / totales.montoReal) * 100 : 0, icon: <DollarSign style={{ width: 20, height: 20, color: '#1D4ED8' }} />, color: '#EFF6FF', border: '#BFDBFE' },
          { label: 'Cuentas de Cobro', value: fmt(totales.cuentasCobro), pctVal: totales.montoReal > 0 ? (totales.cuentasCobro / totales.montoReal) * 100 : 0, icon: <CreditCard style={{ width: 20, height: 20, color: '#7C3AED' }} />, color: '#F5F3FF', border: '#DDD6FE' },
          { label: 'Tarjeta Crédito', value: fmt(totales.tarjetaCredito), pctVal: totales.montoReal > 0 ? (totales.tarjetaCredito / totales.montoReal) * 100 : 0, icon: <CreditCard style={{ width: 20, height: 20, color: '#D97706' }} />, color: '#FFFBEB', border: '#FDE68A' },
        ] as { label: string; value: string; pctVal: number; icon: React.ReactNode; color: string; border: string }[]).map(k => {
          const isRed = k.pctVal > 5
          const pctStr = k.pctVal >= 0 ? k.pctVal.toFixed(1) + '% del vendido' : ''
          return (
            <div key={k.label} style={{ background: k.color, border: `1px solid ${k.border}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
                {k.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 8 }}>{k.value}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: k.pctVal < 0 ? '#9CA3AF' : isRed ? '#DC2626' : '#15803D', marginTop: 4 }}>
                {pctStr}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Productor:</span>
          <select value={filtroProductor} onChange={e => setFiltroProductor(e.target.value)} style={sel}>
            {productores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Mes:</span>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={sel}>
            {meses.map(m => <option key={m} value={m}>{labelMes(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Cliente:</span>
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={sel}>
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(filtroProductor !== 'Todos' || filtroMes !== 'Todos' || filtroCliente !== 'Todos') && (
          <button onClick={() => { setFiltroProductor('Todos'); setFiltroMes('Todos'); setFiltroCliente('Todos') }}
            style={{ fontSize: 12, color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        )}
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {filas.length} proyecto{filas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {(['Centro Costo', 'Proyecto', 'Cliente'] as const).map(col => {
                const key = col === 'Centro Costo' ? 'cc' : col === 'Proyecto' ? 'proyecto' : 'cliente'
                const active = sortCol === key
                return (
                  <th key={col} style={th}>
                    <button onClick={() => toggleSort(key as 'proyecto' | 'cliente' | 'cc')}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: active ? '#1A56DB' : '#6B7280', padding: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {col}
                      <ChevronsUpDown style={{ width: 13, height: 13 }} />
                    </button>
                  </th>
                )
              })}
              <th style={thR}>Monto Vendido</th>
              <th style={thR}>Anticipos + Reembolsos</th>
              <th style={{ ...thR, minWidth: 80 }}>A+R %</th>
              <th style={thR}>Cuentas de Cobro</th>
              <th style={{ ...thR, minWidth: 80 }}>CC %</th>
              <th style={thR}>Tarjeta Crédito</th>
              <th style={{ ...thR, minWidth: 80 }}>TC %</th>
            </tr>
          </thead>
          <tbody>
            {filasOrdenadas.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                  No hay proyectos vendidos con los filtros seleccionados.
                </td>
              </tr>
            ) : filasOrdenadas.map(f => (
              <tr key={f.id}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <td style={td}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 7px', borderRadius: 5, border: '1px solid #BFDBFE' }}>
                    {f.centroCosto}
                  </span>
                </td>
                <td style={{ ...td, maxWidth: 240 }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{f.proyecto}</span>
                </td>
                <td style={{ ...td, color: '#6B7280' }}>{f.cliente}</td>
                <td style={{ ...tdR, color: '#6B7280', fontWeight: 400 }}>{fmt(f.montoReal)}</td>
                <td style={tdR}>{f.anticipos > 0 ? fmt(f.anticipos) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>$ 0</span>}</td>
                <td style={tdR}>{f.anticipos > 0 ? pctBadge(f.anticipos, f.montoReal) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>—</span>}</td>
                <td style={tdR}>{f.cuentasCobro > 0 ? fmt(f.cuentasCobro) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>$ 0</span>}</td>
                <td style={tdR}>{f.cuentasCobro > 0 ? pctBadge(f.cuentasCobro, f.montoReal) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>—</span>}</td>
                <td style={tdR}>{f.tarjetaCredito > 0 ? fmt(f.tarjetaCredito) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>$ 0</span>}</td>
                <td style={tdR}>{f.tarjetaCredito > 0 ? pctBadge(f.tarjetaCredito, f.montoReal) : <span style={{ color: '#D1D5DB', fontWeight: 400 }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
          {filas.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                <td colSpan={3} style={{ ...td, fontWeight: 700, color: '#111827' }}>
                  TOTALES — {filas.length} proyecto{filas.length !== 1 ? 's' : ''}
                </td>
                <td style={{ ...tdR, color: '#D1D5DB', fontWeight: 400 }}>—</td>
                <td style={{ ...tdR, fontWeight: 800, fontSize: 14, color: '#1D4ED8' }}>{fmt(totales.anticipos)}</td>
                <td style={tdR}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}>
                    {pct(totales.anticipos, totales.montoReal)}
                  </span>
                </td>
                <td style={{ ...tdR, fontWeight: 800, fontSize: 14, color: '#7C3AED' }}>{fmt(totales.cuentasCobro)}</td>
                <td style={tdR}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: '#F5F3FF', color: '#7C3AED', fontWeight: 700 }}>
                    {pct(totales.cuentasCobro, totales.montoReal)}
                  </span>
                </td>
                <td style={{ ...tdR, fontWeight: 800, fontSize: 14, color: '#D97706' }}>{fmt(totales.tarjetaCredito)}</td>
                <td style={tdR}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, background: '#FFFBEB', color: '#D97706', fontWeight: 700 }}>
                    {pct(totales.tarjetaCredito, totales.montoReal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12 }}>
        Solo proyectos con estado &quot;Vendido&quot; y centro de costo asignado. % calculado sobre el monto real vendido.
      </p>
    </div>
  )
}
