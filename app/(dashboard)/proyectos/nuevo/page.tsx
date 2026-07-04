'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/lib/store'
const tiposProyecto = ['Evento 360', 'Logística', 'Activación', 'Experiencias', 'Convención', 'Escenografía/Feria', 'Técnica', 'Litografía', 'Digital', 'Estrategia', 'Otros']

const meses = [
  'Enero 2026', 'Febrero 2026', 'Marzo 2026', 'Abril 2026', 'Mayo 2026', 'Junio 2026',
  'Julio 2026', 'Agosto 2026', 'Septiembre 2026', 'Octubre 2026', 'Noviembre 2026', 'Diciembre 2026',
]

export default function NuevoProyectoPage() {
  const router = useRouter()
  const { addProyecto, clientes: clientesStore, personasStore } = useStore()

  // Solo personas del área Comercial (KAMs)
  const kams = personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre)
  const [cliente, setCliente] = useState('')
  const [subcliente, setSubcliente] = useState('')
  const [ejecutivo, setEjecutivo] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [fechaCreacion, setFechaCreacion] = useState(new Date().toISOString().split('T')[0])
  const [fechaPresentacion, setFechaPresentacion] = useState('')
  const [fechaEjecucion, setFechaEjecucion] = useState('')
  const [monto, setMonto] = useState('')
  const [mesEstimado, setMesEstimado] = useState('')
  const [error, setError] = useState('')

  const clienteSeleccionado = clientesStore.find(c => c.nombre === cliente)
  const subclientesDisponibles = clienteSeleccionado?.subclientes ?? []

  function handleClienteChange(val: string) {
    setCliente(val)
    setSubcliente('')
  }

  function handleGuardar() {
    if (!nombre.trim()) { setError('El nombre del proyecto es obligatorio.'); return }
    if (!cliente) { setError('Selecciona un cliente.'); return }
    if (!ejecutivo) { setError('Selecciona un ejecutivo.'); return }
    setError('')
    addProyecto({
      nombre: nombre.trim(),
      cliente,
      subcliente,
      ejecutivo,
      tipo,
      estado: 'Activo',
      prioridad: 'Medio',
      fechaInicio: fechaCreacion,
      fechaEntrega: fechaEjecucion,
      fechaPresentacion,
      monto: Number(monto) || 0,
      estadoComercial: 'En propuesta',
      descripcion: '',
    })
    router.push('/proyectos')
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      {/* Breadcrumb + title */}
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          <Link href="/proyectos" className="hover:text-foreground">Proyectos</Link>
          <span className="mx-2">/</span>
          <span>Nuevo proyecto</span>
        </div>
        <h1 className="text-2xl font-medium text-foreground">Crear nuevo proyecto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra la información base del proyecto para activarlo en el flujo de la agencia.
        </p>
      </div>

      {/* 3-column form */}
      <div className="grid grid-cols-3 gap-5">

        {/* Sección 1 — Información del cliente */}
        <div className="border border-border rounded-lg p-5 bg-card flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              1
            </div>
            <h2 className="text-base font-medium">Información del cliente</h2>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              El cliente y subcliente se seleccionan desde el módulo{' '}
              <Link href="/clientes" className="text-blue-600 hover:underline">Clientes.</Link>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Cliente / Marca</Label>
              <Select value={cliente} onValueChange={(v) => v && handleClienteChange(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {clientesStore.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Contacto / Subcliente</Label>
              <Select value={subcliente} onValueChange={(v) => v && setSubcliente(v)} disabled={!cliente}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {subclientesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">KAM</Label>
              <Select value={ejecutivo} onValueChange={(v) => v && setEjecutivo(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar KAM..." /></SelectTrigger>
                <SelectContent>
                  {kams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Sección 2 — Información del proyecto */}
        <div className="border border-border rounded-lg p-5 bg-card flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              2
            </div>
            <h2 className="text-base font-medium">Información del proyecto</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nombre del proyecto</Label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Activación Mundial Banco Falabella"
                className="h-9 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tipo de proyecto</Label>
              <Select value={tipo} onValueChange={(v) => v && setTipo(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {tiposProyecto.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Fecha de creación</Label>
              <Input
                type="date"
                value={fechaCreacion}
                onChange={e => setFechaCreacion(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Fecha entrega / presentación</Label>
                <Input
                  type="date"
                  value={fechaPresentacion}
                  onChange={e => setFechaPresentacion(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Fecha de ejecución</Label>
                <Input
                  type="date"
                  value={fechaEjecucion}
                  onChange={e => setFechaEjecucion(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3 — Información comercial */}
        <div className="border border-border rounded-lg p-5 bg-card flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              3
            </div>
            <h2 className="text-base font-medium">Información comercial</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Monto estimado de facturación</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  value={monto}
                  onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  className="h-9 text-sm pl-7"
                />
              </div>
              {monto && (
                <span className="text-xs text-muted-foreground">
                  $ {Number(monto).toLocaleString('es-CO')}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Mes estimado de venta / ejecución</Label>
              <Select value={mesEstimado} onValueChange={(v) => v && setMesEstimado(v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar mes..." /></SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Al guardar, este proyecto se agregará automáticamente al flujo de la agencia.</p>
          {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/proyectos">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
            Guardar proyecto
          </Button>
        </div>
      </div>
    </div>
  )
}
