import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  ArrowLeft, X, CheckCircle, RotateCcw, Trash2, AlertTriangle,
  FileText, Sparkles, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Copy,
} from 'lucide-react'
import { patchFactura, fetchFacturaImagen, reintentarFactura, deleteFactura } from '../lib/api'
import {
  Factura, CampoIssue, fieldIssues, friendlyError, fmtMoney, centsToPesos, pesosToCents,
  TIPO_ID_LABEL, TIPO_BS_LABEL, TIPO_INGRESO_LABEL, FORMA_PAGO_LABEL,
} from '../lib/factura'
import FacturaBadge from './FacturaBadge'

// ── Edit state ────────────────────────────────────────────────────────────────

type EditFields = {
  // Básicos (AI + manual)
  rnc_emisor: string
  tipo_id: string
  ncf: string
  ncf_modificado: string
  fecha_emision: string
  fecha_pago: string
  tipo_bs: string
  tipo_ingreso: string
  forma_pago: string
  tasa_itbis: string
  // Montos auto
  monto_total: string
  monto_subtotal: string
  monto_itbis: string
  monto_servicios: string
  monto_bienes: string
  isc: string
  otros_impuestos: string
  propina: string
  // Montos manuales
  itbis_retenido: string
  tipo_retencion_isr: string
  monto_retencion_renta: string
  isr_percibido: string
  itbis_proporcionalidad: string
  itbis_costo: string
  itbis_adelantar: string
  itbis_percibido: string
}

function initEdit(f: Factura): EditFields {
  return {
    rnc_emisor:           f.rnc_emisor ?? '',
    tipo_id:              f.tipo_id != null ? String(f.tipo_id) : '',
    ncf:                  f.ncf ?? '',
    ncf_modificado:       f.ncf_modificado ?? '',
    fecha_emision:        f.fecha_emision?.slice(0, 10) ?? '',
    fecha_pago:           f.fecha_pago?.slice(0, 10) ?? '',
    tipo_bs:              f.tipo_bs ?? '',
    tipo_ingreso:         f.tipo_ingreso ?? '1',
    forma_pago:           f.forma_pago ?? '',
    tasa_itbis:           f.tasa_itbis != null ? String(f.tasa_itbis) : '',
    monto_total:          centsToPesos(f.monto_total_cent),
    monto_subtotal:       centsToPesos(f.monto_subtotal_cent),
    monto_itbis:          centsToPesos(f.monto_itbis_cent),
    monto_servicios:      centsToPesos(f.monto_servicios_cent),
    monto_bienes:         centsToPesos(f.monto_bienes_cent),
    isc:                  centsToPesos(f.isc_cent),
    otros_impuestos:      centsToPesos(f.otros_impuestos_cent),
    propina:              centsToPesos(f.propina_cent),
    itbis_retenido:       centsToPesos(f.itbis_retenido_cent),
    tipo_retencion_isr:   f.tipo_retencion_isr ?? '',
    monto_retencion_renta: centsToPesos(f.monto_retencion_renta_cent),
    isr_percibido:        centsToPesos(f.isr_percibido_cent),
    itbis_proporcionalidad: centsToPesos(f.itbis_proporcionalidad_cent),
    itbis_costo:          centsToPesos(f.itbis_costo_cent),
    itbis_adelantar:      centsToPesos(f.itbis_adelantar_cent),
    itbis_percibido:      centsToPesos(f.itbis_percibido_cent),
  }
}

function editToPatch(ef: EditFields): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (ef.rnc_emisor)          patch.rnc_emisor           = ef.rnc_emisor
  if (ef.tipo_id)             patch.tipo_id              = parseInt(ef.tipo_id)
  if (ef.ncf)                 patch.ncf                  = ef.ncf
  if (ef.ncf_modificado)      patch.ncf_modificado       = ef.ncf_modificado
  if (ef.fecha_emision)       patch.fecha_emision        = ef.fecha_emision
  if (ef.fecha_pago)          patch.fecha_pago           = ef.fecha_pago
  if (ef.tipo_bs)             patch.tipo_bs              = ef.tipo_bs
  if (ef.tipo_ingreso)        patch.tipo_ingreso         = ef.tipo_ingreso
  if (ef.forma_pago)          patch.forma_pago           = ef.forma_pago
  if (ef.tasa_itbis)          patch.tasa_itbis           = parseInt(ef.tasa_itbis)

  const mc = (v: string) => pesosToCents(v)
  const maybeCents = (key: string, v: string) => { const c = mc(v); if (c !== undefined) patch[key] = c }

  maybeCents('monto_total_cent',              ef.monto_total)
  maybeCents('monto_subtotal_cent',           ef.monto_subtotal)
  maybeCents('monto_itbis_cent',              ef.monto_itbis)
  maybeCents('monto_servicios_cent',          ef.monto_servicios)
  maybeCents('monto_bienes_cent',             ef.monto_bienes)
  maybeCents('isc_cent',                      ef.isc)
  maybeCents('otros_impuestos_cent',          ef.otros_impuestos)
  maybeCents('propina_cent',                  ef.propina)
  maybeCents('itbis_retenido_cent',           ef.itbis_retenido)
  if (ef.tipo_retencion_isr)                  patch.tipo_retencion_isr          = ef.tipo_retencion_isr
  maybeCents('monto_retencion_renta_cent',    ef.monto_retencion_renta)
  maybeCents('isr_percibido_cent',            ef.isr_percibido)
  maybeCents('itbis_proporcionalidad_cent',   ef.itbis_proporcionalidad)
  maybeCents('itbis_costo_cent',              ef.itbis_costo)
  maybeCents('itbis_adelantar_cent',          ef.itbis_adelantar)
  maybeCents('itbis_percibido_cent',          ef.itbis_percibido)

  return patch
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CorrectorProps {
  queue: Factura[]
  startIndex: number
  onClose: () => void
  onChanged: () => void
  onComplete?: (resolved: number) => void
}

export default function Corrector({ queue, startIndex, onClose, onChanged, onComplete }: CorrectorProps) {
  const { getToken } = useAuth()
  const [idx, setIdx]           = useState(startIndex)
  const [imagen, setImagen]     = useState<{ url: string; isPdf: boolean } | null>(null)
  const [imagenLoading, setImagenLoading] = useState(false)
  const [editFields, setEditFields] = useState<EditFields | null>(null)
  const [saving, setSaving]     = useState(false)
  const [busy, setBusy]         = useState<'reintentar' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [zoom, setZoom]         = useState(1)
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: string; ncf: string | null } | null>(null)
  const resolved   = useRef(0)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const dragging   = useRef(false)
  const dragOrigin = useRef({ x: 0, y: 0, sl: 0, st: 0 })

  const current = queue[idx]
  const isLast  = idx + 1 >= queue.length
  const multi   = queue.length > 1
  const isMultiSource = current?.source_count != null && current.source_count > 1

  // Load image + reset on navigation
  useEffect(() => {
    if (!current) return
    let revoked = false
    let blobUrl: string | null = null
    setImagen(null)
    setImagenLoading(true)
    setEditFields(initEdit(current))
    setConfirmDelete(false)
    setActionError(null)
    setZoom(1)
    setDuplicateInfo(
      current.posible_duplicado_id
        ? { id: current.posible_duplicado_id, ncf: null }
        : null
    )
    ;(async () => {
      const token = await getToken()
      if (!token) { setImagenLoading(false); return }
      try {
        const img = await fetchFacturaImagen(token, current.id)
        blobUrl = img.url
        if (!revoked) setImagen(img)
        else URL.revokeObjectURL(img.url)
      } catch { /* imagen no disponible */ }
      finally { if (!revoked) setImagenLoading(false) }
    })()
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [current?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!current) return null

  function advanceOrFinish() {
    if (isLast) { onComplete?.(resolved.current); onClose() }
    else setIdx(i => i + 1)
  }

  async function persist(): Promise<boolean> {
    if (!editFields) return true
    const token = await getToken()
    if (!token) return false
    const result = await patchFactura(token, current.id, editToPatch(editFields)) as {
      posible_duplicado?: { id: string; ncf: string | null } | null
    }
    if (result.posible_duplicado) {
      setDuplicateInfo(result.posible_duplicado)
    }
    resolved.current += 1
    return true
  }

  async function handleSave(next: boolean) {
    setSaving(true)
    setActionError(null)
    try {
      if (!(await persist())) return
      onChanged()
      if (next) advanceOrFinish()
      else onClose()
    } catch (err) {
      setActionError(`No se pudo guardar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleReintentar() {
    setBusy('reintentar')
    setActionError(null)
    try {
      const token = await getToken()
      if (!token) return
      await reintentarFactura(token, current.id)
      resolved.current += 1
      onChanged()
      advanceOrFinish()
    } catch (err) {
      setActionError(`No se pudo reintentar: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setBusy(null) }
  }

  async function handleDelete() {
    setBusy('delete')
    setActionError(null)
    try {
      const token = await getToken()
      if (!token) return
      await deleteFactura(token, current.id)
      onChanged()
      advanceOrFinish()
    } catch (err) {
      setActionError(`No se pudo borrar: ${err instanceof Error ? err.message : String(err)}`)
      setConfirmDelete(false)
    } finally { setBusy(null) }
  }

  const set = (key: keyof EditFields) => (v: string) =>
    setEditFields(f => f ? { ...f, [key]: v } : f)

  const incompleto = editFields && (!editFields.rnc_emisor || !editFields.ncf || !editFields.monto_total)

  // Campos que la IA leyó con baja confianza o que no cuadran aritméticamente.
  const issues = fieldIssues(current)
  const descuadres = current.validacion_json?.warnings ?? []

  return (
    <div className="flow">
      {/* Header */}
      <div className="flow-head">
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Cerrar (Esc)">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-h2">Revisar factura</div>
          <div className="t-sm t-muted">
            {current.nombre_empresa ?? '—'} · {current.fecha_emision?.slice(0, 10) ?? 'sin fecha'} · {current.ncf ?? 'sin NCF'}
            {isMultiSource && (
              <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 500 }}>
                · Factura {(current.source_index ?? 0) + 1}/{current.source_count} del archivo
              </span>
            )}
          </div>
        </div>

        {multi && (
          <div className="row gap-2" style={{ marginRight: 4 }}>
            <button className="btn btn-ghost btn-icon" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))} title="Anterior">
              <ChevronLeft size={18} />
            </button>
            <span className="t-sm t-muted tnum" style={{ minWidth: 64, textAlign: 'center' }}>{idx + 1} de {queue.length}</span>
            <button className="btn btn-ghost btn-icon" disabled={isLast} onClick={() => setIdx(i => Math.min(queue.length - 1, i + 1))} title="Siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <FacturaBadge estado={current.estado} />
        <div style={{ width: 12 }} />

        {!confirmDelete ? (
          <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(true)} title="Borrar factura" disabled={busy !== null || saving}>
            <Trash2 size={16} style={{ color: 'var(--red-600)' }} />
          </button>
        ) : (
          <div className="row gap-2" style={{ padding: '0 4px' }}>
            <span className="t-sm" style={{ color: 'var(--red-700)' }}>¿Borrar?</span>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={busy === 'delete'}>
              {busy === 'delete' ? 'Borrando…' : 'Sí, borrar'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        )}

        {current.estado === 'error_extraccion' && (
          <button className="btn btn-secondary" onClick={handleReintentar} disabled={busy !== null}>
            <RotateCcw size={14} />{busy === 'reintentar' ? 'Reintentando…' : 'Reintentar'}
          </button>
        )}

        {editFields && (
          <>
            <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving || busy !== null}>
              {saving ? 'Guardando…' : 'Guardar y cerrar'}
            </button>
            {multi && !isLast ? (
              <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving || busy !== null}>
                <CheckCircle size={15} />Guardar y siguiente
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving || busy !== null}>
                <CheckCircle size={15} />Guardar
              </button>
            )}
          </>
        )}
      </div>

      {/* Body: 55/45 */}
      <div className="flow-body">
        {/* Image panel */}
        <div style={{ flex: '1 1 55%', background: 'var(--slate-900)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Zoom controls */}
          {imagen && !imagen.isPdf && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 12px', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} title="Alejar" disabled={zoom <= 0.5}>
                <ZoomOut size={14} style={{ color: 'var(--slate-300)' }} />
              </button>
              <span className="t-sm tnum" style={{ color: 'var(--slate-400)', alignSelf: 'center', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Acercar" disabled={zoom >= 4}>
                <ZoomIn size={14} style={{ color: 'var(--slate-300)' }} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--slate-400)', fontSize: 11 }} onClick={() => setZoom(1)}>Reset</button>
            </div>
          )}
          <div
            ref={scrollRef}
            style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: zoom === 1 ? 'center' : 'flex-start', justifyContent: zoom === 1 ? 'center' : 'flex-start', padding: 28, cursor: zoom > 1 ? 'grab' : 'default' }}
            onMouseDown={e => {
              if (zoom <= 1 || !scrollRef.current) return
              dragging.current = true
              dragOrigin.current = { x: e.clientX, y: e.clientY, sl: scrollRef.current.scrollLeft, st: scrollRef.current.scrollTop }
              e.preventDefault()
            }}
            onMouseMove={e => {
              if (!dragging.current || !scrollRef.current) return
              scrollRef.current.scrollLeft = dragOrigin.current.sl - (e.clientX - dragOrigin.current.x)
              scrollRef.current.scrollTop  = dragOrigin.current.st - (e.clientY - dragOrigin.current.y)
            }}
            onMouseUp={() => { dragging.current = false }}
            onMouseLeave={() => { dragging.current = false }}
          >
            {imagenLoading ? (
              <div className="ai-processing">
                <div className="ai-orb"><Sparkles size={22} /></div>
                <div className="t-sm" style={{ color: 'var(--text-on-dark-muted)' }}>Cargando imagen…</div>
              </div>
            ) : imagen ? (
              imagen.isPdf ? (
                <iframe src={imagen.url} title="Factura PDF" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6 }} />
              ) : (
                <img
                  src={imagen.url}
                  alt="Factura"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 6,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    cursor: zoom > 1 ? 'inherit' : 'zoom-in',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.15s',
                    userSelect: 'none',
                  }}
                  onClick={e => {
                    if (dragging.current) return
                    setZoom(z => z >= 4 ? 1 : Math.min(4, z + 0.5))
                  }}
                />
              )
            ) : (
              <div style={{ color: 'var(--slate-500)', fontSize: 13, textAlign: 'center' }}>
                <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div>Imagen no disponible</div>
              </div>
            )}
          </div>
        </div>

        {/* Fields panel */}
        <div style={{ flex: '1 1 45%', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', overflow: 'auto' }}>
          <div style={{ padding: '24px 28px', maxWidth: 520 }}>

            {/* Duplicate alert */}
            {duplicateInfo && (
              <div className="row gap-3" style={{ marginBottom: 16, padding: '10px 13px', background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 8 }}>
                <Copy size={15} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="t-sm" style={{ color: 'var(--amber-800)', fontWeight: 500 }}>Posible duplicado detectado</div>
                  <div style={{ fontSize: 11, color: 'var(--amber-700)', marginTop: 2 }}>
                    Ya existe una factura con el mismo NCF o datos similares. Verifica antes de guardar.
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDuplicateInfo(null)} title="Ignorar alerta">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Error/warning banners */}
            {actionError && (
              <div className="row gap-3" style={{ marginBottom: 16, padding: '10px 13px', background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 8 }}>
                <X size={16} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                <div className="t-sm" style={{ color: 'var(--red-700)' }}>{actionError}</div>
              </div>
            )}
            {current.estado === 'pendiente_revision' && (
              <div className="row gap-3" style={{ marginBottom: 16, padding: '10px 13px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber-600)', flexShrink: 0, marginTop: 1 }} />
                <div className="t-sm" style={{ color: 'var(--amber-700)' }}>
                  {descuadres.length > 0 ? (
                    <>
                      <div style={{ fontWeight: 500 }}>Los montos no cuadran:</div>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {descuadres.map((w, i) => <li key={i}>{w.mensaje}</li>)}
                      </ul>
                    </>
                  ) : (
                    'OCR con baja confianza. Revisa los campos resaltados contra la imagen.'
                  )}
                </div>
              </div>
            )}
            {current.estado === 'error_extraccion' && current.ultimo_error && (
              <div className="row gap-3" style={{ marginBottom: 16, padding: '10px 13px', background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 8 }}>
                <X size={16} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                <div>
                  <div className="t-sm" style={{ color: 'var(--red-700)', fontWeight: 500 }}>{friendlyError(current.ultimo_error)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, wordBreak: 'break-all' }}>{current.ultimo_error}</div>
                </div>
              </div>
            )}

            {editFields ? (
              <>
                {/* ── Sección: Emisor ── */}
                <SectionLabel>Emisor</SectionLabel>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EF label="RNC / Cédula" value={editFields.rnc_emisor} mono onChange={set('rnc_emisor')} issue={issues.rnc_emisor} />
                  </div>
                  <div style={{ width: 130 }}>
                    <label className="field-label">Tipo ID</label>
                    <select className="input" value={editFields.tipo_id} onChange={e => set('tipo_id')(e.target.value)}>
                      <option value="">— auto —</option>
                      {Object.entries(TIPO_ID_LABEL).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EF label="NCF" value={editFields.ncf} mono onChange={set('ncf')} placeholder="B01... o E31..." issue={issues.ncf} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <EF label="NCF Modificado" value={editFields.ncf_modificado} mono onChange={set('ncf_modificado')} placeholder="nota crédito/débito" />
                  </div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EF label="Fecha comprobante" value={editFields.fecha_emision} type="date" onChange={set('fecha_emision')} issue={issues.fecha_emision} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <EF label="Fecha pago" value={editFields.fecha_pago} type="date" onChange={set('fecha_pago')} />
                  </div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Tipo Bienes/Servicios</label>
                    <select className="input" value={editFields.tipo_bs} onChange={e => set('tipo_bs')(e.target.value)}>
                      <option value="">—</option>
                      {Object.entries(TIPO_BS_LABEL).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Tipo Ingreso (607)</label>
                    <select className="input" value={editFields.tipo_ingreso} onChange={e => set('tipo_ingreso')(e.target.value)}>
                      {Object.entries(TIPO_INGRESO_LABEL).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Sección: Montos ── */}
                <SectionLabel style={{ marginTop: 20 }}>Montos</SectionLabel>
                <div className="row gap-3">
                  <EF label="Total facturado (RD$)" value={editFields.monto_total} type="number" mono onChange={set('monto_total')} issue={issues.monto_total} />
                  <EF label="Subtotal / base (RD$)" value={editFields.monto_subtotal} type="number" mono onChange={set('monto_subtotal')} issue={issues.monto_subtotal} />
                </div>
                <div className="row gap-3">
                  <EF label="ITBIS (RD$)" value={editFields.monto_itbis} type="number" mono onChange={set('monto_itbis')} issue={issues.monto_itbis} />
                  <div style={{ width: 130 }}>
                    <label className="field-label">Tasa ITBIS</label>
                    <select className="input" value={editFields.tasa_itbis} onChange={e => set('tasa_itbis')(e.target.value)}>
                      <option value="">—</option>
                      <option value="16">16%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Forma de pago</label>
                    <select className="input" value={editFields.forma_pago} onChange={e => set('forma_pago')(e.target.value)}>
                      <option value="">—</option>
                      {Object.entries(FORMA_PAGO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="row gap-3">
                  <EF label="Monto servicios" value={editFields.monto_servicios} type="number" mono onChange={set('monto_servicios')} issue={issues.monto_servicios} />
                  <EF label="Monto bienes" value={editFields.monto_bienes} type="number" mono onChange={set('monto_bienes')} issue={issues.monto_bienes} />
                </div>
                <div className="row gap-3">
                  <EF label="ISC (Imp. Selectivo)" value={editFields.isc} type="number" mono onChange={set('isc')} issue={issues.isc} />
                  <EF label="Otros impuestos" value={editFields.otros_impuestos} type="number" mono onChange={set('otros_impuestos')} issue={issues.otros_impuestos} />
                </div>
                <EF label="Propina legal (RD$)" value={editFields.propina} type="number" mono onChange={set('propina')} issue={issues.propina} />

                {/* ── Sección: ITBIS/ISR manual ── */}
                <SectionLabel style={{ marginTop: 20 }}>Retenciones (manual)</SectionLabel>
                <div className="field-note" style={{ marginBottom: 12 }}>
                  Estos campos no se pueden extraer de la factura. Llénalos a mano según corresponda.
                </div>
                <div className="row gap-3">
                  <EF label="ITBIS Retenido" value={editFields.itbis_retenido} type="number" mono onChange={set('itbis_retenido')} />
                  <EF label="ITBIS Percibido" value={editFields.itbis_percibido} type="number" mono onChange={set('itbis_percibido')} />
                </div>
                <div className="row gap-3">
                  <EF label="ITBIS Proporcionalidad Art.349" value={editFields.itbis_proporcionalidad} type="number" mono onChange={set('itbis_proporcionalidad')} />
                  <EF label="ITBIS al Costo" value={editFields.itbis_costo} type="number" mono onChange={set('itbis_costo')} />
                </div>
                <EF label="ITBIS por Adelantar" value={editFields.itbis_adelantar} type="number" mono onChange={set('itbis_adelantar')} />
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EF label="Tipo Retención ISR" value={editFields.tipo_retencion_isr} onChange={set('tipo_retencion_isr')} placeholder="ej: 01, 02…" />
                  </div>
                  <EF label="Monto Retención Renta" value={editFields.monto_retencion_renta} type="number" mono onChange={set('monto_retencion_renta')} />
                </div>
                <EF label="ISR Percibido en Compras" value={editFields.isr_percibido} type="number" mono onChange={set('isr_percibido')} />

                {incompleto && (
                  <div className="field-note warn" style={{ marginTop: 8 }}>
                    <AlertTriangle size={12} />Faltan campos críticos (RNC, NCF o monto total). Puedes guardar igual.
                  </div>
                )}

                {/* resumen de montos */}
                {editFields.monto_total && (
                  <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="t-muted">Total facturado</span>
                      <span className="tnum cell-strong">{fmtMoney(pesosToCents(editFields.monto_total) ?? null)}</span>
                    </div>
                    {editFields.monto_itbis && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="t-muted">ITBIS</span>
                        <span className="tnum">{fmtMoney(pesosToCents(editFields.monto_itbis) ?? null)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <SectionLabel>Emisor</SectionLabel>
                <RF label="RNC / Cédula"  value={current.rnc_emisor ?? ''} mono />
                <RF label="Tipo ID"        value={current.tipo_id ? `${current.tipo_id} — ${TIPO_ID_LABEL[current.tipo_id] ?? ''}` : ''} />
                <RF label="NCF"            value={current.ncf ?? ''} mono />
                <RF label="NCF Modificado" value={current.ncf_modificado ?? ''} mono />
                <RF label="Fecha emisión"  value={current.fecha_emision?.slice(0, 10) ?? ''} />
                <RF label="Fecha pago"     value={current.fecha_pago?.slice(0, 10) ?? ''} />
                <SectionLabel style={{ marginTop: 16 }}>Montos</SectionLabel>
                <RF label="Total"   value={fmtMoney(current.monto_total_cent)} />
                <RF label="ITBIS"   value={fmtMoney(current.monto_itbis_cent)} />
                <RF label="Tasa"    value={current.tasa_itbis ? `${current.tasa_itbis}%` : ''} />
                <RF label="Propina" value={fmtMoney(current.propina_cent)} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="upper-label" style={{ marginBottom: 12, ...style }}>{children}</div>
}

function EF({ label, value, type = 'text', mono, onChange, placeholder, issue }: {
  label: string; value: string; type?: string; mono?: boolean
  onChange: (v: string) => void; placeholder?: string; issue?: CampoIssue
}) {
  // Descuadre aritmético = rojo (dato probablemente errado); baja confianza = ámbar.
  const tint = issue?.level === 'descuadre' ? 'var(--red-600)' : 'var(--amber-500)'
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label className="field-label row gap-2" style={issue ? { color: tint } : undefined}>
        {label}
        {issue && <AlertTriangle size={12} style={{ color: tint }} />}
      </label>
      <input
        className={`input${mono ? ' mono' : ''}`}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        style={issue ? { borderColor: tint, boxShadow: `0 0 0 1px ${tint}` } : undefined}
      />
      {issue && (
        <div style={{ fontSize: 11, color: tint, marginTop: 4 }}>{issue.mensaje}</div>
      )}
    </div>
  )
}

function RF({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
      <div className="field-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? 'var(--text-strong)' : 'var(--text-faint)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  )
}
