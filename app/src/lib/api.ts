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

export function getImageUrl(token: string, facturaId: string) {
  return `${WORKER_URL}/api/facturas/${facturaId}/imagen?token=${token}`
}

// ─── Reportes ────────────────────────────────────────────────────────────────

// formato 'txt' (oficial DGII) o 'xlsx' (revisión/respaldo del contador)
export async function downloadReporte(
  token: string,
  clienteId: string,
  tipo: '606' | '607',
  periodo: string,
  formato: 'txt' | 'xlsx' = 'txt',
) {
  const qs = formato === 'xlsx' ? '?formato=xlsx' : ''
  const r = await authFetch(token, `/api/reportes/${clienteId}/${tipo}/${periodo}${qs}`)
  if (!r.ok) throw new Error(await r.text())
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tipo}_${periodo}.${formato}`
  a.click()
  URL.revokeObjectURL(url)
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
