import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import {
  Zap, Upload, Sparkles, FileText, Users, ScanLine,
  FileSpreadsheet, ArrowRight, Check,
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const goApp = () => navigate('/app')
  const goSignIn = () => navigate('/sign-in')
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ color: 'var(--text-strong)' }}>
      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="row gap-2">
          <span style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(160deg, var(--blue-500), var(--blue-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(43,92,230,0.4)' }}>
            <Zap size={15} strokeWidth={2.2} />
          </span>
          <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>Cifra</span>
        </div>
        <div className="row gap-2">
          <SignedIn>
            <button className="btn btn-primary" onClick={goApp}>Ir al app<ArrowRight size={15} /></button>
          </SignedIn>
          <SignedOut>
            <button className="btn btn-ghost" onClick={goSignIn}>Iniciar sesión</button>
            <button className="btn btn-primary" onClick={goSignIn}>Empezar gratis</button>
          </SignedOut>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: 'var(--ink)',
        backgroundImage: [
          'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(43,92,230,0.22), transparent)',
          'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, 46px 46px, 46px 46px',
        padding: '84px 24px 96px', textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(43,92,230,0.12)', border: '1px solid rgba(43,92,230,0.28)', borderRadius: 999, padding: '6px 15px', marginBottom: 34 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-300)', boxShadow: '0 0 8px var(--blue-300)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--blue-300)', fontWeight: 500 }}>Hecho para contadores dominicanos</span>
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 600, color: '#fff', lineHeight: 1.04, letterSpacing: '-0.03em', maxWidth: 820, margin: '0 auto 22px', textWrap: 'balance' }}>
          Tu 606 y 607,{' '}
          <span style={{ color: 'var(--blue-300)' }}>listos en minutos</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'var(--text-on-dark-muted)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Sube las fotos de las facturas de tus clientes. Cifra extrae RNC, NCF, montos e ITBIS con IA y genera los reportes para la DGII.
        </p>

        <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 68 }}>
          <SignedIn>
            <button className="btn btn-primary" style={heroBtn} onClick={goApp}>Ir al app<ArrowRight size={16} /></button>
          </SignedIn>
          <SignedOut>
            <button className="btn btn-primary" style={heroBtn} onClick={goSignIn}>Empezar gratis<ArrowRight size={16} /></button>
            <button className="btn" style={heroGhost} onClick={() => scrollTo('como-funciona')}>Ver cómo funciona</button>
          </SignedOut>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          <AppMockup />
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" style={{ padding: '88px 24px', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={sectionTitle}>De la foto al reporte, en cuatro pasos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginTop: 56 }}>
            {[
              { n: 1, icon: Upload, title: 'Sube la factura', desc: 'Foto desde el celular o PDF desde la computadora. Varias a la vez, separadas por cliente y período.' },
              { n: 2, icon: Sparkles, title: 'La IA extrae los datos', desc: 'Cifra lee RNC, NCF, fecha, monto e ITBIS. Si la confianza es baja, te avisa para que revises.' },
              { n: 3, icon: ScanLine, title: 'Revisa con la imagen', desc: 'Corrige cualquier campo con la factura al lado. Avanza por la bandeja con "Guardar y siguiente".' },
              { n: 4, icon: FileText, title: 'Exporta a la DGII', desc: 'Descarga el 606 o 607 en .txt oficial para la Oficina Virtual, o en Excel para tu respaldo.' },
            ].map(step => (
              <div key={step.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--blue-50)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <step.icon size={18} />
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>0{step.n}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 8, color: 'var(--text-strong)' }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '88px 24px', background: 'var(--bg-page)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={sectionTitle}>Todo lo que necesita un contador moderno</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px 48px', marginTop: 56 }}>
            {[
              { icon: Zap, title: 'OCR instantáneo con IA', desc: 'Extrae RNC, NCF, fecha, monto e ITBIS automáticamente. Si la confianza es baja, te avisa para que revises.' },
              { icon: FileText, title: 'Imágenes y PDFs', desc: 'Sube fotos desde el celular o PDFs desde la PC. Comprime las imágenes antes de enviar para no gastar datos.' },
              { icon: FileSpreadsheet, title: 'Formato oficial DGII', desc: 'Genera el 606 y 607 en el formato pipe-delimitado (.txt) exacto que acepta la Oficina Virtual.' },
              { icon: Users, title: 'Multi-cliente', desc: 'Gestiona todos tus clientes desde un solo lugar, cada uno con su historial de facturas y reportes.' },
              { icon: ScanLine, title: 'Verificación con la imagen', desc: 'Ve la factura y los datos extraídos lado a lado. Corrige cualquier campo con un clic.' },
              { icon: Sparkles, title: 'Bandeja en lote', desc: 'Revisa, reintenta o exporta facturas de todos tus clientes a la vez, sin entrar uno por uno.' },
            ].map(f => (
              <div key={f.title}>
                <span style={{ display: 'inline-flex', width: 38, height: 38, borderRadius: 9, background: 'var(--blue-50)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.icon size={19} />
                </span>
                <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 6, letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DGII ── */}
      <section style={{ padding: '72px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 10, padding: '12px 20px', marginBottom: 22 }}>
            <span style={{ fontSize: 20 }}>🇩🇴</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-text)', fontSize: 14.5 }}>Compatible con la DGII de República Dominicana</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            Los reportes siguen el formato oficial de la{' '}
            <strong style={{ color: 'var(--text)' }}>Dirección General de Impuestos Internos</strong>: 606 (Registro de Compras) y 607 (Registro de Ventas), listos para subir a la Oficina Virtual.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '92px 24px', background: 'var(--ink)', backgroundImage: 'radial-gradient(ellipse 55% 70% at 50% 115%, rgba(43,92,230,0.18), transparent)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 600, color: '#fff', letterSpacing: '-0.025em', marginBottom: 14, textWrap: 'balance' }}>
          ¿Listo para empezar?
        </h2>
        <p style={{ fontSize: 16.5, color: 'var(--text-on-dark-muted)', marginBottom: 36 }}>
          Crea tu cuenta gratis y sube tu primera factura hoy.
        </p>
        <SignedIn>
          <button className="btn btn-primary" style={heroBtn} onClick={goApp}>Ir al app<ArrowRight size={16} /></button>
        </SignedIn>
        <SignedOut>
          <button className="btn btn-primary" style={heroBtn} onClick={goSignIn}>Crear cuenta gratis<ArrowRight size={16} /></button>
        </SignedOut>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--ink)', borderTop: '1px solid var(--border-nav)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="row gap-2">
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(160deg, var(--blue-500), var(--blue-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} strokeWidth={2.2} />
          </span>
          <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>Cifra</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-on-dark-muted)' }}>© 2026 · Hecho en República Dominicana 🇩🇴</span>
      </footer>
    </div>
  )
}

// ── App mockup (matches the real app's slate/blue system) ──
function AppMockup() {
  const rows = [
    { estado: 'Procesada', cls: 'badge-green', rnc: '130161453', ncf: 'B0100000089', total: 'RD$ 14,160' },
    { estado: 'Procesada', cls: 'badge-green', rnc: '101234567', ncf: 'B0100000234', total: 'RD$ 5,900' },
    { estado: 'Revisar', cls: 'badge-amber', rnc: '131789392', ncf: 'E310000033552', total: 'RD$ 4,720' },
    { estado: 'En cola', cls: 'badge-neutral', rnc: '—', ncf: '—', total: '—' },
  ]
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 600,
      textAlign: 'left', fontSize: 13,
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.5), 0 0 90px rgba(43,92,230,0.08)',
    }}>
      <div style={{ background: 'var(--slate-900)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {['#ff5f57', '#ffbd2e', '#28c840'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        <div className="mono" style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '3px 12px', fontSize: 11, color: 'var(--text-on-dark-muted)', marginLeft: 10 }}>
          cifra.app/clientes/…
        </div>
      </div>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-strong)' }}>Distribuidora García, SRL</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>RNC 131789392 · Comercio</div>
        </div>
        <div className="row gap-2">
          <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--text-strong)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>Exportar 606</span>
          <span style={{ background: 'var(--accent)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>Subir facturas</span>
        </div>
      </div>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-strong)', fontSize: 12, fontWeight: 600, borderBottom: '2px solid var(--accent)', paddingBottom: 6 }}>Compras (606)</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ventas (607)</span>
        <span className="row gap-1" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}><Sparkles size={11} />actualizando</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '92px 104px 1fr 92px', padding: '7px 16px', background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        <span>Estado</span><span>RNC</span><span>NCF</span><span style={{ textAlign: 'right' }}>Total</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 104px 1fr 92px', padding: '9px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
          <span className={`badge ${r.cls}`} style={{ height: 20 }}><span className="dot" />{r.estado}</span>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text)' }}>{r.rnc}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{r.ncf}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-strong)', textAlign: 'right' }}>{r.total}</span>
        </div>
      ))}
    </div>
  )
}

const heroBtn: React.CSSProperties = { height: 46, padding: '0 28px', fontSize: 15, fontWeight: 500, boxShadow: '0 0 28px rgba(43,92,230,0.4)' }
const heroGhost: React.CSSProperties = { height: 46, padding: '0 26px', fontSize: 15, background: 'rgba(255,255,255,0.07)', color: 'var(--text-on-dark)', border: '1px solid rgba(255,255,255,0.14)' }
const sectionTitle: React.CSSProperties = { textAlign: 'center', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--text-strong)', textWrap: 'balance', margin: 0 }
