/* CIFRA — Pantalla 1: Dashboard (lista de clientes) */

function StatCard({ icon, tone, label, value, sub, subIcon, subTone }) {
  const tones = {
    blue: ['var(--blue-50)', 'var(--accent)'], green: ['var(--green-50)', 'var(--green-600)'],
    amber: ['var(--amber-50)', 'var(--amber-600)'], slate: ['var(--slate-100)', 'var(--slate-500)'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-ico" style={{ background: bg, color: fg }}><Icon name={icon} size={17}/></span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub" style={{ color: subTone }}>{subIcon && <Icon name={subIcon} size={13}/>}{sub}</div>}
    </div>
  );
}

function Dashboard({ onOpenClient, empty }) {
  const [q, setQ] = React.useState('');
  const clientes = CLIENTES.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.rnc.includes(q.replace(/\D/g,'')));

  const totalFacturas = CLIENTES.reduce((s, c) => s + c.facturas, 0);
  const listos = CLIENTES.filter(c => c.e606 === 'listo').length;
  const pendientes = CLIENTES.reduce((s, c) => s + c.pendientes, 0);

  const sectorTone = { Comercio: 'blue', Restaurantes: 'amber', Salud: 'green', Servicios: 'slate', Construcción: 'slate' };

  if (empty) {
    return (
      <>
        <Topbar title="Clientes" subtitle="Administra las empresas que llevas este período" periodo
          actions={<button className="btn btn-primary"><Icon name="plus" size={15}/>Agregar cliente</button>} />
        <div className="content">
          <div className="card">
            <EmptyState icon="users" title="Agrega tu primer cliente para empezar"
              body="Registra las empresas que manejas. Cada una recibe un correo único para que sus facturas lleguen y la IA las procese automáticamente."
              action={<button className="btn btn-primary"><Icon name="plus" size={15}/>Agregar cliente</button>} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Clientes" subtitle="8 empresas activas · plan Profesional (8 de 40)" periodo
        actions={<>
          <button className="btn btn-secondary"><Icon name="download" size={15}/>Exportar todo</button>
          <button className="btn btn-primary"><Icon name="plus" size={15}/>Agregar cliente</button>
        </>} />

      <div className="content">
        <div className="stat-grid">
          <StatCard icon="users" tone="blue" label="Clientes activos" value="8" sub="2 cupos disponibles" subTone="var(--text-muted)" />
          <StatCard icon="receipt" tone="slate" label="Facturas este mes" value={totalFacturas} sub="+34 vs. abril" subIcon="zap" subTone="var(--green-700)" />
          <StatCard icon="checkCircle" tone="green" label="606/607 listos" value={`${listos} de 8`} sub="3 listos para exportar" subTone="var(--text-muted)" />
          <StatCard icon="alert" tone="amber" label="Por revisar" value={pendientes} sub="facturas con baja confianza" subTone="var(--amber-700)" />
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Icon name="search" size={15}/>
            <input placeholder="Buscar por nombre o RNC…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="chip"><Icon name="filter" size={14}/>Estado 606</button>
          <button className="chip">Sector<Icon name="chevronDown" size={14}/></button>
          <div className="spacer"></div>
          <span className="t-sm t-muted">{clientes.length} clientes</span>
        </div>

        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Cliente</th>
                  <th>RNC</th>
                  <th>Sector</th>
                  <th style={{ textAlign: 'right' }}>Facturas</th>
                  <th style={{ textAlign: 'right' }}>Monto 606</th>
                  <th>Estado 606</th>
                  <th>Estado 607</th>
                  <th>Última actividad</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} className="clickable" onClick={() => onOpenClient(c)}>
                    <td>
                      <div className="cell-name">
                        <Avatar name={c.nombre} size={30} tone={sectorTone[c.sector] || 'slate'} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-strong">{c.nombre}</div>
                          <div className="t-faint" style={{ fontSize: 11.5 }}>{c.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 12.5 }}>{formatRNC(c.rnc)}</span></td>
                    <td className="t-muted">{c.sector}</td>
                    <td className="num">{c.facturas || <span className="muted-cell">—</span>}</td>
                    <td className="num">{c.monto606 ? formatMoney(c.monto606, false) : <span className="muted-cell">—</span>}</td>
                    <td><ReportBadge estado={c.e606} /></td>
                    <td><ReportBadge estado={c.e607} /></td>
                    <td className="t-muted" style={{ fontSize: 12.5 }}>{c.actividad}</td>
                    <td><Icon name="chevronRight" size={16} style={{ color: 'var(--text-faint)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {clientes.length === 0 && <div className="t-sm t-muted" style={{ textAlign: 'center', padding: 28 }}>Sin resultados para “{q}”.</div>}
      </div>
    </>
  );
}

Object.assign(window, { Dashboard });
