import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { getCliente, getFacturas, uploadFactura, patchFactura, downloadReporte, fetchFacturaImagen, reintentarFactura } from '../lib/api'

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

type EditFields = {
  rnc_emisor: string
  ncf: string
  fecha_emision: string
  monto_total: string
  monto_itbis: string
  tasa_itbis: string
}

const ESTADOS_LABEL: Record<string, string> = {
  en_cola: 'En cola',
  procesando: 'Procesando',
  procesada: 'Procesada',
  pendiente_revision: 'Revisar',
  error_extraccion: 'Error',
}

const PANEL_FIELDS = [
  { label: 'RNC Emisor',        key: 'rnc_emisor',     type: 'text',   placeholder: '101234567' },
  { label: 'NCF',               key: 'ncf',            type: 'text',   placeholder: 'B0100000001' },
  { label: 'Fecha emisión',     key: 'fecha_emision',  type: 'date',   placeholder: '' },
  { label: 'Monto total (RD$)', key: 'monto_total',    type: 'number', placeholder: '5000.00' },
  { label: 'ITBIS (RD$)',       key: 'monto_itbis',    type: 'number', placeholder: '762.71' },
] as const

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
  const [refreshing, setRefreshing] = useState(false)

  const [panel, setPanel] = useState<Factura | null>(null)
  const [imagen, setImagen] = useState<{ url: string; isPdf: boolean } | null>(null)
  const [imagenLoading, setImagenLoading] = useState(false)
  const [editFields, setEditFields] = useState<EditFields | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id, tab])

  // Auto-refresh cada 10s mientras haya facturas pendientes de procesar
  useEffect(() => {
    const hasPending = facturas.some(f => f.estado === 'en_cola' || f.estado === 'procesando')
    if (!hasPending) return
    const timer = setInterval(() => load(), 10_000)
    return () => clearInterval(timer)
  }, [facturas])

  useEffect(() => {
    if (!panel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (imagen) URL.revokeObjectURL(imagen.url)
      setPanel(null)
      setImagen(null)
      setEditFields(null)
      setImagenLoading(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, imagen])

  async function load(showSpinner = false) {
    const token = await getToken()
    if (!token || !id) return
    if (showSpinner) setRefreshing(true)
    try {
      const [c, f] = await Promise.all([
        getCliente(token, id),
        getFacturas(token, { cliente_id: id, tipo: tab }),
      ])
      setCliente(c)
      setFacturas(f)
      f.filter((x: Factura) => x.estado === 'error_extraccion' && x.ultimo_error)
        .forEach((x: Factura) => console.warn(`Factura ${x.id} falló:`, x.ultimo_error))
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }

  async function openPanel(factura: Factura) {
    setPanel(factura)
    setImagen(null)
    setImagenLoading(true)
    setEditFields(
      factura.estado === 'pendiente_revision'
        ? {
            rnc_emisor:    factura.rnc_emisor ?? '',
            ncf:           factura.ncf ?? '',
            fecha_emision: factura.fecha_emision?.slice(0, 10) ?? '',
            monto_total:   factura.monto_total_cent != null ? (factura.monto_total_cent / 100).toFixed(2) : '',
            monto_itbis:   factura.monto_itbis_cent != null ? (factura.monto_itbis_cent / 100).toFixed(2) : '',
            tasa_itbis:    factura.tasa_itbis != null ? String(factura.tasa_itbis) : '',
          }
        : null
    )
    const token = await getToken()
    if (!token) { setImagenLoading(false); return }
    try {
      const img = await fetchFacturaImagen(token, factura.id)
      setImagen(img)
    } catch {
      // imagen no disponible
    } finally {
      setImagenLoading(false)
    }
  }

  function closePanel() {
    if (imagen) URL.revokeObjectURL(imagen.url)
    setPanel(null)
    setImagen(null)
    setEditFields(null)
    setImagenLoading(false)
  }

  async function handleSave() {
    if (!panel || !editFields) return
    setSaving(true)
    const token = await getToken()
    if (!token) { setSaving(false); return }
    try {
      await patchFactura(token, panel.id, {
        rnc_emisor:       editFields.rnc_emisor     || undefined,
        ncf:              editFields.ncf            || undefined,
        fecha_emision:    editFields.fecha_emision  || undefined,
        monto_total_cent: editFields.monto_total    ? Math.round(parseFloat(editFields.monto_total) * 100)  : undefined,
        monto_itbis_cent: editFields.monto_itbis    ? Math.round(parseFloat(editFields.monto_itbis) * 100)  : undefined,
        tasa_itbis:       editFields.tasa_itbis     ? parseInt(editFields.tasa_itbis) : undefined,
      })
      await load()
      closePanel()
    } catch (err) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleReintentar(facturaId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    const token = await getToken()
    if (!token) return
    try {
      await reintentarFactura(token, facturaId)
      await load()
      if (panel?.id === facturaId) closePanel()
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
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
      await downloadReporte(token, id, tipo, periodo, formato, cliente?.nombre_empresa)
    } catch (err) {
      alert(`No se pudo exportar el reporte:\n${err instanceof Error ? err.message : String(err)}`)
    }
  }

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Actualizar lista de facturas"
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 15, color: '#666', lineHeight: 1 }}
          >
            {refreshing ? '⟳' : '↻'}
          </button>
          {facturas.some(f => f.estado === 'en_cola' || f.estado === 'procesando') && (
            <span style={{ fontSize: 11, color: '#6b7280' }}>actualizando cada 10s</span>
          )}
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
              <tr
                key={f.id}
                onClick={() => openPanel(f)}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 12px' }}>
                  <span style={estadoBadge(f.estado)}>{ESTADOS_LABEL[f.estado] ?? f.estado}</span>
                  {f.estado === 'error_extraccion' && f.ultimo_error && (
                    <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4, maxWidth: 220 }}>
                      {friendlyError(f.ultimo_error)}
                    </div>
                  )}
                  {f.estado === 'error_extraccion' && (
                    <button
                      onClick={e => handleReintentar(f.id, e)}
                      style={{ marginTop: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', color: '#374151', display: 'block' }}
                    >
                      Reintentar
                    </button>
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

      {/* Panel de imagen + detalle */}
      {panel && (
        <div
          onClick={closePanel}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '93vw', height: '90vh',
              background: '#fff', borderRadius: 12,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={estadoBadge(panel.estado)}>{ESTADOS_LABEL[panel.estado] ?? panel.estado}</span>
                <span style={{ fontSize: 12, color: '#999' }}>Subida {panel.creado_en.slice(0, 10)}</span>
              </div>
              <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#999', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* Izquierda: imagen / PDF */}
              <div style={{
                flex: '0 0 60%', background: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'auto', padding: 16,
              }}>
                {imagenLoading ? (
                  <div style={{ color: '#555', fontSize: 14 }}>Cargando...</div>
                ) : imagen ? (
                  imagen.isPdf ? (
                    <iframe
                      src={imagen.url}
                      title="Factura PDF"
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4 }}
                    />
                  ) : (
                    <img
                      src={imagen.url}
                      alt="Factura"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', borderRadius: 4 }}
                    />
                  )
                ) : (
                  <div style={{ color: '#555', fontSize: 13 }}>Imagen no disponible</div>
                )}
              </div>

              {/* Derecha: datos */}
              <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {panel.estado === 'pendiente_revision' && editFields ? (
                  <>
                    <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px' }}>
                      OCR con baja confianza en uno o más campos. Verifica en la imagen y corrige si hace falta.
                    </div>

                    {PANEL_FIELDS.map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>{label}</label>
                        <input
                          type={type}
                          value={editFields[key]}
                          placeholder={placeholder}
                          step={type === 'number' ? '0.01' : undefined}
                          onChange={e => setEditFields(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}

                    <div>
                      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Tasa ITBIS</label>
                      <select
                        value={editFields.tasa_itbis}
                        onChange={e => setEditFields(prev => prev ? { ...prev, tasa_itbis: e.target.value } : prev)}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                      >
                        <option value="">— sin especificar —</option>
                        <option value="16">16%</option>
                        <option value="18">18%</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{ ...btnStyle, marginTop: 8, opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Guardando...' : 'Guardar y marcar como procesada'}
                    </button>
                  </>
                ) : (
                  <>
                    <Field label="RNC Emisor"    value={panel.rnc_emisor ?? ''}               mono />
                    <Field label="NCF"           value={panel.ncf ?? ''}                      mono />
                    <Field label="Fecha emisión" value={panel.fecha_emision?.slice(0, 10) ?? ''} />
                    <Field label="Monto total"   value={panel.monto_total_cent != null ? `RD$ ${(panel.monto_total_cent / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : ''} />
                    <Field label="ITBIS"         value={panel.monto_itbis_cent != null ? `RD$ ${(panel.monto_itbis_cent / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : ''} />
                    <Field label="Tasa ITBIS"    value={panel.tasa_itbis != null ? `${panel.tasa_itbis}%` : ''} />

                    {panel.estado === 'error_extraccion' && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {panel.ultimo_error && (
                          <div style={{ color: '#dc2626', fontSize: 12, padding: '10px 12px', background: '#fef2f2', borderRadius: 6 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{friendlyError(panel.ultimo_error)}</div>
                            <div style={{ color: '#aaa', fontSize: 11, wordBreak: 'break-all' }}>{panel.ultimo_error}</div>
                          </div>
                        )}
                        <button onClick={() => handleReintentar(panel.id)} style={{ ...btnSecStyle }}>
                          Reintentar
                        </button>
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? '#111' : '#bbb', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  )
}

function friendlyError(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'Límite de la API de IA alcanzado. Reintenta en unos minutos.'
  if (/\b503\b|overloaded|unavailable/i.test(msg)) return 'El servicio de IA estaba saturado. Reintenta.'
  if (/Imagen no encontrada/i.test(msg)) return 'No se encontró la imagen. Vuelve a subirla.'
  if (/JSON|Unexpected|SyntaxError|vac[ií]a/i.test(msg)) return 'La IA no pudo leer la factura. Verifica que la foto sea legible.'
  return 'Error al procesar. Reintenta o corrige los datos a mano.'
}

const estadoBadge = (estado: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    procesada:          ['#dcfce7', '#16a34a'],
    pendiente_revision: ['#fef9c3', '#a16207'],
    error_extraccion:   ['#fee2e2', '#dc2626'],
    procesando:         ['#dbeafe', '#2563eb'],
    en_cola:            ['#f3f4f6', '#6b7280'],
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
