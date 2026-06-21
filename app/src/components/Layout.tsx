import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import CuadreMark from './CuadreMark'

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
            <CuadreMark size={26} variant="light" />
            <span className="brand-name" style={{ color: '#fff', fontWeight: 600 }}>Cuadre</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
