'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useStore } from '@/lib/store'

export default function LoginPage() {
  const { personasStore, setCurrentUser } = useStore()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const persona = personasStore.find(
      p => p.email?.toLowerCase() === email.toLowerCase().trim() && p.clave === clave
    )

    setTimeout(() => {
      setLoading(false)
      if (!persona) {
        setError('Correo o clave incorrectos. Verifica tus datos.')
        return
      }
      setCurrentUser(persona)
      router.push('/dashboard')
    }, 400)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / marca */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: '#1A56DB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>S</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Salesforce <span style={{ color: '#1A56DB' }}>SE</span></span>
          </div>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Ingresa con tu correo y clave</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Correo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@socialexperience.com.co"
                required
                autoFocus
                style={{
                  height: 42, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 8,
                  fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#1A56DB')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Clave */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Clave</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={clave}
                  onChange={e => setClave(e.target.value)}
                  placeholder="Tu clave de acceso"
                  required
                  style={{
                    height: 42, padding: '0 42px 0 14px', border: '1px solid #E5E7EB', borderRadius: 8,
                    fontSize: 14, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#1A56DB')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                  {showPwd ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, fontSize: 13, color: '#BE123C' }}>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44, background: loading ? '#93C5FD' : '#1A56DB', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 24 }}>
          Social Experience © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
