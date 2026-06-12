import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Users, Inbox, FileText, Settings, HelpCircle, Zap, ChevronRight } from 'lucide-react'
import { getFacturas } from '../lib/api'
import Avatar from './Avatar'

const NAV = [
  { id: 'clientes',  label: 'Clientes',      icon: Users,    path: '/app' },
  { id: 'bandeja',   label: 'Bandeja',        icon: Inbox,    path: '/app/bandeja' },
  { id: 'reportes',  label: 'Reportes',       icon: FileText, path: '/app/reportes' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const [pendientes, setPendientes] = useState(0)

  // Live-ish count of facturas needing attention, refreshed on navigation. Fails silent.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const [rev, err] = await Promise.all([
          getFacturas(token, { estado: 'pendiente_revision' }),
          getFacturas(token, { estado: 'error_extraccion' }),
        ])
        if (!cancelled) setPendientes((rev?.length ?? 0) + (err?.length ?? 0))
      } catch { /* sin badge */ }
    })()
    return () => { cancelled = true }
  }, [pathname, getToken])

  const isActive = (path: string) => {
    if (path === '/app') return pathname === '/app' || pathname.startsWith('/app/clientes')
    return pathname.startsWith(path)
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Zap size={17} strokeWidth={2} /></div>
        <span className="brand-name">Cifra</span>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">General</div>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item${isActive(n.path) ? ' active' : ''}`}
            onClick={() => navigate(n.path)}
          >
            <n.icon size={17} />
            <span>{n.label}</span>
            {n.id === 'bandeja' && pendientes > 0 && <span className="nav-badge">{pendientes}</span>}
          </button>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Cuenta</div>
        <button
          className={`nav-item${pathname === '/app/settings' ? ' active' : ''}`}
          onClick={() => navigate('/app/settings')}
        >
          <Settings size={17} /><span>Configuración</span>
        </button>
        <button
          className={`nav-item${pathname === '/app/ayuda' ? ' active' : ''}`}
          onClick={() => navigate('/app/ayuda')}
        >
          <HelpCircle size={17} /><span>Ayuda</span>
        </button>
      </div>

      <div className="spacer" />

      {user && (
        <button className="nav-profile" onClick={() => navigate('/app/settings')}>
          <Avatar name={user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'U'} size={32} tone="blue" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="np-name">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</div>
            <div className="np-plan">Plan Profesional</div>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--text-on-dark-muted)', flexShrink: 0 }} />
        </button>
      )}
    </aside>
  )
}
