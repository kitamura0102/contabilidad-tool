import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { RefreshCw, CheckCircle, ChevronRight } from 'lucide-react'
import { getFacturas, reintentarFactura, marcarRevisada, deleteFactura } from '../lib/api'
import { Factura, NECESITA_ATENCION, friendlyError, fmtMoney } from '../lib/factura'
import Topbar from '../components/Topbar'
import Avatar from '../components/Avatar'
import FacturaBadge from '../components/FacturaBadge'
import TableSkeleton from '../components/TableSkeleton'
import BulkBar, { BulkAction } from '../components/BulkBar'
import Corrector from '../components/Corrector'
import Toast from '../components/Toast'

type Filtro = 'todas' | 'revisar' | 'errores'

const FILTRO_LABEL: Record<Filtro, string> = { todas: 'Todas', revisar: 'Por revisar', errores: 'Errores' }

export default function Bandeja() {
  const { getToken } = useAuth()
  const [params, setParams] = useSearchParams()
  const initialFiltro = (params.get('filtro') as Filtro) || 'todas'

  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>(['todas', 'revisar', 'errores'].includes(initialFiltro) ? initialFiltro : 'todas')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<BulkAction | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [correctorIdx, setCorrectorIdx] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load(showSpinner = false) {
    const token = await getToken()
    if (!token) return
    if (showSpinner) setRefreshing(true)
    try {
      // El endpoint filtra por un estado; pedimos los dos que necesitan atención y los unimos.
      const [rev, err] = await Promise.all([
        getFacturas(token, { estado: 'pendiente_revision' }),
        getFacturas(token, { estado: 'error_extraccion' }),
      ])
      const merged: Factura[] = [...rev, ...err].sort(
        (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      )
      setFacturas(merged)
      // Drop selections that no longer exist.
      setSelected(prev => new Set([...prev].filter(id => merged.some(f => f.id === id))))
    } finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }

  const filtered = useMemo(() => facturas.filter(f =>
    filtro === 'revisar' ? f.estado === 'pendiente_revision' :
    filtro === 'errores' ? f.estado === 'error_extraccion' :
    NECESITA_ATENCION.includes(f.estado)
  ), [facturas, filtro])

  const counts = useMemo(() => ({
    todas: facturas.length,
    revisar: facturas.filter(f => f.estado === 'pendiente_revision').length,
    errores: facturas.filter(f => f.estado === 'error_extraccion').length,
  }), [facturas])

  const selectedFacturas = filtered.filter(f => selected.has(f.id))
  const canReintentar = selectedFacturas.length
  const canRevisar = selectedFacturas.filter(f => f.estado === 'pendiente_revision').length

  const allVisibleSelected = filtered.length > 0 && filtered.every(f => selected.has(f.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map(f => f.id)))
  }
  function changeFiltro(f: Filtro) {
    setFiltro(f)
    setSelected(new Set())
    setParams(f === 'todas' ? {} : { filtro: f }, { replace: true })
  }

  async function runBulk(action: BulkAction, ids: string[], fn: (token: string, id: string) => Promise<void>, label: string) {
    const token = await getToken()
    if (!token || ids.length === 0) return
    setBusy(action)
    setProgress({ done: 0, total: ids.length })
    let done = 0
    let ok = 0
    for (const id of ids) {
      try { await fn(token, id); ok += 1 } catch { /* continúa con el resto */ }
      done += 1
      setProgress({ done, total: ids.length })
    }
    setProgress(null)
    setBusy(null)
    setSelected(new Set())
    await load()
    setToast(
      ok === ids.length
        ? `${ok} factura${ok !== 1 ? 's' : ''} ${label}`
        : `${ok} de ${ids.length} ${label} · ${ids.length - ok} con error`
    )
  }

  const doReintentar = () => runBulk('reintentar', selectedFacturas.map(f => f.id), reintentarFactura, 'reencoladas')
  const doRevisar = () => runBulk('revisar', selectedFacturas.filter(f => f.estado === 'pendiente_revision').map(f => f.id), marcarRevisada, 'marcadas como revisadas')
  const doDelete = () => { setConfirmDelete(false); runBulk('delete', selectedFacturas.map(f => f.id), deleteFactura, 'borradas') }

  return (
    <>
      <Topbar
        title="Bandeja"
        subtitle={loading ? undefined : `${counts.todas} factura${counts.todas !== 1 ? 's' : ''} necesita${counts.todas === 1 ? '' : 'n'} tu atención`}
        actions={
          <button className="btn btn-ghost btn-icon" onClick={() => load(true)} disabled={refreshing} title="Actualizar">
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
        }
      />

      <div className="content">
        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {(['todas', 'revisar', 'errores'] as Filtro[]).map(f => (
            <button key={f} className={`tab${filtro === f ? ' active' : ''}`} onClick={() => changeFiltro(f)}>
              {FILTRO_LABEL[f]}<span className="tab-count">{counts[f]}</span>
            </button>
          ))}
        </div>

        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="check-cell">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Seleccionar todas" disabled={filtered.length === 0} />
                  </th>
                  <th style={{ width: '22%' }}>Cliente</th>
                  <th>Estado</th>
                  <th>RNC Emisor</th>
                  <th>NCF</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>ITBIS</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} widths={['16px', 60, 70, 70, 70, 55, 60, 60, 16]} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '56px 24px', textAlign: 'center' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-600)' }}>
                          <CheckCircle size={24} />
                        </div>
                        <div>
                          <div className="t-h3">Bandeja vacía</div>
                          <div className="t-sm t-muted" style={{ marginTop: 2 }}>
                            {filtro === 'errores' ? 'No hay facturas en error.' : filtro === 'revisar' ? 'Nada por revisar.' : 'Todo está procesado.'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    className={`clickable${selected.has(f.id) ? ' selected' : ''}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`Revisar factura de ${f.nombre_empresa ?? 'cliente'}`}
                    onClick={() => setCorrectorIdx(i)}
                    onKeyDown={e => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCorrectorIdx(i) }
                    }}
                  >
                    <td className="check-cell" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} aria-label={`Seleccionar factura de ${f.nombre_empresa ?? 'cliente'}`} />
                    </td>
                    <td>
                      <div className="cell-name">
                        <Avatar name={f.nombre_empresa ?? '?'} size={26} tone="slate" />
                        <span className="cell-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{f.nombre_empresa ?? '—'}</span>
                      </div>
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
                    <td><ChevronRight size={15} style={{ color: 'var(--text-faint)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
