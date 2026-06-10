/* CIFRA — Bandeja (entrantes) + Reportes (overview) */

function Bandeja({ onProcess }) {
  return (
    <>
      <Topbar title="Bandeja" subtitle="Facturas recibidas por WhatsApp y correo, listas para procesar" periodo
        actions={<button className="btn btn-secondary"><Icon name="refresh" size={15}/>Actualizar</button>} />
      <div className="content">
        <div className="content-narrow" style={{ maxWidth: 760 }}>
          <div className="row gap-3" style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 8 }}>
            <Icon name="zap" size={16} style={{ color: 'var(--accent)', minWidth: 16 }}/>
            <div className="t-sm" style={{ color: 'var(--blue-700)', flex: 1 }}>
              <strong>{BANDEJA.length} facturas nuevas</strong> esperando. La IA puede procesarlas todas y tú solo confirmas.
            </div>
            <button className="btn btn-primary btn-sm"><Icon name="sparkles" size={14}/>Procesar todas</button>
          </div>

          <div className="tbl-wrap">
            {BANDEJA.map((b, i) => (
              <div key={b.id} className="row gap-3" style={{ padding: '14px 16px', borderBottom: i < BANDEJA.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className={'via-icon ' + (b.via === 'whatsapp' ? 'via-whatsapp' : 'via-email')}>
                  <Icon name={b.via === 'whatsapp' ? 'whatsapp' : 'mail'} size={15}/>
                </div>
                <div className="invoice-preview" style={{ width: 40, height: 50, minWidth: 40 }}>
                  <div className="invoice-paper" style={{ padding: 4, fontSize: 4, lineHeight: 1.4 }}>RNC<br/>NCF<br/>━━<br/>Total</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-strong mono" style={{ fontSize: 13 }}>{b.archivo}</div>
                  <div className="t-sm t-muted">{b.via === 'whatsapp' ? 'WhatsApp' : 'Correo'} · {b.remitente} · {b.hora}</div>
                </div>
                <select className="input" style={{ width: 200, height: 32 }} defaultValue="">
                  <option value="" disabled>Asignar a cliente…</option>
                  {CLIENTES.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => onProcess(CLIENTES[0])}><Icon name="sparkles" size={14}/>Procesar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Reportes({ onPreview, onOpenClient }) {
  return (
    <>
      <Topbar title="Reportes" subtitle="Estado 606 y 607 de todos tus clientes este período" periodo
        actions={<button className="btn btn-secondary"><Icon name="download" size={15}/>Exportar lote</button>} />
      <div className="content">
        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>RNC</th>
                  <th style={{ textAlign: 'right' }}>Facturas</th>
                  <th>606 (Compras)</th>
                  <th>607 (Ventas)</th>
                  <th style={{ width: 280 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {CLIENTES.map(c => {
                  const r606 = c.e606 === 'listo', r607 = c.e607 === 'listo';
                  return (
                    <tr key={c.id}>
                      <td><div className="cell-name"><Avatar name={c.nombre} size={28} tone="slate"/><span className="cell-strong">{c.nombre}</span></div></td>
                      <td className="mono" style={{ fontSize: 12 }}>{formatRNC(c.rnc)}</td>
                      <td className="num">{c.facturas || <span className="muted-cell">—</span>}</td>
                      <td><ReportBadge estado={c.e606}/></td>
                      <td><ReportBadge estado={c.e607}/></td>
                      <td>
                        <div className="row gap-2">
                          <button className="btn btn-ghost btn-sm" disabled={!c.facturas} onClick={() => onOpenClient(c)}><Icon name="eye" size={14}/>Ver</button>
                          <button className="btn btn-secondary btn-sm" disabled={!r606} onClick={() => onPreview(c, '606')}><Icon name="download" size={14}/>606</button>
                          <button className="btn btn-secondary btn-sm" disabled={!r607} onClick={() => onPreview(c, '607')}><Icon name="download" size={14}/>607</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Bandeja, Reportes });
