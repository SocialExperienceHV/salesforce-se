'use client'

import { useState } from 'react'
import { Users, Crown, Building2, UserCheck, Plus, Search, MoreHorizontal } from 'lucide-react'

const personas = [
  { id: 1, nombre: 'Felipe Aguilón', correo: 'felipe.agullon@agency.com', area: 'Comercial / KAM', rol: 'KAM', lider: 'Hans Vargas', permiso: 'Super admin', costo: 7500000, estado: 'Activo' },
  { id: 2, nombre: 'Hans Vargas', correo: 'hans.vargas@agency.com', area: 'Comercial / KAM', rol: 'KAM', lider: '—', permiso: 'Super admin', costo: 9600000, estado: 'Activo' },
  { id: 3, nombre: 'Iván Londoño', correo: 'ivan.londono@agency.com', area: 'Comercial / KAM', rol: 'KAM', lider: 'Hans Vargas', permiso: 'Comercial', costo: 7200000, estado: 'Activo' },
  { id: 4, nombre: 'Francisco Cárdenas', correo: 'francisco.cardenas@agency.com', area: 'Producción', rol: 'Director de producción', lider: 'Hans Vargas', permiso: 'Líder', costo: 8500000, estado: 'Activo' },
  { id: 5, nombre: 'Andrés Arellano', correo: 'andres.arellano@agency.com', area: 'Producción', rol: 'Productor senior', lider: 'Francisco Cárdenas', permiso: 'Usuario', costo: 6600000, estado: 'Activo' },
  { id: 6, nombre: 'Carlos Bustamante', correo: 'carlos.bustamante@agency.com', area: 'Producción', rol: 'Productor senior', lider: 'Francisco Cárdenas', permiso: 'Usuario', costo: 6400000, estado: 'Activo' },
  { id: 7, nombre: 'Manuel Parra', correo: 'manuel.parra@agency.com', area: 'Producción', rol: 'Coordinador', lider: 'Francisco Cárdenas', permiso: 'Usuario', costo: 4800000, estado: 'Activo' },
  { id: 8, nombre: 'Santiago González', correo: 'santiago.gonzalez@agency.com', area: 'Creatividad', rol: 'Líder creativo', lider: 'Hans Vargas', permiso: 'Líder', costo: 7800000, estado: 'Activo' },
  { id: 9, nombre: 'Nicola Aranza', correo: 'nicola.aranza@agency.com', area: 'Creatividad', rol: 'Copy creativa', lider: 'Santiago González', permiso: 'Usuario', costo: 4500000, estado: 'Activo' },
  { id: 10, nombre: 'Nicolás Suárez', correo: 'nicolas.suarez@agency.com', area: 'Audiovisual', rol: 'Audiovisual', lider: 'Santiago González', permiso: 'Usuario', costo: 5200000, estado: 'Activo' },
  { id: 11, nombre: 'Luisa Navarro', correo: 'luisa.navarro@agency.com', area: 'Diseño gráfico', rol: 'Líder gráfica', lider: 'Hans Vargas', permiso: 'Líder', costo: 7000000, estado: 'Activo' },
  { id: 12, nombre: 'Álvaro', correo: 'alvaro@agency.com', area: 'Diseño gráfico', rol: 'Diseñador gráfico', lider: 'Luisa Navarro', permiso: 'Usuario', costo: 4200000, estado: 'Activo' },
  { id: 13, nombre: 'Kate', correo: 'kate@agency.com', area: 'Diseño gráfico', rol: 'Diseñadora gráfica', lider: 'Luisa Navarro', permiso: 'Usuario', costo: 4200000, estado: 'Activo' },
  { id: 14, nombre: 'Jonathan Ramírez', correo: 'jonathan.ramirez@agency.com', area: 'Diseño industrial', rol: 'Líder industrial', lider: 'Hans Vargas', permiso: 'Líder', costo: 7000000, estado: 'Activo' },
  { id: 15, nombre: 'Juan Vargas', correo: 'juan.vargas@agency.com', area: 'Administración', rol: 'Administración', lider: 'Hans Vargas', permiso: 'Administración', costo: 5000000, estado: 'Activo' },
]

const areas = ['Todas', 'Comercial / KAM', 'Producción', 'Creatividad', 'Audiovisual', 'Diseño gráfico', 'Diseño industrial', 'Administración']
const roles = ['Todos', 'KAM', 'Director de producción', 'Productor senior', 'Coordinador', 'Líder creativo', 'Copy creativa', 'Audiovisual', 'Líder gráfica', 'Diseñador gráfico', 'Diseñadora gráfica', 'Líder industrial', 'Administración']
const lideres = ['Todos', 'Hans Vargas', 'Francisco Cárdenas', 'Santiago González', 'Luisa Navarro', 'Jonathan Ramírez']
const estadosFiltro = ['Activos', 'Inactivos', 'Todos']

const permisoStyle: Record<string, string> = {
  'Super admin':    'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]',
  'Líder':          'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
  'Comercial':      'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
  'Usuario':        'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]',
  'Administración': 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatCOP(value: number) {
  return `$ ${value.toLocaleString('es-CO')}`
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-[#6B7280] font-medium">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-3 pr-8 text-[13px] bg-white border border-[#E5E7EB] rounded-lg text-[#111827] outline-none focus:border-[#1A56DB] cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function PersonasPage() {
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('Todas')
  const [rol, setRol] = useState('Todos')
  const [lider, setLider] = useState('Todos')
  const [estado, setEstado] = useState('Activos')

  const filtered = personas.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.correo.toLowerCase().includes(search.toLowerCase())
    const matchArea = area === 'Todas' || p.area === area
    const matchRol = rol === 'Todos' || p.rol === rol
    const matchLider = lider === 'Todos' || p.lider === lider
    const matchEstado = estado === 'Todos' || p.estado === estado
    return matchSearch && matchArea && matchRol && matchLider && matchEstado
  })

  const totalLideres = personas.filter(p => ['Líder', 'Super admin'].includes(p.permiso)).length
  const totalAreas = [...new Set(personas.map(p => p.area))].length
  const totalActivos = personas.filter(p => p.estado === 'Activo').length

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[#111827] leading-tight">Personas / Equipo</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Administra los perfiles, áreas, líderes y permisos para organizar el tráfico y asignar proyectos por equipo.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1648C2] text-white text-[13px] font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo empleado
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total personas', value: personas.length, icon: Users, bg: '#F5F3FF', iconColor: '#7C3AED' },
          { label: 'Líderes', value: totalLideres, icon: Crown, bg: '#FFFBEB', iconColor: '#D97706' },
          { label: 'Áreas activas', value: totalAreas, icon: Building2, bg: '#EFF6FF', iconColor: '#1A56DB' },
          { label: 'Usuarios activos', value: totalActivos, icon: UserCheck, bg: '#F0FDF4', iconColor: '#16A34A' },
        ].map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-xl flex items-center gap-3" style={{ padding: '14px 16px' }}>
            <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: bg }}>
              <Icon style={{ width: 19, height: 19, color: iconColor }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <SelectFilter label="Área" value={area} onChange={setArea} options={areas} />
        <SelectFilter label="Rol" value={rol} onChange={setRol} options={roles} />
        <SelectFilter label="Líder" value={lider} onChange={setLider} options={lideres} />
        <SelectFilter label="Estado" value={estado} onChange={setEstado} options={estadosFiltro} />
        <div className="ml-auto flex flex-col gap-1">
          <label className="text-[11px] text-transparent">_</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              placeholder="Buscar persona..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 pr-4 w-56 text-[13px] bg-white border border-[#E5E7EB] rounded-lg outline-none focus:border-[#1A56DB] placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8EAED] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8EAED] bg-[#F9FAFB]">
              {['Nombre', 'Correo', 'Área', 'Rol', 'Líder', 'Permiso', 'Costo mensual', 'Estado', 'Acción'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[12px] font-semibold text-[#6B7280] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-semibold text-[#1D4ED8]">{initials(p.nombre)}</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#111827]">{p.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#6B7280]">{p.correo}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151]">{p.area}</td>
                <td className="px-4 py-3 text-[13px] text-[#374151]">{p.rol}</td>
                <td className="px-4 py-3 text-[13px] text-[#6B7280]">{p.lider}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium ${permisoStyle[p.permiso]}`}>
                    {p.permiso}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] font-semibold text-[#111827]">{formatCOP(p.costo)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-[13px] text-[#1A56DB] font-medium hover:underline">Ver detalle</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6B7280]">Mostrando 1 a {filtered.length} de {filtered.length} personas</p>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]">‹</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A56DB] text-white text-[13px] font-medium">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]">›</button>
        </div>
      </div>
    </div>
  )
}
