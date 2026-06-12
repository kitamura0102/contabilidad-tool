import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Users, Inbox, FileText, Settings, HelpCircle, Zap, ChevronRight } from 'lucide-react'
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
        <button className="nav-item">
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
