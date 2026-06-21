import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Zap } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer on route change.
  useEffect(() => { setNavOpen(false) }, [pathname])

  return (
    <div id="app">
      <Sidebar className={navOpen ? 'open' : ''} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
      <main className="main">
        <div className="mobile-topbar">
          <button className="mobile-menu-btn" onClick={() => setNavOpen(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div className="row gap-2">
            <span style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(160deg, var(--blue-500), var(--blue-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} strokeWidth={2.2} />
            </span>
            <span className="brand-name" style={{ color: '#fff', fontWeight: 600 }}>Cuadre</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
