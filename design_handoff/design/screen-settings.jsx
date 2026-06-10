/* CIFRA — Pantalla 6: Configuración */

function SettingsScreen() {
  const c = CONTADOR;
  const pct = Math.round((c.clientes_uso / c.clientes_max) * 100);
  return (
    <>
      <Topbar title="Configuración" subtitle="Tu perfil, plan y conexiones de captura" />
      <div className="content">
        <div className="content-narrow">

          {/* Perfil */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Perfil del contador</div>
              <div className="t-sm t-muted">Aparece en los reportes y comprobantes.</div>
            </div>
            <div className="set-row-body">
              <div className="row gap-4" style={{ marginBottom: 16 }}>
                <Avatar name={c.nombre} size={56} tone="blue" />
                <div>
                  <div className="t-h2">{c.nombre}</div>
                  <div className="t-sm t-muted">Exequátur {c.exequatur}</div>
                </div>
                <div className="spacer"></div>
                <button className="btn btn-secondary btn-sm"><Icon name="pencil" size={14}/>Editar</button>
              </div>
              <div className="row gap-4">
                <div style={{ flex: 1 }}>
                  <label className="field-label">Nombre completo</label>
                  <input className="input" defaultValue={c.nombre} />
                </div>
                <div style={{ width: 200 }}>
                  <label className="field-label">Teléfono</label>
                  <input className="input mono" defaultValue={c.telefono} />
                </div>
              </div>
            </div>
          </div>

          {/* Correo de captura */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Correo de captura</div>
              <div className="t-sm t-muted">Reenvía facturas aquí y la IA las procesa.</div>
            </div>
            <div className="set-row-body">
              <label className="field-label">Tu correo único</label>
              <div className="row gap-2">
                <span className="mono" style={{ flex: 1, background: 'var(--slate-50)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '9px 12px', fontSize: 13, color: 'var(--text-strong)' }}>{c.email_unico}</span>
                <button className="btn btn-secondary"><Icon name="copy" size={15}/>Copiar</button>
              </div>
              <div className="row gap-3" style={{ marginTop: 16 }}>
                <div className="card" style={{ flex: 1, padding: 14 }}>
                  <div className="row gap-3">
                    <div className="via-icon via-whatsapp"><Icon name="whatsapp" size={15}/></div>
                    <div style={{ flex: 1 }}><div className="t-h3">WhatsApp Business</div><div className="t-sm t-muted">+1 809-555-0100</div></div>
                    <span className="badge badge-green"><span className="dot"></span>Conectado</span>
                  </div>
                </div>
                <div className="card" style={{ flex: 1, padding: 14 }}>
                  <div className="row gap-3">
                    <div className="via-icon via-email"><Icon name="mail" size={15}/></div>
                    <div style={{ flex: 1 }}><div className="t-h3">Reenvío de correo</div><div className="t-sm t-muted">Gmail · Outlook</div></div>
                    <span className="badge badge-green"><span className="dot"></span>Activo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Plan y facturación</div>
              <div className="t-sm t-muted">Tu suscripción activa.</div>
            </div>
            <div className="set-row-body">
              <div className="plan-card current">
                <div className="row gap-3" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="row gap-2"><div className="t-h2">Plan {c.plan}</div><span className="badge badge-blue"><span className="dot"></span>Activo</span></div>
                    <div className="t-sm t-muted" style={{ marginTop: 2 }}>Hasta {c.clientes_max} clientes · facturas ilimitadas · soporte prioritario</div>
                  </div>
                  <div className="spacer"></div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-h1 mono">{c.precio.split(' / ')[0]}</div>
                    <div className="t-sm t-muted">/ mes · renueva 1 jul</div>
                  </div>
                </div>
                <div className="row gap-3" style={{ marginBottom: 6 }}>
                  <span className="t-sm" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>Clientes</span>
                  <div className="spacer"></div>
                  <span className="t-sm t-muted">{c.clientes_uso} de {c.clientes_max}</span>
                </div>
                <div className="meter"><span style={{ width: pct + '%' }}></span></div>
                <div className="row gap-2" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm">Mejorar plan</button>
                  <button className="btn btn-ghost btn-sm">Ver historial de pagos</button>
                </div>
              </div>
            </div>
          </div>

          {/* Preferencias DGII */}
          <div className="set-row">
            <div className="set-row-label">
              <div className="t-h3">Preferencias DGII</div>
              <div className="t-sm t-muted">Validaciones y exportación.</div>
            </div>
            <div className="set-row-body">
              <SetToggle label="Validar RNC contra el padrón de la DGII" desc="Marca en rojo los RNC que no existen al cargar una factura." on />
              <SetToggle label="Bloquear exportación con errores" desc="No permite generar el .txt si hay facturas con datos inválidos." on />
              <SetToggle label="Alertar NCF vencidos" desc="Avisa cuando un comprobante usa una secuencia fuera de vigencia." />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function SetToggle({ label, desc, on }) {
  const [v, setV] = React.useState(!!on);
  return (
    <div className="row gap-3" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div className="t-sm" style={{ fontWeight: 500, color: 'var(--text-strong)' }}>{label}</div>
        <div className="t-sm t-muted">{desc}</div>
      </div>
      <button onClick={() => setV(!v)} aria-pressed={v}
        style={{ width: 38, height: 22, borderRadius: 999, border: 'none', padding: 2, cursor: 'pointer',
          background: v ? 'var(--accent)' : 'var(--slate-300)', transition: 'background .15s', display: 'flex', justifyContent: v ? 'flex-end' : 'flex-start' }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: '#fff', display: 'block', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }}></span>
      </button>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
