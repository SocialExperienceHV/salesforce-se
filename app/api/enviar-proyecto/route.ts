import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const DESTINATARIOS = [
  'hans@socialexperience.com.co',
  'felipe@socialexperience.com.co',
  'ivan.londono@socialexperience.com.co',
]

const LOGO_URL = 'https://vbbmboppwmosxnrotymt.supabase.co/storage/v1/object/public/gespro-archivos/brand/logo-social.png'

function fila(label: string, valor: string) {
  return `
    <tr>
      <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#374151;background:#F9FAFB;border-bottom:1px solid #E5E7EB;width:40%">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#111827;background:#ffffff;border-bottom:1px solid #E5E7EB">${valor}</td>
    </tr>`
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

export async function POST(req: NextRequest) {
  try {
    const { centroCosto, nombre, cliente, monto, fechaInicio, fechaEntrega, creadoPor } = await req.json()

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td align="center" style="padding:28px 32px;background:#111827">
            <img src="${LOGO_URL}" alt="Social Experience" height="50" style="display:block;margin:0 auto" />
          </td>
        </tr>
        <!-- Título -->
        <tr>
          <td style="padding:24px 32px 8px;font-size:18px;font-weight:700;color:#111827">
            Nuevo centro de costo #${centroCosto}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px;font-size:13px;color:#6B7280">
            Creado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}${creadoPor ? ` por ${creadoPor}` : ''}
          </td>
        </tr>
        <!-- Tabla de datos -->
        <tr>
          <td style="padding:0 32px 32px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:6px;overflow:hidden">
              ${fila('Centro de costo', centroCosto)}
              ${fila('Nombre del proyecto', nombre)}
              ${fila('Cliente', cliente)}
              ${monto ? fila('Venta estimada', formatCOP(Number(monto))) : ''}
              ${fechaInicio ? fila('Fecha de inicio', new Date(fechaInicio).toLocaleDateString('es-CO')) : ''}
              ${fechaEntrega ? fila('Fecha de entrega', new Date(fechaEntrega).toLocaleDateString('es-CO')) : ''}
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center">
            Social Experience © ${new Date().getFullYear()} — Este es un correo automático generado por Calendar 2.0.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    await transporter.sendMail({
      from: `"Social Experience" <${process.env.GMAIL_USER}>`,
      to: DESTINATARIOS.join(', '),
      subject: `Nuevo centro de costo #${centroCosto}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('Error enviando correo proyecto:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
