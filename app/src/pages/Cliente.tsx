import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { getCliente, getFacturas, uploadFactura, patchFactura, downloadReporte } from '../lib/api'

type Factura = {
  id: string
  estado: string
  tipo: string
  rnc_emisor: string | null
  ncf: string | null
  fecha_emision: string | null
  monto_total_cent: number | null
  monto_itbis_cent: number | null
  tasa_itbis: number | null
  confidence_json: Record<string, unknown> | null
  ultimo_error: string | null
  creado_en: string
}

type Cliente = {
  id: string
  nombre_empresa: string
  rnc: string
  sector: string | null
}

const ESTADOS_LABEL: Record<string, string> = {
  en_cola: 'En cola',
  procesando: 'Procesando',
  procesada: 'Procesada',
  pendiente_revision: 'Revisar',
  error_extraccion: 'Error',
}

export default function Cliente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [tab, setTab] = useState<'compra' | 'venta'>('compra')
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id, tab])

  async function load() {
    const token = await getToken()
    if (!token || !id) return
    const [c, f] = await Promise.all([
      getCliente(token, id),
      getFacturas(token, { cliente_id: id, tipo: tab }),
    ])
    setCliente(c)
    setFacturas(f)
    f.filter((x: Factura) => x.estado === 'error_extraccion' && x.ultimo_error)
      .forEach((x: Factura) => console.warn(`Factura ${x.id} falló:`, x.ultimo_error))
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    const token = await getToken()
    if (!token) return
    try {
      await uploadFactura(token, { file, cliente_id: id, tipo: tab })
      await load()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDownload(tipo: '606' | '607', formato: 'txt' | 'xlsx' = 'txt') {
    const token = await getToken()
    if (!token || !id) return
    if (procesadasDelPeriodo === 0) {
      alert(
        `No hay facturas procesadas en ${periodo.slice(4, 6)}/${periodo.slice(0, 4)}.\n\n` +
        'Solo se exportan las facturas en estado "Procesada" — las que están en error o ' +
        'pendientes de revisión se omiten automáticamente. Revisa el período seleccionado.'
      )
      return
    }
    try {
      await downloadReporte(token, id, tipo, periodo, formato)
    } catch (err) {
      alert(`No se pudo exportar el reporte:\n${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Facturas procesadas que caen en el período seleccionado (lo que realmente se exporta).
  // Los errores y pendientes de revisión se excluyen, igual que en el backend.
  const periodoYM = `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`
  const procesadasDelPeriodo = facturas.filter(
    f => f.estado === 'procesada' && f.fecha_emision?.slice(0, 7) === periodoYM
  ).length

  const formatMonto = (cents: number | null) => {
    if (cents === null) return '—'
    return 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, color: '#666' }}>
        ← Volver
      </button>

      {cliente && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{cliente.nombre_empresa}</h1>
          <div style={{ color: '#888', fontSize: 13 }}>RNC {cliente.rnc} {cliente.sector ? `· ${cliente.sector}` : ''}</div>
        </div>
      )}

      {/* Tabs + acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['compra', 'venta'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: tab === t ? '#111' : '#f3f4f6',
                color: tab === t ? '#fff' : '#111',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'compra' ? 'Compras (606)' : 'Ventas (607)'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="month"
            value={`${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`}
            onChange={e => setPeriodo(e.target.value.replace('-', ''))}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          />
          <button
            onClick={() => handleDownload(tab === 'compra' ? '606' : '607')}
            style={{ ...btnSecStyle, opacity: procesadasDelPeriodo === 0 ? 0.5 : 1 }}
            title="Archivo oficial para subir a la Oficina Virtual de la DGII"
          >
            Exportar {tab === 'compra' ? '606' : '607'} (.txt)
            {procesadasDelPeriodo > 0 && <span style={{ opacity: 0.6 }}> · {procesadasDelPeriodo}</span>}
          </button>
          <button
            onClick={() => handleDownload(tab === 'compra' ? '606' : '607', 'xlsx')}
            style={{ ...btnSecStyle, opacity: procesadasDelPeriodo === 0 ? 0.5 : 1 }}
            title="Hoja Excel para revisión o respaldo (no reemplaza el .txt de la DGII)"
          >
            Excel
          </button>
          <label style={{ ...btnStyle, display: 'inline-block' }}>
            {uploading ? 'Subiendo...' : '+ Factura'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Tabla de facturas */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Estado', 'RNC Emisor', 'NCF', 'Fecha', 'Total', 'ITBIS', 'Tasa'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                  No hay facturas. Sube la primera con el botón "+ Factura".
                </td>
              </tr>
            ) : facturas.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px' }}>
                  <span style={estadoBadge(f.estado)}>{ESTADOS_LABEL[f.estado] ?? f.estado}</span>
                  {f.estado === 'error_extraccion' && f.ultimo_error && (
                    <div
                      title={f.ultimo_error}
                      style={{ color: '#dc2626', fontSize: 11, marginTop: 4, maxWidth: 220, cursor: 'help' }}
                    >
                      {friendlyError(f.ultimo_error)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{f.rnc_emisor ?? '—'}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{f.ncf ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{f.fecha_emision?.slice(0, 10) ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{formatMonto(f.monto_total_cent)}</td>
                <td style={{ padding: '10px 12px' }}>{formatMonto(f.monto_itbis_cent)}</td>
                <td style={{ padding: '10px 12px' }}>{f.tasa_itbis ? `${f.tasa_itbis}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Traduce el ultimo_error técnico a un mensaje entendible para el contador.
// El texto crudo queda en el tooltip (title) para depuración.
function friendlyError(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'Límite de la API de IA alcanzado. Reintenta en unos minutos.'
  if (/\b503\b|overloaded|unavailable/i.test(msg)) return 'El servicio de IA estaba saturado. Reintenta.'
  if (/Imagen no encontrada/i.test(msg)) return 'No se encontró la imagen. Vuelve a subirla.'
  if (/JSON|Unexpected|SyntaxError|vac[ií]a/i.test(msg)) return 'La IA no pudo leer la factura. Verifica que la foto sea legible.'
  return 'Error al procesar. Reintenta o corrige los datos a mano.'
}

const estadoBadge = (estado: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    procesada:         ['#dcfce7', '#16a34a'],
    pendiente_revision:['#fef9c3', '#a16207'],
    error_extraccion:  ['#fee2e2', '#dc2626'],
    procesando:        ['#dbeafe', '#2563eb'],
    en_cola:           ['#f3f4f6', '#6b7280'],
  }
  const [bg, color] = map[estado] ?? ['#f3f4f6', '#374151']
  return { padding: '2px 8px', borderRadius: 12, background: bg, color, fontWeight: 500, fontSize: 12 }
}

const btnStyle: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
  fontSize: 13,
}

const btnSecStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#f3f4f6',
  color: '#111',
}
