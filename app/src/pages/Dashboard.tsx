import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Users, CheckCircle, AlertTriangle, Search, Plus, ChevronRight, X } from 'lucide-react'
import { getClientes, createCliente } from '../lib/api'
import Topbar from '../components/Topbar'
import Avatar from '../components/Avatar'
import TableSkeleton from '../components/TableSkeleton'

type Cliente = {
  id: string
  nombre_empresa: string
  rnc: string
  sector: string | null
  facturas_pendientes: number
  facturas_revision: number
  facturas_listas: number
  activo: boolean
}

type Tone = 'blue' | 'green' | 'amber' | 'slate'

const SECTOR_TONE: Record<string, Tone> = {
  Comercio: 'blue', Restaurante: 'amber', Salud: 'green',
  Servicios: 'slate', Construcción: 'slate',
}

function clienteEstado(c: Cliente): { cls: string; txt: string } {
  if (c.facturas_pendientes > 0) return { cls: 'badge-blue',    txt: 'Procesando' }
  if (c.facturas_revision  > 0) return { cls: 'badge-amber',   txt: 'Revisar' }
  if (c.facturas_listas    > 0) return { cls: 'badge-green',   txt: 'Listo' }
  return { cls: 'badge-neutral', txt: 'Sin facturas' }
}

export default function Dashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'listos'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nombre_empresa: '', rnc: '', sector: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadClientes() }, [])

  async function loadClientes() {
    const token = await getToken()
    if (!token) return
    try {
      const data = await getClientes(token)
      setClientes(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const token = await getToken()
    if (!token) { setSaving(false); return }
    try {
      await createCliente(token, form)
      setForm({ nombre_empresa: '', rnc: '', sector: '' })
      setShowModal(false)
      loadClientes()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const activos = clientes.filter(c => c.activo).length
  const totalRevision = clientes.reduce((s, c) => s + c.facturas_revision, 0)
  const isListo = (c: Cliente) => c.facturas_listas > 0 && c.facturas_pendientes === 0 && c.facturas_revision === 0
  const listos = clientes.filter(isListo).length

  const matchesFilter = (c: Cliente) =>
    filter === 'listos' ? isListo(c) : true

  const filtered = clientes.filter(c =>
    matchesFilter(c) && (
      c.nombre_empresa.toLowerCase().includes(q.toLowerCase()) ||
      c.rnc.includes(q.replace(/\D/g, ''))
    )
  )

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle={`${activos} empresa${activos !== 1 ? 's' : ''} activa${activos !== 1 ? 's' : ''}`}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} />Agregar cliente
          </button>
        }
      />

      <div className="content">
        {/* Actionable metric filters */}
        <div className="metric-row">
          <MetricCard
            icon={<AlertTriangle size={17} />} tone="amber"
            label="Por revisar" value={totalRevision} sub="ir a la Bandeja →"
            active={false}
            onClick={() => navigate('/app/bandeja?filtro=revisar')}
          />
          <MetricCard
            icon={<CheckCircle size={17} />} tone="green"
            label="Listos para exportar" value={listos} sub={`de ${activos} clientes`}
            active={filter === 'listos'}
            onClick={() => setFilter(f => f === 'listos' ? 'all' : 'listos')}
          />
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="Buscar por nombre o RNC…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          {filter === 'listos' && (
            <button className="chip" onClick={() => setFilter('all')} title="Quitar filtro">
              Listos
              <X size={13} />
            </button>
          )}
          <div className="spacer" />
          <span className="t-sm t-muted">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        {!loading && clientes.length === 0 ? (
          <div className="card" style={{ padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
              <Users size={26} />
            </div>
            <div>
              <div className="t-h2" style={{ marginBottom: 4 }}>Agrega tu primer cliente para empezar</div>
              <div className="t-sm t-muted" style={{ maxWidth: 360 }}>
                Registra las empresas que manejas. La IA procesa sus facturas y genera los reportes 606/607 para la DGII.
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} />Agregar cliente
            </button>
          </div>
        ) : (
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Cliente</th>
                    <th>RNC</th>
                    <th>Sector</th>
                    <th style={{ textAlign: 'right' }}>Procesando</th>
                    <th style={{ textAlign: 'right' }}>Revisar</th>
                    <th style={{ textAlign: 'right' }}>Procesadas</th>
                    <th>Estado</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={6} widths={[60, 70, 50, 30, 30, 30, 55, 16]} />
                  ) : filtered.map(c => {
                    const est = clienteEstado(c)
                    const tone = SECTOR_TONE[c.sector ?? ''] ?? 'slate'
                    return (
                      <tr
                        key={c.id}
                        className="clickable"
                        tabIndex={0}
                        role="button"
                        aria-label={`Abrir cliente ${c.nombre_empresa}`}
                        onClick={() => navigate(`/app/clientes/${c.id}`)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/app/clientes/${c.id}`) }
                        }}
                      >
                        <td>
                          <div className="cell-name">
                            <Avatar name={c.nombre_empresa} size={30} tone={tone} />
                            <div style={{ minWidth: 0 }}>
                              <div className="cell-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre_empresa}</div>
                              {c.sector && <div className="t-faint" style={{ fontSize: 11.5 }}>{c.sector}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="mono" style={{ fontSize: 12.5 }}>{c.rnc}</span></td>
                        <td className="t-muted">{c.sector || <span className="muted-cell">—</span>}</td>
                        <td className="num">{c.facturas_pendientes || <span className="muted-cell">—</span>}</td>
                        <td className="num">{c.facturas_revision || <span className="muted-cell">—</span>}</td>
                        <td className="num">{c.facturas_listas || <span className="muted-cell">—</span>}</td>
                        <td><span className={`badge ${est.cls}`}><span className="dot" />{est.txt}</span></td>
                        <td><ChevronRight size={16} style={{ color: 'var(--text-faint)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length === 0 && (
              <div className="t-sm t-muted" style={{ textAlign: 'center', padding: 28 }}>
                {q
                  ? `Sin resultados para "${q}".`
                  : filter === 'listos' ? 'Ningún cliente está listo para exportar todavía.'
                  : 'Sin resultados.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New client modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setError(null) } }}>
          <div className="modal">
            <div className="modal-head">
              <div className="t-h2" style={{ flex: 1 }}>Nuevo cliente</div>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); setError(null) }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div>
                  <label className="field-label">Nombre de la empresa</label>
                  <input
                    className="input"
                    placeholder="Ferretería del Cibao SRL"
                    value={form.nombre_empresa}
                    onChange={e => setForm(f => ({ ...f, nombre_empresa: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">RNC</label>
                  <input
                    className="input mono"
                    placeholder="101234567"
                    value={form.rnc}
                    onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Sector <span style={{ color: 'var(--text-faint)' }}>(opcional)</span></label>
                  <input
                    className="input"
                    placeholder="Comercio, Servicios, Construcción…"
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  />
                </div>
                {error && (
                  <div style={{ fontSize: 13, color: 'var(--red-700)', background: 'var(--red-50)', border: '1px solid var(--red-100)', borderRadius: 'var(--r-sm)', padding: '9px 12px' }}>
                    {error}
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setError(null) }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function MetricCard({ icon, tone, label, value, sub, active, onClick }: {
  icon: React.ReactNode; tone: 'green' | 'amber'
  label: string; value: number | string; sub?: string
  active: boolean; onClick: () => void
}) {
  const tones: Record<string, [string, string]> = {
    green: ['var(--green-50)', 'var(--green-600)'],
    amber: ['var(--amber-50)', 'var(--amber-600)'],
  }
  const [bg, fg] = tones[tone]
  return (
    <button
      type="button"
      className={`card metric-card${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Quitar filtro' : `Filtrar: ${label}`}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-ico" style={{ background: bg, color: fg }}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </button>
  )
}
