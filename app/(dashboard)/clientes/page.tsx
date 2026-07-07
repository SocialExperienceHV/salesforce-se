'use client'

import { useState, useRef, useMemo } from 'react'
import { Building2, Layers, Plus, Search, MoreHorizontal, ChevronRight, X, Upload, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import type { Cliente, ContactoCliente } from '@/lib/store'

const EJECUTIVO_OPTIONS = ['Hans Vargas', 'María Torres', 'Laura Medina', 'David Ruiz', 'Juan Camilo', 'Felipe Aguilón', 'Iván Londoño']
const COLORES = ['#16a34a','#e53935','#2563eb','#f97316','#7c3aed','#dc2626','#0284c7','#ca8a04','#c62828','#059669','#d97706','#6366f1']
const ejecutivosFiltro = ['Todos', ...EJECUTIVO_OPTIONS]
const estadosFiltro = ['Todos', 'Activo', 'Inactivo']

function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Muestra logo si existe, si no el círculo con color e iniciales
function ClienteAvatar({ cliente, size = 32 }: { cliente: Pick<Cliente, 'nombre' | 'iniciales' | 'color' | 'logo'>; size?: number }) {
  if (cliente.logo) {
    return (
      <img src={cliente.logo} alt={cliente.nombre}
        style={{ width: size, height: size, borderRadius: size * 0.25, objectFit: 'contain', background: '#F9FAFB', border: '1px solid #E5E7EB', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: cliente.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.32, fontWeight: 700, color: '#fff' }}>{cliente.iniciales}</span>
    </div>
  )
}

// Campo de upload de logo
function LogoUploader({ logo, onChange }: { logo: string; onChange: (b64: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { if (e.target?.result) onChange(e.target.result as string) }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Logo del cliente <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span></Label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ height: 80, border: '2px dashed #E5E7EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', background: '#FAFAFA', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#1A56DB')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
      >
        {logo ? (
          <>
            <img src={logo} alt="logo" style={{ height: 52, maxWidth: 120, objectFit: 'contain', borderRadius: 6 }} />
            <div style={{ fontSize: 12, color: '#6B7280' }}>Clic para cambiar</div>
          </>
        ) : (
          <>
            <Upload style={{ width: 18, height: 18, color: '#9CA3AF' }} />
            <div>
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Subir logo</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>PNG, JPG, SVG · arrastra o haz clic</div>
            </div>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ─── Modal nuevo cliente ────────────────────────────────────────────────────────
type AreaEntry = { nombre: string; personas: { nombre: string; email: string; telefono: string }[] }

function NuevoClienteModal({ onClose, onSave, kams }: {
  onClose: () => void
  onSave: (data: Omit<Cliente, 'id' | 'createdAt'>) => void
  kams: string[]
}) {
  const [nombre, setNombre] = useState('')
  const [ejecutivo, setEjecutivo] = useState('')
  const [color, setColor] = useState(COLORES[0])
  const [logo, setLogo] = useState('')
  const [areaInput, setAreaInput] = useState('')
  const [areas, setAreas] = useState<AreaEntry[]>([])
  const [personaForm, setPersonaForm] = useState<Record<string, { nombre: string; email: string; telefono: string }>>({})
  const [error, setError] = useState('')

  function addArea() {
    const v = areaInput.trim()
    if (!v || areas.find(a => a.nombre === v)) return
    setAreas([...areas, { nombre: v, personas: [] }])
    setAreaInput('')
  }

  function removeArea(nombre: string) {
    setAreas(areas.filter(a => a.nombre !== nombre))
  }

  function addPersona(areaNombre: string) {
    const form = personaForm[areaNombre] ?? { nombre: '', email: '', telefono: '' }
    if (!form.nombre.trim()) return
    setAreas(areas.map(a => a.nombre === areaNombre
      ? { ...a, personas: [...a.personas, { nombre: form.nombre.trim(), email: form.email.trim(), telefono: form.telefono.trim() }] }
      : a
    ))
    setPersonaForm(prev => ({ ...prev, [areaNombre]: { nombre: '', email: '', telefono: '' } }))
  }

  function removePersona(areaNombre: string, idx: number) {
    setAreas(areas.map(a => a.nombre === areaNombre
      ? { ...a, personas: a.personas.filter((_, i) => i !== idx) }
      : a
    ))
  }

  function handleSave() {
    if (!nombre.trim()) { setError('El nombre del cliente es obligatorio.'); return }
    if (!ejecutivo) { setError('Selecciona un ejecutivo KAM.'); return }
    const contactos: ContactoCliente[] = areas.map(a => ({ id: `c-${Date.now()}-${a.nombre}`, area: a.nombre, personas: a.personas }))
    onSave({ nombre: nombre.trim(), iniciales: getIniciales(nombre.trim()), color, logo: logo || undefined, ejecutivo, subclientes: areas.map(a => a.nombre), contactos, proyectos: 0, estado: 'Activo' })
  }

  const inp: React.CSSProperties = { height: 32, padding: '0 10px', fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6, outline: 'none', width: '100%', color: '#374151' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Nuevo cliente</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Nombre del cliente / empresa</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Coca-Cola Colombia" className="h-9 text-sm" />
          </div>

          <LogoUploader logo={logo} onChange={setLogo} />

          {!logo && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Color de identificación <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(se usa si no hay logo)</span></Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: color === c ? '3px solid #111827' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{nombre ? getIniciales(nombre) : 'CL'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">KAM responsable</Label>
            <Select value={ejecutivo} onValueChange={v => v && setEjecutivo(v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar KAM..." /></SelectTrigger>
              <SelectContent>{kams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Áreas / Marcas con contactos */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Áreas / Marcas y contactos <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span></Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={areaInput} onChange={e => setAreaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addArea()}
                placeholder="Ej. Banca Personas" className="h-9 text-sm flex-1" />
              <Button variant="outline" size="sm" className="h-9 px-3" onClick={addArea}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {areas.map(area => (
              <div key={area.nombre} style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                {/* Header área */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderBottom: area.personas.length > 0 || personaForm[area.nombre] !== undefined ? '1px solid #E5E7EB' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{area.nombre}</span>
                  <button onClick={() => removeArea(area.nombre)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', lineHeight: 1 }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>

                {/* Personas existentes */}
                {area.personas.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid #F3F4F6', fontSize: 12, color: '#374151' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#1A56DB' }}>{p.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 11 }}>{[p.email, p.telefono].filter(Boolean).join(' · ')}</div>
                    </div>
                    <button onClick={() => removePersona(area.nombre, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}

                {/* Formulario agregar persona */}
                <div style={{ padding: '10px 12px', background: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Agregar contacto</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={personaForm[area.nombre]?.nombre ?? ''}
                      onChange={e => setPersonaForm(prev => ({ ...prev, [area.nombre]: { ...prev[area.nombre] ?? { nombre: '', email: '', telefono: '' }, nombre: e.target.value } }))}
                      placeholder="Nombre *" style={inp} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={personaForm[area.nombre]?.email ?? ''}
                        onChange={e => setPersonaForm(prev => ({ ...prev, [area.nombre]: { ...prev[area.nombre] ?? { nombre: '', email: '', telefono: '' }, email: e.target.value } }))}
                        placeholder="Correo" style={{ ...inp, flex: 1 }} />
                      <input value={personaForm[area.nombre]?.telefono ?? ''}
                        onChange={e => setPersonaForm(prev => ({ ...prev, [area.nombre]: { ...prev[area.nombre] ?? { nombre: '', email: '', telefono: '' }, telefono: e.target.value } }))}
                        placeholder="Teléfono" style={{ ...inp, flex: 1 }} />
                    </div>
                    <button onClick={() => addPersona(area.nombre)}
                      style={{ alignSelf: 'flex-start', height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500, background: '#EFF6FF', color: '#1A56DB', border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer' }}>
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{error}</p>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6">Guardar cliente</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel contactos del cliente ───────────────────────────────────────────────
function ContactosPanel({ cliente, onClose, onSave }: {
  cliente: Cliente
  onClose: () => void
  onSave: (contactos: ContactoCliente[]) => void
}) {
  const [contactos, setContactos] = useState<ContactoCliente[]>(cliente.contactos ?? [])
  const [newArea, setNewArea] = useState('')
  const [formPersona, setFormPersona] = useState<{ areaId: string; nombre: string; email: string; telefono: string } | null>(null)

  function addArea() {
    const a = newArea.trim()
    if (!a) return
    setContactos(prev => [...prev, { id: `ct${Date.now()}`, area: a, personas: [] }])
    setNewArea('')
  }

  function removeArea(id: string) {
    setContactos(prev => prev.filter(c => c.id !== id))
  }

  function addPersona() {
    if (!formPersona || !formPersona.nombre.trim()) return
    setContactos(prev => prev.map(c =>
      c.id === formPersona.areaId
        ? { ...c, personas: [...c.personas, { nombre: formPersona.nombre, email: formPersona.email, telefono: formPersona.telefono }] }
        : c
    ))
    setFormPersona(null)
  }

  function removePersona(areaId: string, idx: number) {
    setContactos(prev => prev.map(c =>
      c.id === areaId ? { ...c, personas: c.personas.filter((_, i) => i !== idx) } : c
    ))
  }

  const inp: React.CSSProperties = { height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Contactos — {cliente.nombre}</span>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Empresa → Área → Personas de contacto</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Agregar área */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>Nueva área</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newArea} onChange={e => setNewArea(e.target.value)} onKeyDown={e => e.key === 'Enter' && addArea()}
                placeholder="Ej. Mercadeo, Brand, Trade..." style={{ ...inp, flex: 1 }} />
              <button onClick={addArea}
                style={{ height: 34, padding: '0 14px', background: '#1A56DB', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus style={{ width: 14, height: 14 }} /> Agregar área
              </button>
            </div>
          </div>

          {/* Lista de áreas y contactos */}
          {contactos.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
              Agrega un área para empezar a registrar contactos.
            </div>
          )}
          {contactos.map(ct => (
            <div key={ct.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header área */}
              <div style={{ background: '#F9FAFB', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{ct.area}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setFormPersona({ areaId: ct.id, nombre: '', email: '', telefono: '' })}
                    style={{ height: 28, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, color: '#374151', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus style={{ width: 12, height: 12 }} /> Persona
                  </button>
                  <button onClick={() => removeArea(ct.id)}
                    style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', borderRadius: 6 }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* Form nueva persona (inline) */}
              {formPersona?.areaId === ct.id && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', background: '#FAFEFF', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input value={formPersona.nombre} onChange={e => setFormPersona(f => f ? { ...f, nombre: e.target.value } : f)}
                      placeholder="Nombre *" style={inp} />
                    <input type="email" value={formPersona.email} onChange={e => setFormPersona(f => f ? { ...f, email: e.target.value } : f)}
                      placeholder="Correo" style={inp} />
                    <input value={formPersona.telefono} onChange={e => setFormPersona(f => f ? { ...f, telefono: e.target.value } : f)}
                      placeholder="Teléfono" style={inp} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addPersona}
                      style={{ height: 30, padding: '0 14px', background: '#059669', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                      Guardar persona
                    </button>
                    <button onClick={() => setFormPersona(null)}
                      style={{ height: 30, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, color: '#6B7280', background: '#fff', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Personas */}
              {ct.personas.length === 0 && !formPersona && (
                <div style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Sin contactos aún</div>
              )}
              {ct.personas.map((per, idx) => (
                <div key={idx} style={{ padding: '10px 16px', borderBottom: idx < ct.personas.length - 1 ? '1px solid #F3F4F6' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8' }}>{per.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span>
                    </div>
                    <div style={{ marginLeft: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{per.nombre}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{[per.email, per.telefono].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <button onClick={() => removePersona(ct.id, idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ height: 36, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => {
              let finalContactos = contactos
              if (formPersona && formPersona.nombre.trim()) {
                finalContactos = contactos.map(c =>
                  c.id === formPersona.areaId
                    ? { ...c, personas: [...c.personas, { nombre: formPersona.nombre, email: formPersona.email, telefono: formPersona.telefono }] }
                    : c
                )
              }
              onSave(finalContactos); onClose()
            }}
            style={{ height: 36, padding: '0 20px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
            Guardar contactos
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal editar cliente ───────────────────────────────────────────────────────
function EditarClienteModal({ cliente, onClose, onSave, kams }: {
  cliente: Cliente
  onClose: () => void
  onSave: (changes: Partial<Cliente>) => void
  kams: string[]
}) {
  const [nombre, setNombre] = useState(cliente.nombre)
  const [ejecutivo, setEjecutivo] = useState(cliente.ejecutivo)
  const [color, setColor] = useState(cliente.color)
  const [logo, setLogo] = useState(cliente.logo ?? '')
  const [subclienteInput, setSubclienteInput] = useState('')
  const [subclientes, setSubclientes] = useState<string[]>(cliente.subclientes)
  const [error, setError] = useState('')

  function addSubcliente() {
    const v = subclienteInput.trim()
    if (!v || subclientes.includes(v)) return
    setSubclientes([...subclientes, v])
    setSubclienteInput('')
  }

  function handleSave() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!ejecutivo) { setError('Selecciona un ejecutivo KAM.'); return }
    onSave({ nombre: nombre.trim(), iniciales: getIniciales(nombre.trim()), color, logo: logo || undefined, ejecutivo, subclientes })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Editar cliente</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Nombre del cliente / empresa</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} className="h-9 text-sm" />
          </div>

          <LogoUploader logo={logo} onChange={setLogo} />

          {!logo && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Color de identificación <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(se usa si no hay logo)</span></Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: color === c ? '3px solid #111827' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{getIniciales(nombre || cliente.nombre)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">KAM responsable</Label>
            <Select value={ejecutivo} onValueChange={v => v && setEjecutivo(v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{kams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Área / Marcas</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={subclienteInput} onChange={e => setSubclienteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubcliente()}
                placeholder="Agregar área..." className="h-9 text-sm flex-1" />
              <Button variant="outline" size="sm" className="h-9 px-3" onClick={addSubcliente}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {subclientes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {subclientes.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 12, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>
                    {s}
                    <button onClick={() => setSubclientes(subclientes.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{error}</p>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6">Guardar cambios</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, proyectos, personasStore } = useStore()
  const kams = useMemo(() => personasStore.filter(p => p.permiso === 'KAM' || p.cargo === 'KAM').map(p => p.nombre), [personasStore])
  const [search, setSearch] = useState('')
  const [ejecutivo, setEjecutivo] = useState('Todos')
  const [estado, setEstado] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [contactosCliente, setContactosCliente] = useState<Cliente | null>(null)
  const [sortAZ, setSortAZ] = useState(false)

  const filtered = clientes
    .filter(c => {
      const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase())
      const matchEjecutivo = ejecutivo === 'Todos' || c.ejecutivo === ejecutivo
      const matchEstado = estado === 'Todos' || c.estado === estado
      return matchSearch && matchEjecutivo && matchEstado
    })
    .sort((a, b) => sortAZ ? a.nombre.localeCompare(b.nombre, 'es') : 0)

  const totalSubclientes = clientes.reduce((sum, c) => sum + c.subclientes.length, 0)
  const totalProyectos = proyectos.length
  const proyectosPorCliente = (nombre: string) => proyectos.filter(p => p.cliente === nombre).length

  return (
    <div className="p-6 flex flex-col gap-5">
      {showModal && (
        <NuevoClienteModal
          onClose={() => setShowModal(false)}
          onSave={data => { addCliente(data); setShowModal(false) }}
          kams={kams}
        />
      )}
      {editando && (
        <EditarClienteModal
          cliente={editando}
          onClose={() => setEditando(null)}
          onSave={changes => { updateCliente(editando.id, changes); setEditando(null) }}
          kams={kams}
        />
      )}
      {contactosCliente && (
        <ContactosPanel
          cliente={contactosCliente}
          onClose={() => setContactosCliente(null)}
          onSave={contactos => { updateCliente(contactosCliente.id, { contactos, subclientes: contactos.map(c => c.area) }); setContactosCliente(null) }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las empresas, marcas y áreas de la agencia.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total clientes</div>
            <div className="text-2xl font-medium">{clientes.length}</div>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Áreas / Marcas</div>
            <div className="text-2xl font-medium">{totalSubclientes}</div>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Proyectos totales</div>
            <div className="text-2xl font-medium">{totalProyectos}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={ejecutivo} onValueChange={(v) => v && setEjecutivo(v)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Ejecutivo:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{ejecutivosFiltro.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={estado} onValueChange={(v) => v && setEstado(v)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Estado:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{estadosFiltro.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 w-56 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-medium">
                <button onClick={() => setSortAZ(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: sortAZ ? '#1A56DB' : '#6B7280', padding: 0 }}>
                  Cliente
                  <ChevronsUpDown style={{ width: 13, height: 13 }} />
                </button>
              </TableHead>
              <TableHead className="text-xs font-medium">Áreas / Marcas</TableHead>
              <TableHead className="text-xs font-medium">Ejecutivo KAM</TableHead>
              <TableHead className="text-xs font-medium text-center">Proyectos</TableHead>
              <TableHead className="text-xs font-medium">Estado</TableHead>
              <TableHead className="text-xs font-medium">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ClienteAvatar cliente={c} size={32} />
                    <span className="text-sm font-medium">{c.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.subclientes.length > 0 ? c.subclientes.map(s => (
                      <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">{s}</span>
                    )) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {c.ejecutivo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.ejecutivo}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm font-medium">{proyectosPorCliente(c.nombre)}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${c.estado === 'Activo' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {c.estado}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setContactosCliente(c)}>
                      Contactos <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditando(c)}>
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger style={{ background: 'none', border: 'none', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#6B7280' }}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditando(c)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const sub = prompt('Nombre del área:')
                          if (sub?.trim()) updateCliente(c.id, { subclientes: [...c.subclientes, sub.trim()] })
                        }}>Agregar área</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => updateCliente(c.id, { estado: c.estado === 'Activo' ? 'Inactivo' : 'Activo' })}
                        >
                          {c.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {clientes.length} clientes
      </div>
    </div>
  )
}
