/* CIFRA — Componentes compartidos */

/* ---------- Badge de estado de reporte ---------- */
function ReportBadge({ estado, size }) {
  const map = {
    listo:       { cls: 'badge-green',   txt: 'Listo' },
    pendiente:   { cls: 'badge-amber',   txt: 'Pendiente' },
    no_iniciado: { cls: 'badge-neutral', txt: 'No iniciado' },
  };
  const m = map[estado] || map.no_iniciado;
  return <span className={'badge ' + m.cls}><span className="dot"></span>{m.txt}</span>;
}

/* ---------- Badge de estado de factura ---------- */
function FacturaBadge({ estado }) {
  const map = {
    procesado: { cls: 'badge-green',   icon: 'check',  txt: 'Procesada' },
    revision:  { cls: 'badge-amber',   icon: 'alert',  txt: 'Revisar' },
    error:     { cls: 'badge-red',     icon: 'xCircle',txt: 'Error' },
  };
  const m = map[estado] || map.revision;
  return <span className={'badge ' + m.cls}><Icon name={m.icon} size={11}/>{m.txt}</span>;
}

/* ---------- Nivel de confianza IA (chip) ---------- */
function confLevel(conf) {
  if (conf >= 90) return 'alto';
  if (conf >= 65) return 'medio';
  return 'bajo';
}
function ConfChip({ conf, nivel }) {
  const n = nivel || confLevel(conf);
  const map = { alto: 'badge-green', medio: 'badge-amber', bajo: 'badge-red' };
  const lbl = { alto: 'Alta', medio: 'Media', bajo: 'Baja' };
  return (
    <span className={'badge ' + map[n]} title={'Confianza de extracción: ' + conf + '%'}>
      <Icon name="sparkles" size={11}/>{conf}%
    </span>
  );
}

/* ---------- Validación de RNC en vivo (DGII) ---------- */
function RncCheck({ rnc, compact }) {
  const r = lookupRNC(rnc);
  if (r.state === 'valid')
    return <span className="rnc-check ok" title={'Validado en padrón DGII: ' + r.name}><Icon name="checkCircle" size={13}/>{!compact && <span>Válido en DGII</span>}</span>;
  if (r.state === 'invalid')
    return <span className="rnc-check bad" title="RNC no existe en el padrón de la DGII"><Icon name="xCircle" size={13}/>{!compact && <span>No existe en DGII</span>}</span>;
  return <span className="rnc-check warn" title="Formato de RNC inválido"><Icon name="alert" size={13}/>{!compact && <span>Formato inválido</span>}</span>;
}

/* ---------- Avatar de iniciales ---------- */
function Avatar({ name, size = 30, tone = 'blue' }) {
  const initials = name.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÑ]/.test(w[0])).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const tones = {
    blue: ['#DCE6FF', '#173AA6'], green: ['#C9EBD7', '#0B6E3D'],
    amber: ['#F6E3B8', '#855A06'], slate: ['#E3E7EC', '#4B5560'], red: ['#F8D2D2', '#A82323'],
  };
  const [bg, fg] = tones[tone] || tones.blue;
  return (
    <span style={{ width: size, height: size, minWidth: size, borderRadius: size, background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: '.02em' }}>{initials}</span>
  );
}

/* ---------- Estado vacío ---------- */
function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '64px 24px', gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--slate-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
        <Icon name={icon} size={26}/>
      </div>
      <div>
        <div className="t-h2" style={{ marginBottom: 4 }}>{title}</div>
        <div className="t-sm t-muted" style={{ maxWidth: 360 }}>{body}</div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Tabs ---------- */
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} className={'tab' + (active === t.id ? ' active' : '')} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Sidebar ---------- */
const NAV = [
  { id: 'dashboard', label: 'Clientes', icon: 'users' },
  { id: 'bandeja',   label: 'Bandeja',  icon: 'inbox', badge: 3 },
  { id: 'reportes',  label: 'Reportes', icon: 'file' },
];
function Sidebar({ view, onNav }) {
  const isClientView = view === 'client';
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="zap" size={17} strokeWidth={2}/></div>
        <span className="brand-name">Cifra</span>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">General</div>
        {NAV.map(n => (
          <button key={n.id}
            className={'nav-item' + ((view === n.id || (n.id === 'dashboard' && isClientView)) ? ' active' : '')}
            onClick={() => onNav(n.id)}>
            <Icon name={n.icon} size={17}/>
            <span>{n.label}</span>
            {n.badge && <span className="nav-badge">{n.badge}</span>}
          </button>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Cuenta</div>
        <button className={'nav-item' + (view === 'settings' ? ' active' : '')} onClick={() => onNav('settings')}>
          <Icon name="settings" size={17}/><span>Configuración</span>
        </button>
        <button className="nav-item"><Icon name="helpCircle" size={17}/><span>Ayuda</span></button>
      </div>

      <div className="spacer"></div>

      <div className="nav-email">
        <div className="upper-label" style={{ color: 'var(--text-on-dark-muted)' }}>Tu correo de captura</div>
        <div className="nav-email-row">
          <Icon name="mail" size={13}/>
          <span className="mono">{CONTADOR.email_unico}</span>
        </div>
      </div>

      <button className="nav-profile" onClick={() => onNav('settings')}>
        <Avatar name={CONTADOR.nombre} size={32} tone="blue"/>
        <div style={{ minWidth: 0 }}>
          <div className="np-name">{CONTADOR.nombre}</div>
          <div className="np-plan">Plan {CONTADOR.plan}</div>
        </div>
        <Icon name="chevronRight" size={15} style={{ color: 'var(--text-on-dark-muted)' }}/>
      </button>
    </aside>
  );
}

/* ---------- Topbar ---------- */
function Topbar({ title, subtitle, crumbs, periodo, onPeriodo, actions, onBack }) {
  return (
    <header className="topbar">
      <div className="row gap-3" style={{ minWidth: 0 }}>
        {onBack && (
          <button className="btn btn-ghost btn-icon" onClick={onBack} title="Volver">
            <Icon name="arrowLeft" size={17}/>
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {crumbs && (
            <div className="crumbs">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Icon name="chevronRight" size={12} style={{ color: 'var(--text-faint)' }}/>}
                  <span className={i === crumbs.length - 1 ? 'crumb-current' : 'crumb'}>{c}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="t-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{title}</div>
          {subtitle && <div className="t-sm t-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div className="spacer"></div>
      <div className="row gap-2">
        {periodo && (
          <button className="btn btn-secondary period-select">
            <Icon name="calendar" size={15}/>
            <span>{PERIODO.label}</span>
            <Icon name="chevronDown" size={14} style={{ color: 'var(--text-faint)' }}/>
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}

Object.assign(window, {
  ReportBadge, FacturaBadge, ConfChip, RncCheck, Avatar, EmptyState, Tabs, Sidebar, Topbar, confLevel,
});
