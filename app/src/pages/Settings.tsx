import { useEffect, useState } from 'react'
import { useAuth, useUser, UserButton, SignOutButton } from '@clerk/clerk-react'
import { Check } from 'lucide-react'
import { getClientes } from '../lib/api'
import Topbar from '../components/Topbar'
import Avatar from '../components/Avatar'

const PLAN_LIMITE = 40

export default function Settings() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [clientesCount, setClientesCount] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const cs = await getClientes(token)
        setClientesCount(Array.isArray(cs) ? cs.length : 0)
      } catch { /* ignora */ }
    })()
  }, [getToken])

  const nombre = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Tu cuenta'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const pct = clientesCount != null ? Math.min(100, Math.round((clientesCount / PLAN_LIMITE) * 100)) : 0

  return (
    <>
      <Topbar title="Configuración" subtitle="Tu cuenta y tu plan" />

      <div className="content">
        <div style={{ maxWidth: 760 }}>
          {/* Perfil */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Perfil</div>
              <div className="t-sm t-muted">Tu nombre y correo de acceso.</div>
            </div>
            <div className="set-row-body">
              <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={nombre} size={44} tone="blue" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cell-strong" style={{ fontSize: 15 }}>{nombre}</div>
                  {email && <div className="t-sm t-muted mono" style={{ fontSize: 12.5 }}>{email}</div>}
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Plan</div>
              <div className="t-sm t-muted">Tu suscripción y uso actual.</div>
            </div>
            <div className="set-row-body">
              <div className="plan-card current">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="t-h3" style={{ color: 'var(--accent-text)' }}>Profesional</div>
                    <div className="t-sm t-muted">Hasta {PLAN_LIMITE} clientes</div>
                  </div>
                  <span className="badge badge-blue"><span className="dot" />Activo</span>
                </div>
                <div className="meter"><span style={{ width: `${pct}%` }} /></div>
                <div className="t-sm t-muted" style={{ marginTop: 8 }}>
                  {clientesCount != null ? `${clientesCount} de ${PLAN_LIMITE} clientes en uso` : 'Calculando uso…'}
                </div>
              </div>
            </div>
          </div>

          {/* Qué incluye */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Incluido</div>
              <div className="t-sm t-muted">Lo que tu plan te da.</div>
            </div>
            <div className="set-row-body">
              <div className="col gap-2">
                {[
                  'Extracción con IA de RNC, NCF, montos e ITBIS',
                  'Reportes 606 y 607 en formato oficial DGII (.txt)',
                  'Exportación a Excel para revisión y respaldo',
                  'Bandeja de revisión cross-cliente con acciones en lote',
                ].map(item => (
                  <div key={item} className="row gap-2 t-sm">
                    <Check size={15} style={{ color: 'var(--green-600)', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sesión */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Sesión</div>
              <div className="t-sm t-muted">Cierra sesión en este dispositivo.</div>
            </div>
            <div className="set-row-body">
              <SignOutButton>
                <button className="btn btn-secondary">Cerrar sesión</button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
