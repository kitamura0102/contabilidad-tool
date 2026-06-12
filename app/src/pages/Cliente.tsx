import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import {
  Upload, RefreshCw, Download, FileText, Search,
  AlertTriangle, CheckCircle, Pencil, ChevronRight, Sparkles,
} from 'lucide-react'
import {
  getCliente, getFacturas, uploadFactura, downloadReporte,
  reintentarFactura, marcarRevisada, deleteFactura,
} from '../lib/api'
import { Factura, fmtMoney, friendlyError } from '../lib/factura'
import Topbar from '../components/Topbar'
import FacturaBadge from '../components/FacturaBadge'
import TableSkeleton from '../components/TableSkeleton'
import BulkBar, { BulkAction } from '../components/BulkBar'
import Corrector from '../components/Corrector'
import Toast from '../components/Toast'

type ClienteData = {
  id: string
  nombre_empresa: string
  rnc: string
  sector: string | null
}

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
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<BulkAction | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [correctorIdx, setCorrectorIdx] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { if (id) load() }, [id, tab])

  // Auto-refresh while anything is still processing.
  useEffect(() => {
    const hasPending = facturas.some(f => f.estado === 'en_cola' || f.estado === 'procesando')
    if (!hasPending) return
    const timer = setInterval(() => load(), 10_000)
    return () => clearInterval(timer)
  }, [facturas])

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
      setSelected(prev => new Set([...prev].filter(sid => (f as Factura[]).some(x => x.id === sid))))
    } finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !id) return
    setUploading(true)
    const token = await getToken()
    if (!token) { setUploading(false); return }
    try {
      const results = await Promise.allSettled(
        files.map(file => uploadFactura(token, { file, cliente_id: id, tipo: tab }))
      )
      const ok = results.filter(r => r.status === 'fulfilled').length
      await load()
      if (files.length > 1) setToast(`${ok} de ${files.length} facturas subidas`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDownload(tipo: '606' | '607', formato: 'txt' | 'xlsx') {
    const token = await getToken()
    if (!token || !id) return
    const procesadas = facturas.filter(f => f.estado === 'procesada' && f.fecha_emision?.slice(0, 7) === periodo).length
    if (procesadas === 0) {
      alert(`No hay facturas procesadas en ${periodo}.\n\nSolo se exportan facturas en estado "Procesada".`)
      return
    }
    try {
      await downloadReporte(token, id, tipo, periodo.replace('-', ''), formato, cliente?.nombre_empresa)
    } catch (err) {
      alert(`No se pudo exportar:\n${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Bulk ──
  async function runBulk(action: BulkAction, ids: string[], fn: (token: string, id: string) => Promise<void>, label: string) {
    const token = await getToken()
    if (!token || ids.length === 0) return
    setBusy(action)
    setProgress({ done: 0, total: ids.length })
    let done = 0
    for (const fid of ids) {
      try { await fn(token, fid) } catch { /* sigue */ }
      done += 1
      setProgress({ done, total: ids.length })
    }
    setProgress(null)
    setBusy(null)
    setSelected(new Set())
    await load()
    setToast(`${done} factura${done !== 1 ? 's' : ''} ${label}`)
  }

  const periodoYM = periodo
  const procesadasDelPeriodo = facturas.filter(f => f.estado === 'procesada' && f.fecha_emision?.slice(0, 7) === periodoYM).length
  const hasPending = facturas.some(f => f.estado === 'en_cola' || f.estado === 'procesando')
  const conRevision = facturas.filter(f => f.estado === 'pendiente_revision' || f.estado === 'error_extraccion').length

  const filtered = useMemo(() => facturas.filter(f =>
    !q || (f.rnc_emisor ?? '').includes(q) || (f.ncf ?? '').toLowerCase().includes(q.toLowerCase())
  ), [facturas, q])

  const selectedFacturas = filtered.filter(f => selected.has(f.id))
  const canReintentar = selectedFacturas.filter(f => f.estado === 'error_extraccion').length
  const canRevisar = selectedFacturas.filter(f => f.estado === 'pendiente_revision').length
  const allVisibleSelected = filtered.length > 0 && filtered.every(f => selected.has(f.id))

  function toggle(fid: string) {
    setSelected(prev => { const next = new Set(prev); next.has(fid) ? next.delete(fid) : next.add(fid); return next })
  }
  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map(f => f.id)))
  }

  const doReintentar = () => runBulk('reintentar', selectedFacturas.filter(f => f.estado === 'error_extraccion').map(f => f.id), reintentarFactura, 'reencoladas')
  const doRevisar = () => runBulk('revisar', selectedFacturas.filter(f => f.estado === 'pendiente_revision').map(f => f.id), marcarRevisada, 'marcadas como revisadas')
  const doDelete = () => { setConfirmDelete(false); runBulk('delete', selectedFacturas.map(f => f.id), deleteFactura, 'borradas') }

  const tipoLabel = (tab === 'compra' ? '606' : '607') as '606' | '607'

  return (
    <>
      <Topbar
        title={cliente?.nombre_empresa ?? '…'}
        crumbs={['Clientes', cliente?.nombre_empresa ?? '…']}
        onBack={() => navigate('/app')}
        periodo
        periodoValue={periodo}
        onPeriodoChange={setPeriodo}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => handleDownload(tipoLabel, 'txt')} disabled={procesadasDelPeriodo === 0} title="Archivo .txt oficial para la DGII">
              <FileText size={15} />Exportar {tipoLabel} (.txt)
            </button>
            <button className="btn btn-secondary" onClick={() => handleDownload(tipoLabel, 'xlsx')} disabled={procesadasDelPeriodo === 0} title="Hoja Excel para revisión">
              <Download size={15} />Excel
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              {uploading ? <><Sparkles size={15} className="spin" />Subiendo…</> : <><Upload size={15} />Subir facturas</>}
              <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={handleUpload} style={{ display: 'none' }} />
            </label>
          </>
        }
      />

      <div className="content">
        {cliente && (
          <div className="row gap-3" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
            <span className="t-label">RNC</span>
            <span className="mono cell-strong" style={{ fontSize: 13 }}>{cliente.rnc}</span>
            {cliente.sector && (<><span style={{ color: 'var(--text-faint)' }}>·</span><span className="t-sm cell-strong">{cliente.sector}</span></>)}
            <div className="spacer" />
            {hasPending && (<span className="t-sm t-muted row gap-2"><Sparkles size={13} style={{ color: 'var(--accent)' }} />Actualizando cada 10s</span>)}
            <button className="btn btn-ghost btn-icon" onClick={() => load(true)} disabled={refreshing} title="Actualizar"><RefreshCw size={15} className={refreshing ? 'spin' : ''} /></button>
          </div>
        )}

        <div className="tabs">
          {(['compra', 'venta'] as const).map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setSelected(new Set()) }}>
              {t === 'compra' ? 'Compras (606)' : 'Ventas (607)'}
              <span className="tab-count">{facturas.filter(f => f.tipo === t).length}</span>
            </button>
          ))}
        </div>

        <div style={{ height: 16 }} />

        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input placeholder="Buscar por RNC o NCF…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {conRevision > 0 && (<span className="badge badge-amber"><AlertTriangle size={11} />{conRevision} por revisar</span>)}
          <div className="spacer" />
          <span className="t-sm t-muted">{filtered.length} factura{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="check-cell">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Seleccionar todas" disabled={filtered.length === 0} />
                  </th>
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
                {loading ? (
                  <TableSkeleton rows={5} widths={['16px', 70, 70, 70, 55, 60, 60, 35, 16]} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No hay facturas. Sube las primeras con "Subir facturas".
                    </td>
                  </tr>
                ) : filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    className={`clickable${selected.has(f.id) ? ' selected' : ''}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`Revisar factura ${f.ncf ?? f.rnc_emisor ?? f.id}`}
                    onClick={() => setCorrectorIdx(i)}
                    onKeyDown={e => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCorrectorIdx(i) }
                    }}
                  >
                    <td className="check-cell" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} aria-label="Seleccionar factura" />
                    </td>
                    <td>
                      <FacturaBadge estado={f.estado} />
                      {f.estado === 'error_extraccion' && f.ultimo_error && (
                        <div style={{ fontSize: 11, color: 'var(--red-700)', marginTop: 3, maxWidth: 200 }}>{friendlyError(f.ultimo_error)}</div>
                      )}
                    </td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{f.rnc_emisor ?? <span className="muted-cell">—</span>}</span></td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{f.ncf ?? <span className="muted-cell">—</span>}</span></td>
                    <td className="mono" style={{ fontSize: 12 }}>{f.fecha_emision?.slice(0, 10) ?? <span className="muted-cell">—</span>}</td>
                    <td className="num cell-strong">{fmtMoney(f.monto_total_cent)}</td>
                    <td className="num">{fmtMoney(f.monto_itbis_cent)}</td>
                    <td className="t-muted" style={{ fontSize: 12 }}>{f.tasa_itbis ? `${f.tasa_itbis}%` : <span className="muted-cell">—</span>}</td>
                    <td>{f.estado === 'pendiente_revision' ? <Pencil size={15} style={{ color: 'var(--amber-600)' }} /> : <ChevronRight size={15} style={{ color: 'var(--text-faint)' }} />}</td>
                  </tr>
                ))}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5}>Totales · {filtered.length} factura{filtered.length !== 1 ? 's' : ''}</td>
                    <td className="num">{fmtMoney(filtered.reduce((s, f) => s + (f.monto_total_cent ?? 0), 0))}</td>
                    <td className="num">{fmtMoney(filtered.reduce((s, f) => s + (f.monto_itbis_cent ?? 0), 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="t-sm t-muted row gap-2" style={{ marginTop: 12 }}>
            <CheckCircle size={13} style={{ color: 'var(--green-600)' }} />
            Haz clic en una fila para ver la imagen y editar. Selecciona varias para acciones en lote.
          </div>
        )}
      </div>

      <BulkBar
        count={selectedFacturas.length}
        canReintentar={canReintentar}
        canRevisar={canRevisar}
        busy={busy}
        progress={progress}
        onReintentar={doReintentar}
        onRevisar={doRevisar}
        onDelete={() => setConfirmDelete(true)}
        onClear={() => setSelected(new Set())}
      />

      {confirmDelete && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(false) }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-body">
              <div className="t-h2">Borrar {selectedFacturas.length} factura{selectedFacturas.length !== 1 ? 's' : ''}</div>
              <div className="t-sm t-muted">Esta acción no se puede deshacer. Se eliminan las facturas y sus imágenes.</div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={doDelete}>Borrar</button>
            </div>
          </div>
        </div>
      )}

      {correctorIdx !== null && filtered[correctorIdx] && (
        <Corrector
          queue={filtered}
          startIndex={correctorIdx}
          onClose={() => setCorrectorIdx(null)}
          onChanged={() => load()}
          onComplete={n => { if (n > 0) setToast(`Revisaste ${n} factura${n !== 1 ? 's' : ''}`) }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
