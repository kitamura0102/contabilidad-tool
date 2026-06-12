import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'

export default function Landing() {
  const navigate = useNavigate()
  const goApp     = () => navigate('/app')
  const goSignIn  = () => navigate('/sign-in')
  const scrollTo  = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: '#0a0a0a' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.8px' }}>Cifra</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SignedIn>
            <button onClick={goApp} style={s.navPrimary}>Ir al app →</button>
          </SignedIn>
          <SignedOut>
            <button onClick={goSignIn} style={s.navSecondary}>Iniciar sesión</button>
            <button onClick={goSignIn} style={s.navPrimary}>Empezar gratis</button>
          </SignedOut>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: '#080808',
        backgroundImage: [
          'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(22,163,74,0.18), transparent)',
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, 48px 48px, 48px 48px',
        padding: '88px 24px 96px',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.22)',
          borderRadius: 999, padding: '6px 16px', marginBottom: 36,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, letterSpacing: 0.3 }}>Hecho para contadores dominicanos</span>
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(42px, 7.5vw, 76px)',
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.0,
          letterSpacing: '-2.5px',
          maxWidth: 820,
          margin: '0 auto 24px',
        }}>
          Tu 606 y 607,<br />
          <span style={{
            background: 'linear-gradient(135deg, #4ade80, #16a34a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            listos en minutos
          </span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: '#9ca3af',
          maxWidth: 520,
          margin: '0 auto 44px',
          lineHeight: 1.65,
        }}>
          Sube las fotos de las facturas de tus clientes.
          Cifra extrae RNC, NCF, montos e ITBIS con IA
          y genera los reportes para la DGII.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
          <SignedIn>
            <button onClick={goApp} style={s.heroCta}>Ir al app →</button>
          </SignedIn>
          <SignedOut>
            <button onClick={goSignIn} style={s.heroCta}>Empezar gratis →</button>
            <button onClick={() => scrollTo('como-funciona')} style={s.heroCtaGhost}>
              Ver cómo funciona
            </button>
          </SignedOut>
        </div>

        {/* Mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          <AppMockup />
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" style={{ padding: '88px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={s.sectionLabel}>Así funciona</p>
          <h2 style={s.sectionTitle}>De la foto al reporte<br />en 3 pasos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48, marginTop: 60 }}>
            {[
              {
                num: '01',
                title: 'Sube la factura',
                desc: 'Foto desde el celular o PDF desde la computadora. Compras y ventas organizadas por separado, por cliente y período.',
              },
              {
                num: '02',
                title: 'La IA extrae los datos',
                desc: 'Cifra lee el RNC emisor, NCF, fecha de emisión, monto total e ITBIS automáticamente con Gemini AI.',
              },
              {
                num: '03',
                title: 'Exporta el reporte',
                desc: 'Descarga el 606 o 607 en formato .txt oficial para la DGII, o en Excel para tu revisión y respaldo.',
              },
            ].map(step => (
              <div key={step.num}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', letterSpacing: 2, marginBottom: 12 }}>{step.num}</div>
                <div style={{ width: 36, height: 3, background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: 2, marginBottom: 18 }} />
                <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '88px 24px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={s.sectionLabel}>Funcionalidades</p>
          <h2 style={s.sectionTitle}>Todo lo que necesita<br />un contador moderno</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16, marginTop: 56 }}>
            {[
              { icon: '⚡', title: 'OCR instantáneo con IA',      desc: 'Extrae RNC, NCF, fecha, monto e ITBIS automáticamente. Si la confianza es baja, te avisa para que revises.' },
              { icon: '📄', title: 'Imágenes y PDFs',             desc: 'Sube fotos desde el celular o PDFs desde la PC. Comprime las imágenes antes de enviar para no gastar datos.' },
              { icon: '📊', title: 'Formato oficial DGII',        desc: 'Genera el 606 y 607 en el formato pipe-delimitado (.txt) exacto que acepta la Oficina Virtual de la DGII.' },
              { icon: '📋', title: 'Excel para revisión',         desc: 'Además del .txt, descarga un Excel con encabezados legibles, totales y tasa ITBIS para tu respaldo.' },
              { icon: '👥', title: 'Multi-cliente',               desc: 'Gestiona todos tus clientes desde un solo lugar. Cada uno con su historial completo de facturas y reportes.' },
              { icon: '🔍', title: 'Verificación con la imagen',  desc: 'Ve la factura y los datos extraídos lado a lado en el mismo panel. Corrige cualquier campo con un click.' },
            ].map(f => (
              <div key={f.title} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '26px 24px',
                transition: 'box-shadow .15s',
              }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: '-0.2px' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DGII BADGE ── */}
      <section style={{ padding: '64px 24px', background: '#fff', borderTop: '1px solid #f3f4f6' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 24px', marginBottom: 24 }}>
            <span style={{ fontSize: 22 }}>🇩🇴</span>
            <span style={{ fontWeight: 700, color: '#15803d', fontSize: 15 }}>Compatible con la DGII de República Dominicana</span>
          </div>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7 }}>
            Los reportes generados siguen el formato oficial de la{' '}
            <strong style={{ color: '#374151' }}>Dirección General de Impuestos Internos</strong>:
            606 (Registro de Compras) y 607 (Registro de Ventas),
            listos para subir a la Oficina Virtual.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: '96px 24px',
        background: '#080808',
        backgroundImage: 'radial-gradient(ellipse 60% 70% at 50% 110%, rgba(22,163,74,0.14), transparent)',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(30px, 5vw, 52px)',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-1.5px',
          marginBottom: 16,
        }}>
          ¿Listo para empezar?
        </h2>
        <p style={{ fontSize: 17, color: '#9ca3af', marginBottom: 40 }}>
          Crea tu cuenta gratis y sube tu primera factura hoy.
        </p>
        <SignedIn>
          <button onClick={goApp} style={s.heroCta}>Ir al app →</button>
        </SignedIn>
        <SignedOut>
          <button onClick={goSignIn} style={s.heroCta}>Crear cuenta gratis →</button>
        </SignedOut>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#080808',
        borderTop: '1px solid #1a1a1a',
        padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontWeight: 900, color: '#fff', fontSize: 17, letterSpacing: '-0.5px' }}>Cifra</span>
        <span style={{ fontSize: 13, color: '#4b5563' }}>© 2026 · Hecho en República Dominicana 🇩🇴</span>
      </footer>

    </div>
  )
}

// ── App mockup ──────────────────────────────────────────────────────────────

function AppMockup() {
  const rows = [
    { estado: 'Procesada', bg: '#dcfce7', fg: '#16a34a', rnc: '130161453',  ncf: 'B0100000089',   total: 'RD$14,160' },
    { estado: 'Procesada', bg: '#dcfce7', fg: '#16a34a', rnc: '101234567',  ncf: 'B0100000234',   total: 'RD$5,900'  },
    { estado: 'Revisar',   bg: '#fef9c3', fg: '#a16207', rnc: '131789392',  ncf: 'E310000033552', total: 'RD$4,720'  },
    { estado: 'En cola',   bg: '#f3f4f6', fg: '#6b7280', rnc: '—',          ncf: '—',             total: '—'         },
  ]

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      overflow: 'hidden',
      width: '100%',
      maxWidth: 600,
      textAlign: 'left',
      fontSize: 13,
      boxShadow: [
        '0 0 0 1px rgba(255,255,255,0.06)',
        '0 32px 80px rgba(0,0,0,0.55)',
        '0 0 80px rgba(22,163,74,0.07)',
      ].join(', '),
    }}>
      {/* Browser chrome */}
      <div style={{ background: '#161616', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {['#ff5f57','#ffbd2e','#28c840'].map(c => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
        ))}
        <div style={{ flex: 1, background: '#222', borderRadius: 5, padding: '3px 12px', fontSize: 11, color: '#555', marginLeft: 10 }}>
          contabilidad-tool.vercel.app/clientes/…
        </div>
      </div>

      {/* Client header */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Distribuidora García, SRL</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>RNC 131789392 · Comercio</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ background: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: 5, fontSize: 11 }}>Exportar 606 · 2</div>
          <div style={{ background: '#111', color: '#fff', padding: '4px 10px', borderRadius: 5, fontSize: 11 }}>+ Factura</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '7px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ background: '#111', color: '#fff', padding: '3px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>Compras (606)</div>
        <div style={{ color: '#888', padding: '3px 12px', fontSize: 11 }}>Ventas (607)</div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>↻ actualizando cada 10s</div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '82px 108px 1fr 88px', padding: '6px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span>Estado</span><span>RNC</span><span>NCF</span><span>Total</span>
      </div>

      {/* Rows */}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '82px 108px 1fr 88px', padding: '9px 16px', borderBottom: i < rows.length - 1 ? '1px solid #f9fafb' : 'none', alignItems: 'center' }}>
          <span style={{ padding: '2px 7px', borderRadius: 10, background: r.bg, color: r.fg, fontSize: 10, fontWeight: 600, display: 'inline-block' }}>{r.estado}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{r.rnc}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af' }}>{r.ncf}</span>
          <span style={{ fontSize: 12, color: '#374151' }}>{r.total}</span>
        </div>
      ))}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  navPrimary: {
    background: '#0a0a0a', color: '#fff', border: 'none',
    borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  } as React.CSSProperties,

  navSecondary: {
    background: 'transparent', color: '#374151', border: '1px solid #e5e7eb',
    borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
  } as React.CSSProperties,

  heroCta: {
    background: '#16a34a', color: '#fff', border: 'none',
    borderRadius: 8, padding: '14px 30px', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px',
    boxShadow: '0 0 24px rgba(22,163,74,0.35)',
  } as React.CSSProperties,

  heroCtaGhost: {
    background: 'rgba(255,255,255,0.06)', color: '#d1d5db',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '14px 30px', cursor: 'pointer', fontSize: 15,
  } as React.CSSProperties,

  sectionLabel: {
    textAlign: 'center' as const,
    fontSize: 11, fontWeight: 700, letterSpacing: 3,
    color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: 14,
  } as React.CSSProperties,

  sectionTitle: {
    textAlign: 'center' as const,
    fontSize: 'clamp(28px, 4vw, 44px)',
    fontWeight: 900, letterSpacing: '-1.2px', lineHeight: 1.1,
  } as React.CSSProperties,
}
