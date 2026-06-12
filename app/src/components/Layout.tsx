import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div id="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  )
}
