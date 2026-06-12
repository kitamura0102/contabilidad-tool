import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { FileText, FileSpreadsheet } from 'lucide-react'
import { getClientes, getFacturas, downloadReporte } from '../lib/api'
import { Factura } from '../lib/factura'
import Topbar from '../components/Topbar'
import Avatar from '../components/Avatar'
import TableSkeleton from '../components/TableSkeleton'
import Toast from '../components/Toast'

type Cliente = { id: string; nombre_empresa: string; rnc: string; sector: string | null }

export default function Reportes() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [procesadas, setProcesadas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const token = await getToken()
    if (!token) return
    try {
      const [cs, fs] = await Promise.all([
        getClientes(token),
        getFacturas(token, { estado: 'procesada' }),
      ])
      setClientes(cs)
      setProcesadas(fs)
    } finally {
      setLoading(false)
    }
  }

  // Count processed facturas per client / tipo for the selected period.
  const counts = useMemo(() => {
    const map: Record<string, { compra: number; venta: number }> = {}
    for (const f of procesadas) {
      if (f.fecha_emision?.slice(0, 7) !== periodo) continue
      const c = (map[f.cliente_id] ??= { compra: 0, venta: 0 })
      if (f.tipo === 'compra') c.compra += 1
      else if (f.tipo === 'venta') c.venta += 1
    }
    return map
  }, [procesadas, periodo])

  const conDatos = clientes.filter(c => {
    const k = counts[c.id]
    return k && (k.compra > 0 || k.venta > 0)
  })

  async function handleDownload(cliente: Cliente, tipo: '606' | '607', formato: 'txt' | 'xlsx') {
    const token = await getToken()
    if (!token) return
    try {
      await downloadReporte(token, cliente.id, tipo, periodo.replace('-', ''), formato, cliente.nombre_empresa)
      setToast(`${tipo} de ${cliente.nombre_empresa} descargado`)
    } catch (err) {
      setToast(`No se pudo exportar: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const periodoLabel = new Date(`${periodo}-01T00:00:00`).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  return (
    <>
      <Topbar
        title="Reportes"
        subtitle={loading ? undefined : `Exportá los 606/607 de ${periodoLabel}`}
        periodo
        periodoValue={periodo}
        onPeriodoChange={setPeriodo}
      />

      <div className="content">
        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Cliente</th>
                  <th>Compras (606)</th>
                  <th>Ventas (607)</th>
                  <th style={{ textAlign: 'right', width: 320 }}>Exportar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} widths={[60, 30, 30, '70%']} />
                ) : conDatos.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '56px 24px', textAlign: 'center' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="t-h3">Nada que exportar en {periodoLabel}</div>
                          <div className="t-sm t-muted" style={{ marginTop: 2, maxWidth: 380 }}>
                            Solo se exportan facturas procesadas. Sube y revisa facturas en cada cliente, o cambia el período.
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : conDatos.map(c => {
                  const k = counts[c.id]
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/app/clientes/${c.id}`)}>
                          <Avatar name={c.nombre_empresa} size={28} tone="slate" />
                          <span className="cell-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{c.nombre_empresa}</span>
                        </div>
                      </td>
                      <td className="tnum">{k.compra > 0 ? `${k.compra} factura${k.compra !== 1 ? 's' : ''}` : <span className="muted-cell">—</span>}</td>
                      <td className="tnum">{k.venta > 0 ? `${k.venta} factura${k.venta !== 1 ? 's' : ''}` : <span className="muted-cell">—</span>}</td>
                      <td>
                        <div className="row gap-2" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <ExportGroup label="606" disabled={k.compra === 0}
                            onTxt={() => handleDownload(c, '606', 'txt')} onXlsx={() => handleDownload(c, '606', 'xlsx')} />
                          <ExportGroup label="607" disabled={k.venta === 0}
                            onTxt={() => handleDownload(c, '607', 'txt')} onXlsx={() => handleDownload(c, '607', 'xlsx')} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && conDatos.length > 0 && (
          <div className="t-sm t-muted row gap-2" style={{ marginTop: 12 }}>
            <FileText size={13} style={{ color: 'var(--accent)' }} />
            El <strong style={{ color: 'var(--text)' }}>.txt</strong> es el archivo oficial para la Oficina Virtual de la DGII; el <strong style={{ color: 'var(--text)' }}>Excel</strong> es para tu revisión.
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}

function ExportGroup({ label, disabled, onTxt, onXlsx }: {
  label: string; disabled: boolean; onTxt: () => void; onXlsx: () => void
}) {
  return (
    <div className="row gap-1" style={{ opacity: disabled ? 0.4 : 1 }}>
      <button className="btn btn-secondary btn-sm" disabled={disabled} onClick={onTxt} title={`${label} oficial (.txt) para la DGII`}>
        <FileText size={13} />{label} .txt
      </button>
      <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={onXlsx} title={`${label} en Excel`}>
        <FileSpreadsheet size={13} />Excel
      </button>
    </div>
  )
}
