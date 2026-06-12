import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  ArrowLeft, X, CheckCircle, RotateCcw, Trash2, AlertTriangle,
  FileText, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { patchFactura, fetchFacturaImagen, reintentarFactura, deleteFactura } from '../lib/api'
import { Factura, friendlyError, fmtMoney } from '../lib/factura'
import FacturaBadge from './FacturaBadge'

type EditFields = {
  rnc_emisor: string
  ncf: string
  fecha_emision: string
  monto_total: string
  monto_itbis: string
  tasa_itbis: string
}

function initEdit(f: Factura): EditFields | null {
  if (f.estado !== 'pendiente_revision' && f.estado !== 'procesada') return null
  return {
    rnc_emisor:    f.rnc_emisor ?? '',
    ncf:           f.ncf ?? '',
    fecha_emision: f.fecha_emision?.slice(0, 10) ?? '',
    monto_total:   f.monto_total_cent != null ? (f.monto_total_cent / 100).toFixed(2) : '',
    monto_itbis:   f.monto_itbis_cent != null ? (f.monto_itbis_cent / 100).toFixed(2) : '',
    tasa_itbis:    f.tasa_itbis != null ? String(f.tasa_itbis) : '',
  }
}

interface CorrectorProps {
  queue: Factura[]
  startIndex: number
  onClose: () => void
  onChanged: () => void                       // parent refetches its data
  onComplete?: (resolved: number) => void     // queue walked to the end
}

export default function Corrector({ queue, startIndex, onClose, onChanged, onComplete }: CorrectorProps) {
  const { getToken } = useAuth()
  const [idx, setIdx] = useState(startIndex)
  const [imagen, setImagen] = useState<{ url: string; isPdf: boolean } | null>(null)
  const [imagenLoading, setImagenLoading] = useState(false)
  const [editFields, setEditFields] = useState<EditFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<'reintentar' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const resolved = useRef(0)

  const current = queue[idx]
  const isLast = idx + 1 >= queue.length
  const multi = queue.length > 1

  // Load image + reset fields whenever the current factura changes.
  useEffect(() => {
    if (!current) return
    let revoked = false
    let blobUrl: string | null = null
    setImagen(null)
    setImagenLoading(true)
    setEditFields(initEdit(current))
    setConfirmDelete(false)
    ;(async () => {
      const token = await getToken()
      if (!token) { setImagenLoading(false); return }
      try {
        const img = await fetchFacturaImagen(token, current.id)
        blobUrl = img.url
        if (!revoked) setImagen(img)
        else URL.revokeObjectURL(img.url)
      } catch {
        /* imagen no disponible */
      } finally {
        if (!revoked) setImagenLoading(false)
      }
    })()
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [current?.id])

  // Escape closes.
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
    await patchFactura(token, current.id, {
      rnc_emisor:       editFields.rnc_emisor    || undefined,
      ncf:              editFields.ncf           || undefined,
      fecha_emision:    editFields.fecha_emision || undefined,
      monto_total_cent: editFields.monto_total   ? Math.round(parseFloat(editFields.monto_total) * 100) : undefined,
      monto_itbis_cent: editFields.monto_itbis   ? Math.round(parseFloat(editFields.monto_itbis) * 100) : undefined,
      tasa_itbis:       editFields.tasa_itbis    ? parseInt(editFields.tasa_itbis) : undefined,
    })
    resolved.current += 1
    return true
  }

  async function handleSave(next: boolean) {
    setSaving(true)
    try {
      if (!(await persist())) return
      onChanged()
      if (next) advanceOrFinish()
      else onClose()
    } catch (err) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleReintentar() {
    setBusy('reintentar')
    try {
      const token = await getToken()
      if (!token) return
      await reintentarFactura(token, current.id)
      resolved.current += 1
      onChanged()
      advanceOrFinish()
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    setBusy('delete')
    try {
      const token = await getToken()
      if (!token) return
      await deleteFactura(token, current.id)
      onChanged()
      // Drop the deleted item from the local queue view by advancing.
      advanceOrFinish()
    } catch (err) {
      alert(`Error al borrar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
      setConfirmDelete(false)
    }
  }

  const incompleto = editFields && (!editFields.rnc_emisor || !editFields.ncf || !editFields.monto_total)

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
            {multi && !isLast && (
              <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving || busy !== null}>
                <CheckCircle size={15} />Guardar y siguiente
              </button>
            )}
            {(!multi || isLast) && (
              <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving || busy !== null}>
                <CheckCircle size={15} />Guardar
              </button>
            )}
          </>
        )}
      </div>

      {/* Body: 55/45 */}
      <div className="flow-body">
        {/* Image */}
        <div style={{ flex: '1 1 55%', background: 'var(--slate-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 28 }}>
          {imagenLoading ? (
            <div className="ai-processing">
              <div className="ai-orb"><Sparkles size={22} /></div>
              <div className="t-sm" style={{ color: 'var(--text-on-dark-muted)' }}>Cargando imagen…</div>
            </div>
          ) : imagen ? (
            imagen.isPdf ? (
              <iframe src={imagen.url} title="Factura PDF" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6 }} />
            ) : (
              <img src={imagen.url} alt="Factura" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }} />
            )
          ) : (
            <div style={{ color: 'var(--slate-500)', fontSize: 13, textAlign: 'center' }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>Imagen no disponible</div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ flex: '1 1 45%', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', overflow: 'auto' }}>
          <div style={{ padding: '24px 28px', maxWidth: 480 }}>
            {current.estado === 'pendiente_revision' && (
              <div className="row gap-3" style={{ marginBottom: 18, padding: '10px 13px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 8 }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
                <div className="t-sm" style={{ color: 'var(--amber-700)' }}>OCR con baja confianza. Verifica los campos contra la imagen.</div>
              </div>
            )}
            {current.estado === 'error_extraccion' && current.ultimo_error && (
              <div className="row gap-3" style={{ marginBottom: 18, padding: '10px 13px', background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 8 }}>
                <X size={16} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
                <div>
                  <div className="t-sm" style={{ color: 'var(--red-700)', fontWeight: 500 }}>{friendlyError(current.ultimo_error)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, wordBreak: 'break-all' }}>{current.ultimo_error}</div>
                </div>
              </div>
            )}

            <div className="upper-label" style={{ marginBottom: 14 }}>Datos del emisor</div>

            {editFields ? (
              <>
                <EditField label="RNC Emisor" value={editFields.rnc_emisor} mono onChange={v => setEditFields(f => f && { ...f, rnc_emisor: v })} />
                <EditField label="NCF" value={editFields.ncf} mono onChange={v => setEditFields(f => f && { ...f, ncf: v })} />
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EditField label="Fecha emisión" value={editFields.fecha_emision} type="date" onChange={v => setEditFields(f => f && { ...f, fecha_emision: v })} />
                  </div>
                  <div style={{ width: 130 }}>
                    <label className="field-label">Tasa ITBIS</label>
                    <select className="input" value={editFields.tasa_itbis} onChange={e => setEditFields(f => f && { ...f, tasa_itbis: e.target.value })}>
                      <option value="">—</option>
                      <option value="16">16%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </div>

                <div className="upper-label" style={{ margin: '18px 0 14px' }}>Montos</div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <EditField label="Monto total (RD$)" value={editFields.monto_total} type="number" mono onChange={v => setEditFields(f => f && { ...f, monto_total: v })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <EditField label="ITBIS (RD$)" value={editFields.monto_itbis} type="number" mono onChange={v => setEditFields(f => f && { ...f, monto_itbis: v })} />
                  </div>
                </div>

                {incompleto && (
                  <div className="field-note warn" style={{ marginTop: 4 }}>
                    <AlertTriangle size={12} />Faltan campos (RNC, NCF o monto). Puedes guardar igual, pero revisa.
                  </div>
                )}
              </>
            ) : (
              <>
                <ReadField label="RNC Emisor"    value={current.rnc_emisor ?? ''} mono />
                <ReadField label="NCF"           value={current.ncf ?? ''} mono />
                <ReadField label="Fecha emisión" value={current.fecha_emision?.slice(0, 10) ?? ''} />
                <ReadField label="Monto total"   value={fmtMoney(current.monto_total_cent)} />
                <ReadField label="ITBIS"         value={fmtMoney(current.monto_itbis_cent)} />
                <ReadField label="Tasa ITBIS"    value={current.tasa_itbis ? `${current.tasa_itbis}%` : ''} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
