import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Cliente from './pages/Cliente'
import Bandeja from './pages/Bandeja'
import Reportes from './pages/Reportes'
import Settings from './pages/Settings'
import Ayuda from './pages/Ayuda'
import Login from './pages/Login'
import Layout from './components/Layout'

const Protected = ({ children }: { children: React.ReactNode }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<Landing />} />
        <Route path="/sign-in/*"          element={<Login />} />
        <Route path="/app"                element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/app/bandeja"        element={<Protected><Layout><Bandeja /></Layout></Protected>} />
        <Route path="/app/reportes"       element={<Protected><Layout><Reportes /></Layout></Protected>} />
        <Route path="/app/settings"       element={<Protected><Layout><Settings /></Layout></Protected>} />
        <Route path="/app/ayuda"          element={<Protected><Layout><Ayuda /></Layout></Protected>} />
        <Route path="/app/clientes/:id"   element={<Protected><Layout><Cliente /></Layout></Protected>} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
