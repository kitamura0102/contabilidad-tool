/* CIFRA — Pantalla 2: Vista de cliente (Compras 606 / Ventas 607) */

function ClientView({ client, onBack, onUpload, onCorrect, onPreview }) {
  const [tab, setTab] = React.useState('606');
  const tieneFacturas = client.facturas > 0;
  const rows = tab === '606' ? COMPRAS_606 : VENTAS_607;

  const totMonto = rows.reduce((s, r) => s + r.monto, 0);
  const totItbis = rows.reduce((s, r) => s + r.itbis, 0);
  const totRet = rows.reduce((s, r) => s + (r.retIsr || 0), 0);
  const conErrores = rows.filter(r => r.estado !== 'procesado').length;

  const estado = tab === '606' ? client.e606 : client.e607;
  const puedeExportar = tieneFacturas && conErrores === 0;

  return (
    <>
      <Topbar
        onBack={onBack}
        crumbs={['Clientes', client.nombre]}
        title={client.nombre}
        subtitle={null}
        periodo
        actions={<>
          <button className="btn btn-secondary" disabled={!tieneFacturas} onClick={() => onPreview(tab)}>
            <Icon name="eye" size={15}/>Vista previa {tab}
          </button>
          <button className="btn btn-primary" onClick={() => onUpload(client)}>
            <Icon name="upload" size={15}/>Subir factura
          </button>
        </>} />

      <div className="content">
        {/* meta del cliente */}
        <div className="row gap-4" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
          <div className="kv">
            <span className="t-label">RNC</span>
            <span className="mono cell-strong" style={{ fontSize: 13 }}>{formatRNC(client.rnc)}</span>
            <RncCheck rnc={client.rnc} compact />
          </div>
          <span className="dot-sep">·</span>
          <div className="kv"><span className="t-label">Tipo</span><span className="t-sm cell-strong">{client.tipo}</span></div>
          <span className="dot-sep">·</span>
          <div className="kv"><span className="t-label">Sector</span><span className="t-sm cell-strong">{client.sector}</span></div>
          <div className="spacer"></div>
          <div className="row gap-3">
            <span className="t-sm t-muted">Estado {tab}:</span>
            <ReportBadge estado={estado} />
          </div>
        </div>

        <Tabs
          tabs={[
            { id: '606', label: 'Compras (606)', count: COMPRAS_606.length },
            { id: '607', label: 'Ventas (607)', count: VENTAS_607.length },
          ]}
          active={tab} onChange={setTab} />

        <div style={{ height: 16 }}></div>

        {!tieneFacturas ? (
          <div className="card">
            <EmptyState icon="receipt" title="No hay facturas este mes"
              body={<>Reenvía las facturas al correo <span className="mono" style={{ color: 'var(--accent)' }}>{CONTADOR.email_unico}</span> o súbelas manualmente. La IA extrae los datos por ti.</>}
              action={<button className="btn btn-primary" onClick={() => onUpload(client)}><Icon name="upload" size={15}/>Subir factura</button>} />
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="search-box" style={{ minWidth: 240 }}>
                <Icon name="search" size={15}/>
                <input placeholder={tab === '606' ? 'Buscar por RNC, NCF o proveedor…' : 'Buscar por RNC, NCF o cliente…'} />
              </div>
              <button className="chip"><Icon name="filter" size={14}/>Estado</button>
              {conErrores > 0 && (
                <span className="badge badge-amber"><Icon name="alert" size={11}/>{conErrores} por revisar</span>
              )}
              <div className="spacer"></div>
              <button className="btn btn-secondary btn-sm" disabled={!puedeExportar}
                onClick={() => onPreview(tab)} title={!puedeExportar ? 'Resuelve las facturas con error antes de exportar' : ''}>
                <Icon name="download" size={14}/>Exportar {tab}
              </button>
            </div>

            <div className="tbl-wrap">
              <div className="tbl-scroll">
                {tab === '606' ? (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 92 }}>Fecha</th>
                        <th>RNC emisor</th>
                        <th>Proveedor</th>
                        <th>NCF</th>
                        <th>Tipo B/S</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                        <th style={{ textAlign: 'right' }}>ITBIS</th>
                        <th style={{ textAlign: 'right' }}>Ret. ISR</th>
                        <th>Estado</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPRAS_606.map(r => {
                        const rnc = lookupRNC(r.rnc);
                        return (
                        <tr key={r.id} className="clickable" onClick={() => (r.estado !== 'procesado') && onCorrect(r)}>
                          <td className="mono" style={{ fontSize: 12 }}>{r.fecha}</td>
                          <td>
                            <span className="mono" style={{ fontSize: 12 }}>{formatRNC(r.rnc)}</span>
                            {rnc.state !== 'valid' && <Icon name="xCircle" size={13} style={{ color: 'var(--red-500)', marginLeft: 6, verticalAlign: 'middle' }}/>}
                          </td>
                          <td className="cell-strong" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{r.ncf}</td>
                          <td className="t-muted" style={{ fontSize: 12 }}>{(TIPO_BS[r.tipoBS] || '').split(' · ')[0]}</td>
                          <td className="num cell-strong">{formatMoney(r.monto, false)}</td>
                          <td className="num">{formatMoney(r.itbis, false)}</td>
                          <td className="num">{r.retIsr ? formatMoney(r.retIsr, false) : <span className="muted-cell">—</span>}</td>
                          <td><FacturaBadge estado={r.estado} /></td>
                          <td>{r.estado !== 'procesado'
                            ? <Icon name="pencil" size={15} style={{ color: 'var(--amber-600)' }}/>
                            : <Icon name="chevronRight" size={15} style={{ color: 'var(--text-faint)' }}/>}</td>
                        </tr>
                      );})}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5}>Totales · {COMPRAS_606.length} facturas</td>
                        <td className="num">{formatMoney(totMonto, false)}</td>
                        <td className="num">{formatMoney(totItbis, false)}</td>
                        <td className="num">{formatMoney(totRet, false)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 92 }}>Fecha</th>
                        <th>RNC / Cédula</th>
                        <th>Cliente</th>
                        <th>NCF</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                        <th style={{ textAlign: 'right' }}>ITBIS</th>
                        <th>Estado</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {VENTAS_607.map(r => (
                        <tr key={r.id}>
                          <td className="mono" style={{ fontSize: 12 }}>{r.fecha}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{r.rnc === '131298540' ? '—' : formatRNC(r.rnc)}</td>
                          <td className="cell-strong">{r.nombre}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{r.ncf}</td>
                          <td className="t-muted" style={{ fontSize: 12 }}>{TIPOS_NCF[r.tipoNcf]}</td>
                          <td className="num cell-strong">{formatMoney(r.monto, false)}</td>
                          <td className="num">{formatMoney(r.itbis, false)}</td>
                          <td><FacturaBadge estado={r.estado} /></td>
                          <td><Icon name="chevronRight" size={15} style={{ color: 'var(--text-faint)' }}/></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5}>Totales · {VENTAS_607.length} facturas</td>
                        <td className="num">{formatMoney(totMonto, false)}</td>
                        <td className="num">{formatMoney(totItbis, false)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
            <div className="t-sm t-muted" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="zap" size={13} style={{ color: 'var(--green-600)' }}/>
              Las facturas con baja confianza aparecen marcadas. Haz clic en una fila <strong>Revisar</strong> o <strong>Error</strong> para corregirla.
            </div>
          </>
        )}
      </div>
    </>
  );
}

Object.assign(window, { ClientView });
