import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import { getClientes, createCliente } from '../lib/api'

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

export default function Dashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre_empresa: '', rnc: '', sector: '' })

  useEffect(() => {
    loadClientes()
  }, [])

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
    const token = await getToken()
    if (!token) return
    await createCliente(token, form)
    setForm({ nombre_empresa: '', rnc: '', sector: '' })
    setShowForm(false)
    loadClientes()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Cifra</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setShowForm(true)} style={btnStyle}>
            + Nuevo cliente
          </button>
          <UserButton />
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Nuevo cliente</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              placeholder="Nombre empresa"
              value={form.nombre_empresa}
              onChange={e => setForm(f => ({ ...f, nombre_empresa: e.target.value }))}
              required
              style={inputStyle}
            />
            <input
              placeholder="RNC (9 u 11 dígitos)"
              value={form.rnc}
              onChange={e => setForm(f => ({ ...f, rnc: e.target.value }))}
              required
              style={inputStyle}
            />
            <input
              placeholder="Sector (opcional)"
              value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btnStyle}>Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondaryStyle}>Cancelar</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : clientes.length === 0 ? (
        <p style={{ color: '#888' }}>No hay clientes todavía. Agrega el primero.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clientes.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/clientes/${c.id}`)}
              style={{ ...cardStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{c.nombre_empresa}</div>
                <div style={{ color: '#888', fontSize: 13 }}>RNC {c.rnc} {c.sector ? `· ${c.sector}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                {c.facturas_pendientes > 0 && (
                  <span style={badge('orange')}>{c.facturas_pendientes} procesando</span>
                )}
                {c.facturas_revision > 0 && (
                  <span style={badge('red')}>{c.facturas_revision} revisar</span>
                )}
                {c.facturas_listas > 0 && (
                  <span style={badge('green')}>{c.facturas_listas} listas</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
}

const btnStyle: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
}

const btnSecondaryStyle: React.CSSProperties = {
  background: '#f3f4f6',
  color: '#111',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
}

const badge = (color: 'green' | 'orange' | 'red'): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 12,
  background: color === 'green' ? '#dcfce7' : color === 'orange' ? '#ffedd5' : '#fee2e2',
  color: color === 'green' ? '#16a34a' : color === 'orange' ? '#ea580c' : '#dc2626',
  fontWeight: 500,
})
