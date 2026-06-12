import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Cliente from './pages/Cliente'
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
        <Route path="/app/clientes/:id"   element={<Protected><Layout><Cliente /></Layout></Protected>} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
