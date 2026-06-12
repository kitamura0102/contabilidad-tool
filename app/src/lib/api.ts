const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787'

async function authFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${WORKER_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...init?.headers,
    },
  })
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export async function getClientes(token: string) {
  const r = await authFetch(token, '/api/clientes')
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getCliente(token: string, id: string) {
  const r = await authFetch(token, `/api/clientes/${id}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createCliente(token: string, data: {
  nombre_empresa: string
  rnc: string
  sector?: string
}) {
  const r = await authFetch(token, '/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// ─── Facturas ────────────────────────────────────────────────────────────────

export async function getFacturas(token: string, params: {
  cliente_id?: string
  estado?: string
  tipo?: string
}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  )
  const r = await authFetch(token, `/api/facturas?${qs}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function uploadFactura(token: string, data: {
  file: File
  cliente_id: string
  tipo: 'compra' | 'venta'
}) {
  const formData = new FormData()
  const compressed = await compressImage(data.file)
  formData.append('file', compressed)
  formData.append('cliente_id', data.cliente_id)
  formData.append('tipo', data.tipo)

  const r = await authFetch(token, '/api/facturas', {
    method: 'POST',
    body: formData,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function patchFactura(token: string, id: string, data: Record<string, unknown>) {
  const r = await authFetch(token, `/api/facturas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchFacturaImagen(token: string, id: string): Promise<{ url: string; isPdf: boolean }> {
  const r = await authFetch(token, `/api/facturas/${id}/imagen`)
  if (!r.ok) throw new Error(await r.text())
  const isPdf = (r.headers.get('content-type') ?? '').includes('pdf')
  const blob = await r.blob()
  return { url: URL.createObjectURL(blob), isPdf }
}

export async function reintentarFactura(token: string, id: string): Promise<void> {
  const r = await authFetch(token, `/api/facturas/${id}/reintentar`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
}

// ─── Reportes ────────────────────────────────────────────────────────────────

// formato 'txt' (oficial DGII) o 'xlsx' (revisión/respaldo del contador)
export async function downloadReporte(
  token: string,
  clienteId: string,
  tipo: '606' | '607',
  periodo: string,
  formato: 'txt' | 'xlsx' = 'txt',
  clienteNombre?: string,
) {
  const qs = formato === 'xlsx' ? '?formato=xlsx' : ''
  const r = await authFetch(token, `/api/reportes/${clienteId}/${tipo}/${periodo}${qs}`)
  if (!r.ok) throw new Error(await r.text())
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildFilename(tipo, periodo, formato, clienteNombre)
  a.click()
  URL.revokeObjectURL(url)
}

function buildFilename(tipo: string, periodo: string, formato: string, clienteNombre?: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`
  const h = now.getHours()
  const time = `${h % 12 || 12}-${pad(now.getMinutes())}${h >= 12 ? 'pm' : 'am'}`
  const safe = clienteNombre ? clienteNombre.replace(/[/\\:*?"<>|]/g, '').trim() + ' - ' : ''
  return `${safe}${tipo} - ${date} ${time}.${formato}`
}

// ─── RNC ─────────────────────────────────────────────────────────────────────

export async function lookupRnc(token: string, rnc: string) {
  const r = await authFetch(token, `/api/rnc/${rnc}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// ─── Compresión de imagen (client-side) ──────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  if (file.type === 'application/pdf') return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const MAX = 1600
      let w = img.width
      let h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else       { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.8)
      URL.revokeObjectURL(url)
    }

    img.src = url
  })
}
