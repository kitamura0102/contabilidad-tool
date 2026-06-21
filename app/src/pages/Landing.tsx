import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import CuadreMark from '../components/CuadreMark'
import './landing.css'

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.05em', height: '1.05em' }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export default function Landing() {
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="lp">
      {/* ── NAV ── */}
      <header className="lp-nav" ref={navRef}>
        <div className="lp-wrap lp-nav-in">
          <a href="/" className="lp-logo">
            <CuadreMark size={34} variant="light" />
            Cuadre
          </a>
          <nav className="lp-nav-links">
            <a href="#problema">El antes y el ahora</a>
            <a href="#pasos">Cómo funciona</a>
            <a href="#dgii">Compatible DGII</a>
          </nav>
          <div>
            <SignedIn>
              <button className="lp-btn lp-btn-primary" style={{ padding: '.62rem 1.1rem', minHeight: 0, fontSize: '.94rem' }} onClick={() => navigate('/app')}>
                Ir al app <ArrowRight />
              </button>
            </SignedIn>
            <SignedOut>
              <button className="lp-btn lp-btn-primary" style={{ padding: '.62rem 1.1rem', minHeight: 0, fontSize: '.94rem' }} onClick={() => navigate('/sign-in')}>
                Empezar gratis
              </button>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <span className="lp-eyebrow">Software fiscal hecho en RD</span>
            <h1>Ni una factura más <em>tecleada</em> a mano.</h1>
            <p className="lp-lede">
              Sube las facturas de todos tus clientes (foto del celular o PDF) y la IA de Cuadre saca el{' '}
              <b>RNC, NCF, fecha, monto e ITBIS</b> por ti. Tú revisas, corriges lo que haga falta
              y exportas el 606 y 607 en el <b>.txt que la Oficina Virtual de la DGII</b> acepta sin pelear.
            </p>
            <div className="lp-cta-row">
              <SignedIn>
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/app')}>
                  Ir al app <ArrowRight />
                </button>
              </SignedIn>
              <SignedOut>
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/sign-in')}>
                  Empezar gratis <ArrowRight />
                </button>
                <button className="lp-btn lp-btn-ghost" onClick={() => scrollTo('pasos')}>
                  Ver cómo funciona
                </button>
              </SignedOut>
            </div>
            <p className="lp-cta-note">
              <span className="lp-cta-dot" />
              Sin tarjeta. Tus primeras facturas corren gratis.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <div className="lp-mock lp-reveal">
              <div className="lp-mock-bar">
                <span className="lp-mock-dot" /><span className="lp-mock-dot" /><span className="lp-mock-dot" />
                <span className="lp-mock-ttl">bandeja · marzo 2026</span>
                <span className="lp-mock-pill">48 facturas</span>
              </div>
              <div className="lp-mock-head">
                <span>Cliente · RNC</span>
                <span className="lp-col-ncf">NCF</span>
                <span className="lp-col-date">Fecha</span>
                <span style={{ textAlign: 'right' }}>Monto</span>
                <span>Estado</span>
              </div>
              {[
                { cli: 'Ferretería Pérez',    rnc: '131-29384-5', ncf: 'B0100000034',  date: '03/03/26', mny: 'RD$ 18,420', ok: true },
                { cli: 'Colmado La Bendición', rnc: '130-77120-9', ncf: 'B0200001188',  date: '05/03/26', mny: 'RD$ 6,975',  ok: true },
                { cli: 'Repuestos del Cibao',  rnc: '101-55039-2', ncf: 'B01000000??', date: '08/03/26', mny: 'RD$ 41,300', ok: false, flagNcf: true },
                { cli: 'Farmacia Carol',        rnc: '130-04412-7', ncf: 'B0100002201',  date: '11/03/26', mny: 'RD$ 2,340',  ok: true },
              ].map((r, i) => (
                <div key={i} className={`lp-frow${!r.ok ? ' flag' : ''}`}>
                  <div>
                    <div className="lp-fcli">{r.cli}</div>
                    <div className="lp-frnc">{r.rnc}</div>
                  </div>
                  <div className="lp-frnc lp-col-ncf">
                    {r.flagNcf
                      ? <span>B01000000<span style={{ color: 'var(--lp-amber)' }}>??</span></span>
                      : r.ncf}
                  </div>
                  <div className="lp-frnc lp-col-date">{r.date}</div>
                  <div className="lp-fmny">{r.mny}</div>
                  <div>
                    {r.ok
                      ? <span className="lp-tag lp-tag-ok"><span className="lp-tag-ic" />Verificado</span>
                      : <span className="lp-tag lp-tag-warn"><span className="lp-tag-ic" />Revisar</span>}
                  </div>
                </div>
              ))}
              <div className="lp-mock-foot">
                <span className="lp-mock-sel">47 de 48 listas · 1 por revisar</span>
                <div className="lp-mock-exp">
                  <span className="lp-chip">606.txt</span>
                  <span className="lp-chip">607.txt</span>
                  <span className="lp-chip lp-chip-go">Exportar a la DGII</span>
                </div>
              </div>
            </div>
            <div className="lp-factura-float lp-reveal">
              <div className="lp-factura-ph">
                <span className="lp-factura-lab">foto de<br />factura<br />· celular ·</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANTES / AHORA ── */}
      <section className="lp-band" id="problema">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-reveal">
            <span className="lp-eyebrow">El antes y el ahora</span>
            <h2>Lo que hoy te quita el fin de semana, Cuadre te lo cuadra mientras tomas café.</h2>
            <p>Transcribir factura por factura no es trabajo de contador. Es trabajo de máquina. Así que dejamos que la máquina lo haga.</p>
          </div>
          <div className="lp-cmp">
            <div className="lp-panel lp-panel-antes lp-reveal">
              <span className="lp-ph-tag">Hoy, a mano</span>
              <h3>Cliente por cliente, dígito por dígito</h3>
              <ul className="lp-steplist">
                {[
                  'Abres cada cliente en su propia hoja.',
                  'Tecleas RNC, NCF, fecha, monto e ITBIS de cada factura.',
                  'Cruzas los dedos para que no se te fuera un dígito.',
                  'Repites. Cientos de veces. Para cada cliente.',
                ].map((t, i) => (
                  <li key={i}><span className="n">{i + 1}</span>{t}</li>
                ))}
              </ul>
              <div className="lp-meter">
                <span className="lp-meter-big">≈ 3 hrs</span>
                <span className="lp-meter-unit">por cliente, y la vista cansada</span>
              </div>
            </div>
            <div className="lp-panel lp-panel-ahora lp-reveal">
              <span className="lp-ph-tag">Con Cuadre</span>
              <h3>Todo el montón de una vez</h3>
              <ul className="lp-steplist">
                {[
                  'Subes las facturas de todos tus clientes juntas.',
                  'La IA llena cada campo sola, sin que teclees nada.',
                  'Revisas solo lo que te marca y lo corriges al lado de la foto.',
                  'Exportas el 606 y 607 en lote. Listo para la Oficina Virtual.',
                ].map((t, i) => (
                  <li key={i}><span className="n">{i + 1}</span>{t}</li>
                ))}
              </ul>
              <div className="lp-meter">
                <span className="lp-meter-big">≈ 12 min</span>
                <span className="lp-meter-unit">todos tus clientes, sin errores de tecleo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PASOS ── */}
      <section id="pasos">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-reveal">
            <span className="lp-eyebrow">Cómo funciona</span>
            <h2>Cuatro pasos. El resto lo pone Cuadre.</h2>
          </div>
          <div className="lp-steps">
            {[
              { n: '01', title: 'Sube como sea',            desc: 'Tira las facturas como te lleguen: foto del celular, escaneo o PDF. De todos tus clientes, todas juntas.',                                               arrow: true },
              { n: '02', title: 'La IA las lee',             desc: 'Cuadre extrae el RNC, NCF, fecha, monto e ITBIS de cada factura en segundos. Tú no tecleas ni un número.',                                             arrow: true },
              { n: '03', title: 'Revisa con la foto al lado', desc: 'Cada renglón muestra su factura original. Lo que la IA no vio claro te lo marca para que le des un ojo.',                                              arrow: true },
              { n: '04', title: 'Exporta a la DGII',         desc: 'Genera el 606 y 607 en el .txt oficial de la Oficina Virtual, o en Excel. Listo para subir, sin reformatear.', arrow: false },
            ].map(s => (
              <div key={s.n} className="lp-step lp-reveal">
                <div className="lp-step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {s.arrow && <span className="lp-step-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIADORES ── */}
      <section className="lp-band">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-reveal">
            <span className="lp-eyebrow">Por qué Cuadre</span>
            <h2>Pensado por quien también odiaba teclear facturas.</h2>
          </div>
          <div className="lp-feat">
            {[
              { c: 'c1', title: 'Una sola bandeja, todos tus clientes', desc: 'Revisa y exporta en lote sin entrar cliente por cliente. Todo lo del mes en una misma pantalla, ordenado.' },
              { c: 'c2', title: 'Te avisa cuando no está segura',       desc: 'Si la confianza del OCR baja, la IA te marca el renglón en amarillo en vez de adivinar. Tú decides en dos segundos.' },
              { c: 'c3', title: 'El .txt que la DGII sí acepta',        desc: 'Formato oficial de la Oficina Virtual, ya cuadrado. Sin pelear con el portal ni reformatear columnas en Excel.' },
              { c: 'c4', title: 'Hecho para multi-cliente',             desc: 'Cada cliente con su RNC, sus NCF y sus reportes. Cambias de cliente sin perder el hilo ni mezclar nada.' },
            ].map(f => (
              <div key={f.c} className={`lp-fcard lp-fcard-${f.c} lp-reveal`}>
                <div className="lp-fcard-ico"><span /></div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DGII ── */}
      <section id="dgii">
        <div className="lp-wrap lp-dgii">
          <div className="lp-reveal">
            <span className="lp-eyebrow">Compatible con la DGII</span>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.8rem)', marginTop: '1rem' }}>
              Los formatos que ya conoces, sin trabajo extra.
            </h2>
            <p style={{ color: 'var(--lp-ink-soft)', fontSize: '1.08rem', marginTop: '1rem', maxWidth: '46ch' }}>
              Cuadre genera los dos registros tal como los pide la Dirección General de Impuestos
              Internos de República Dominicana. Lo que sale, entra a la Oficina Virtual.
            </p>
            <div className="lp-seal">
              <span className="lp-seal-ck">✓</span>
              Validado contra el formato vigente de la Oficina Virtual
            </div>
          </div>
          <div className="lp-dgii-cards">
            <div className="lp-dcard lp-reveal">
              <div className="lp-dcard-code">606</div>
              <div>
                <h3>Registro de Compras</h3>
                <p>Bienes y servicios que compraron tus clientes. Cuadre arma el archivo con cada RNC, NCF, fecha, monto e ITBIS, listo para la Oficina Virtual.</p>
              </div>
            </div>
            <div className="lp-dcard lp-dcard-607 lp-reveal">
              <div className="lp-dcard-code">607</div>
              <div>
                <h3>Registro de Ventas</h3>
                <p>Las ventas y los comprobantes emitidos. Mismo proceso, mismo .txt oficial, sin volver a teclear nada a mano.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section id="final">
        <div className="lp-wrap">
          <div className="lp-final lp-reveal">
            <span className="lp-eyebrow">Empieza hoy</span>
            <h2>Que este sea el último cierre que tecleas a mano.</h2>
            <p>Crea tu cuenta, sube las facturas de un cliente y mira el 606 salir solo. Sin tarjeta, sin compromiso.</p>
            <div className="lp-cta-row">
              <SignedIn>
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/app')}>
                  Ir al app <ArrowRight />
                </button>
              </SignedIn>
              <SignedOut>
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/sign-in')}>
                  Crear cuenta gratis <ArrowRight />
                </button>
                <button className="lp-btn lp-btn-ghost" onClick={() => navigate('/sign-in')}>
                  Iniciar sesión
                </button>
              </SignedOut>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-foot-in">
          <a href="/" className="lp-logo" style={{ fontSize: '1.3rem' }}>
            <CuadreMark size={30} variant="light" />
            Cuadre
          </a>
          <div className="lp-foot-links">
            <a href="#problema">El antes y el ahora</a>
            <a href="#pasos">Cómo funciona</a>
            <a href="#dgii">Compatible DGII</a>
          </div>
          <div className="lp-foot-rd">
            <span className="lp-flag"><i className="b" /><i className="r" /><i className="b" /></span>
            Hecho en República Dominicana
          </div>
        </div>
      </footer>
    </div>
  )
}
