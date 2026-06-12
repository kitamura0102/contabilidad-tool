import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import {
  Upload, RefreshCw, Download, FileText, ArrowLeft, Search,
  AlertTriangle, CheckCircle, X, Pencil, RotateCcw, Sparkles, ChevronRight,
} from 'lucide-react'
import { getCliente, getFacturas, uploadFactura, patchFactura, downloadReporte, fetchFacturaImagen, reintentarFactura } from '../lib/api'
import Topbar from '../components/Topbar'
import FacturaBadge from '../components/FacturaBadge'

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

type ClienteData = {
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

function friendlyError(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'Límite de la API de IA alcanzado. Reintenta en unos minutos.'
  if (/\b503\b|overloaded|unavailable/i.test(msg)) return 'El servicio de IA estaba saturado. Reintenta.'
  if (/Imagen no encontrada/i.test(msg)) return 'No se encontró la imagen. Vuelve a subirla.'
  if (/JSON|Unexpected|SyntaxError|vac[ií]a/i.test(msg)) return 'La IA no pudo leer la factura. Verifica que la foto sea legible.'
  return 'Error al procesar. Reintenta o corrige los datos a mano.'
}

const fmt = (cents: number | null) =>
  cents == null ? '—' : 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })

export default function Cliente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [cliente, setCliente] = useState<ClienteData | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [tab, setTab] = useState<'compra' | 'venta'>('compra')
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [q, setQ] = useState('')
  const [uploading, setUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [panel, setPanel] = useState<Factura | null>(null)
  const [imagen, setImagen] = useState<{ url: string; isPdf: boolean } | null>(null)
  const [imagenLoading, setImagenLoading] = useState(false)
  const [editFields, setEditFields] = useState<EditFields | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) load() }, [id, tab])

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
      closePanel()
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
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }

  async function openPanel(factura: Factura) {
    setPanel(factura)
    setImagen(null)
    setImagenLoading(true)
    setEditFields(
      (factura.estado === 'pendiente_revision' || factura.estado === 'procesada')
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
    } catch { /* imagen no disponible */ } finally {
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
        rnc_emisor:       editFields.rnc_emisor    || undefined,
        ncf:              editFields.ncf           || undefined,
        fecha_emision:    editFields.fecha_emision || undefined,
        monto_total_cent: editFields.monto_total   ? Math.round(parseFloat(editFields.monto_total) * 100)  : undefined,
        monto_itbis_cent: editFields.monto_itbis   ? Math.round(parseFloat(editFields.monto_itbis) * 100)  : undefined,
        tasa_itbis:       editFields.tasa_itbis    ? parseInt(editFields.tasa_itbis) : undefined,
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

  async function handleDownload(tipo: '606' | '607', formato: 'txt' | 'xlsx' = 'xlsx') {
    const token = await getToken()
    if (!token || !id) return
    const periodoCompact = periodo.replace('-', '')
    const procesadas = facturas.filter(
      f => f.estado === 'procesada' && f.fecha_emision?.slice(0, 7) === periodo
    ).length
    if (procesadas === 0) {
      alert(`No hay facturas procesadas en ${periodo}.\n\nSolo se exportan facturas en estado "Procesada".`)
      return
    }
    try {
      await downloadReporte(token, id, tipo, periodoCompact, formato, cliente?.nombre_empresa)
    } catch (err) {
      alert(`No se pudo exportar:\n${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const procesadasDelPeriodo = facturas.filter(
    f => f.estado === 'procesada' && f.fecha_emision?.slice(0, 7) === periodo
  ).length

  const hasPending = facturas.some(f => f.estado === 'en_cola' || f.estado === 'procesando')
  const conRevision = facturas.filter(f => f.estado === 'pendiente_revision' || f.estado === 'error_extraccion').length

  const filtered = facturas.filter(f =>
    !q ||
    (f.rnc_emisor ?? '').includes(q) ||
    (f.ncf ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const tipoLabel = tab === 'compra' ? '606' : '607'

  return (
    <>
      <Topbar
        title={cliente?.nombre_empresa ?? '…'}
        crumbs={['Clientes', cliente?.nombre_empresa ?? '…']}
        onBack={() => navigate('/app')}
        periodo
        periodoValue={periodo}
        onPeriodoChange={v => setPeriodo(v)}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => handleDownload(tipoLabel as '606' | '607', 'txt')}
              disabled={procesadasDelPeriodo === 0}
              title="Archivo .txt oficial para la DGII"
            >
              <FileText size={15} />Exportar {tipoLabel} (.txt)
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleDownload(tipoLabel as '606' | '607', 'xlsx')}
              disabled={procesadasDelPeriodo === 0}
              title="Hoja Excel para revisión"
            >
              <Download size={15} />Excel
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              {uploading
                ? <><Sparkles size={15} className="spin" />Procesando…</>
                : <><Upload size={15} />Subir factura</>}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>
          </>
        }
      />

      <div className="content">
        {/* Client meta row */}
        {cliente && (
          <div className="row gap-3" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
            <span className="t-label">RNC</span>
            <span className="mono cell-strong" style={{ fontSize: 13 }}>{cliente.rnc}</span>
            {cliente.sector && (
              <>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="t-sm cell-strong">{cliente.sector}</span>
              </>
            )}
            <div className="spacer" />
            {hasPending && (
              <span className="t-sm t-muted row gap-2">
                <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                Actualizando cada 10s
              </span>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => load(true)}
              disabled={refreshing}
              title="Actualizar"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {(['compra', 'venta'] as const).map(t => {
            const cnt = facturas.filter(f => f.tipo === t).length
            return (
              <button
                key={t}
                className={`tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'compra' ? 'Compras (606)' : 'Ventas (607)'}
                <span className="tab-count">{cnt}</span>
              </button>
            )
          })}
        </div>

        <div style={{ height: 16 }} />

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder={tab === 'compra' ? 'Buscar por RNC o NCF…' : 'Buscar por RNC o NCF…'}
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          {conRevision > 0 && (
            <span className="badge badge-amber">
              <AlertTriangle size={11} />
              {conRevision} por revisar
            </span>
          )}
          <div className="spacer" />
          <span className="t-sm t-muted">{filtered.length} factura{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>RNC Emisor</th>
                  <th>NCF</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>ITBIS</th>
                  <th>Tasa</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No hay facturas. Sube la primera con "Subir factura".
                    </td>
                  </tr>
                ) : filtered.map(f => (
                  <tr
                    key={f.id}
                    className="clickable"
                    tabIndex={0}
                    role="button"
                    aria-label={`Revisar factura ${f.ncf ?? f.rnc_emisor ?? f.id}`}
                    onClick={() => openPanel(f)}
                    onKeyDown={e => {
                      if (e.target !== e.currentTarget) return   // ignore keys from nested buttons (Reintentar)
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(f) }
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <FacturaBadge estado={f.estado} />
                        {f.estado === 'error_extraccion' && f.ultimo_error && (
                          <span style={{ fontSize: 11, color: 'var(--red-700)', maxWidth: 200 }}>
                            {friendlyError(f.ultimo_error)}
                          </span>
                        )}
                        {f.estado === 'error_extraccion' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, height: 22, padding: '0 8px' }}
                            onClick={e => handleReintentar(f.id, e)}
                          >
                            <RotateCcw size={10} />Reintentar
                          </button>
                        )}
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{f.rnc_emisor ?? <span className="muted-cell">—</span>}</span></td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{f.ncf ?? <span className="muted-cell">—</span>}</span></td>
                    <td className="mono" style={{ fontSize: 12 }}>{f.fecha_emision?.slice(0, 10) ?? <span className="muted-cell">—</span>}</td>
                    <td className="num cell-strong">{fmt(f.monto_total_cent)}</td>
                    <td className="num">{fmt(f.monto_itbis_cent)}</td>
                    <td className="t-muted" style={{ fontSize: 12 }}>{f.tasa_itbis ? `${f.tasa_itbis}%` : <span className="muted-cell">—</span>}</td>
                    <td>
                      {(f.estado === 'pendiente_revision') ? (
                        <Pencil size={15} style={{ color: 'var(--amber-600)' }} />
                      ) : (
                        <ChevronRight size={15} style={{ color: 'var(--text-faint)' }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>Totales · {filtered.length} factura{filtered.length !== 1 ? 's' : ''}</td>
                    <td className="num">{fmt(filtered.reduce((s, f) => s + (f.monto_total_cent ?? 0), 0))}</td>
                    <td className="num">{fmt(filtered.reduce((s, f) => s + (f.monto_itbis_cent ?? 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="t-sm t-muted row gap-2" style={{ marginTop: 12 }}>
            <CheckCircle size={13} style={{ color: 'var(--green-600)' }} />
            Haz clic en una fila para ver la imagen y editar los datos extraídos.
          </div>
        )}
      </div>

      {/* Corrector panel (full-screen flow) */}
      {panel && (
        <div className="flow">
          {/* Flow header */}
          <div className="flow-head">
            <button className="btn btn-ghost btn-icon" onClick={closePanel}>
              <ArrowLeft size={18} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-h2">Revisar factura</div>
              <div className="t-sm t-muted">
                {cliente?.nombre_empresa} · {panel.fecha_emision?.slice(0, 10) ?? 'sin fecha'} · {panel.ncf ?? 'sin NCF'}
              </div>
            </div>
            <FacturaBadge estado={panel.estado} />
            <div style={{ width: 12 }} />
            {panel.estado === 'error_extraccion' && (
              <button className="btn btn-secondary" onClick={() => handleReintentar(panel.id)}>
                <RotateCcw size={14} />Reintentar
              </button>
            )}
            {editFields && (
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <CheckCircle size={15} />{saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            )}
          </div>

          {/* Flow body: 50/50 */}
          <div className="flow-body">
            {/* Left: image */}
            <div style={{
              flex: '1 1 55%', background: 'var(--slate-900)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'auto', padding: 28,
            }}>
              {imagenLoading ? (
                <div className="ai-processing">
                  <div className="ai-orb"><Sparkles size={22} /></div>
                  <div className="t-sm" style={{ color: 'var(--text-on-dark-muted)' }}>Cargando imagen…</div>
                </div>
              ) : imagen ? (
                imagen.isPdf ? (
                  <iframe
                    src={imagen.url}
                    title="Factura PDF"
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6 }}
                  />
                ) : (
                  <img
                    src={imagen.url}
                    alt="Factura"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
                  />
                )
              ) : (
                <div style={{ color: 'var(--slate-500)', fontSize: 13, textAlign: 'center' }}>
                  <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>Imagen no disponible</div>
                </div>
              )}
            </div>

            {/* Right: fields */}
            <div style={{
              flex: '1 1 45%', background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border)', overflow: 'auto',
            }}>
              <div style={{ padding: '24px 28px', maxWidth: 480 }}>

                {panel.estado === 'pendiente_revision' && (
                  <div className="row gap-3" style={{ marginBottom: 18, padding: '10px 13px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 8 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
                    <div className="t-sm" style={{ color: 'var(--amber-700)' }}>
                      OCR con baja confianza. Verifica los campos contra la imagen.
                    </div>
                  </div>
                )}

                {panel.estado === 'error_extraccion' && panel.ultimo_error && (
                  <div className="row gap-3" style={{ marginBottom: 18, padding: '10px 13px', background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 8 }}>
                    <X size={16} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                    <div>
                      <div className="t-sm" style={{ color: 'var(--red-700)', fontWeight: 500 }}>{friendlyError(panel.ultimo_error)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, wordBreak: 'break-all' }}>{panel.ultimo_error}</div>
                    </div>
                  </div>
                )}

                <div className="upper-label" style={{ marginBottom: 14 }}>Datos del emisor</div>

                {editFields ? (
                  <>
                    <EditField label="RNC Emisor" value={editFields.rnc_emisor} mono
                      onChange={v => setEditFields(f => f ? { ...f, rnc_emisor: v } : f)} />
                    <EditField label="NCF" value={editFields.ncf} mono
                      onChange={v => setEditFields(f => f ? { ...f, ncf: v } : f)} />
                    <div className="row gap-3">
                      <div style={{ flex: 1 }}>
                        <EditField label="Fecha emisión" value={editFields.fecha_emision} type="date"
                          onChange={v => setEditFields(f => f ? { ...f, fecha_emision: v } : f)} />
                      </div>
                      <div style={{ width: 130 }}>
                        <label className="field-label">Tasa ITBIS</label>
                        <select
                          className="input"
                          value={editFields.tasa_itbis}
                          onChange={e => setEditFields(f => f ? { ...f, tasa_itbis: e.target.value } : f)}
                        >
                          <option value="">—</option>
                          <option value="16">16%</option>
                          <option value="18">18%</option>
                        </select>
                      </div>
                    </div>

                    <div className="upper-label" style={{ margin: '18px 0 14px' }}>Montos</div>
                    <div className="row gap-3">
                      <div style={{ flex: 1 }}>
                        <EditField label="Monto total (RD$)" value={editFields.monto_total} type="number" mono
                          onChange={v => setEditFields(f => f ? { ...f, monto_total: v } : f)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <EditField label="ITBIS (RD$)" value={editFields.monto_itbis} type="number" mono
                          onChange={v => setEditFields(f => f ? { ...f, monto_itbis: v } : f)} />
                      </div>
                    </div>

                    <div className="row gap-2" style={{ marginTop: 10, padding: '10px 13px', background: 'var(--slate-50)', borderRadius: 8, justifyContent: 'space-between' }}>
                      <span className="t-sm t-muted">Subida</span>
                      <span className="t-sm">{panel.creado_en.slice(0, 10)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ReadField label="RNC Emisor"    value={panel.rnc_emisor ?? ''} mono />
                    <ReadField label="NCF"           value={panel.ncf ?? ''} mono />
                    <ReadField label="Fecha emisión" value={panel.fecha_emision?.slice(0, 10) ?? ''} />
                    <ReadField label="Monto total"   value={fmt(panel.monto_total_cent)} />
                    <ReadField label="ITBIS"         value={fmt(panel.monto_itbis_cent)} />
                    <ReadField label="Tasa ITBIS"    value={panel.tasa_itbis ? `${panel.tasa_itbis}%` : ''} />
                    <ReadField label="Subida"        value={panel.creado_en.slice(0, 10)} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EditField({ label, value, type = 'text', mono, onChange }: {
  label: string; value: string; type?: string; mono?: boolean; onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="field-label">{label}</label>
      <input
        className={`input${mono ? ' mono' : ''}`}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  )
}

function ReadField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
      <div className="field-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? 'var(--text-strong)' : 'var(--text-faint)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  )
}
