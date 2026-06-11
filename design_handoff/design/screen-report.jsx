/* CIFRA — Pantalla 5: Vista previa 606/607 (formato DGII) */

function ReportPreview({ client, tipo, onClose, onExport }) {
  const [vista, setVista] = React.useState('tabla'); // tabla | txt
  const is606 = tipo === '606';
  const rows = is606 ? COMPRAS_606 : VENTAS_607;
  const cli = client || CLIENTES[0];

  const totMonto = rows.reduce((s, r) => s + r.monto, 0);
  const totItbis = rows.reduce((s, r) => s + r.itbis, 0);
  const totRet = rows.reduce((s, r) => s + (r.retIsr || 0), 0);
  const conErrores = rows.filter(r => r.estado !== 'procesado');
  const puedeExportar = conErrores.length === 0;

  // línea formato DGII (pipe-delimited)
  function lineaTxt(r) {
    const f = r.fecha.replace(/-/g, '');
    const monto = r.monto.toFixed(2);
    const itbis = r.itbis.toFixed(2);
    if (is606) {
      const tipoId = r.rnc.replace(/\D/g,'').length === 11 ? '2' : '1';
      return `${r.rnc}|${tipoId}|${r.tipoBS}|${r.ncf}||${f}|${f}|${monto}|${itbis}|${(r.retIsr||0).toFixed(2)}|0.00|0.00|0.00|0.00`;
    }
    const tipoId = r.rnc === '131298540' ? '2' : '1';
    return `${r.rnc === '131298540' ? '' : r.rnc}|${tipoId}|${r.ncf}||${f}|${monto}|${itbis}|0.00|0.00`;
  }
  const header606 = `${cli.rnc}|${PERIODO.codigo}|${rows.length}`;

  const nombreArchivo = `DGII_${tipo}_${cli.rnc}_${PERIODO.codigo}`;

  // Descarga el .txt pipe-delimited oficial para subir a la Oficina Virtual de la DGII
  function exportarTxt() {
    const lineas = [header606, ...rows.map(lineaTxt)].join('\r\n');
    const blob = new Blob([lineas], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Descarga un .xlsx legible para revisión y respaldo del contador.
  // No reemplaza el .txt oficial para la DGII.
  function exportarExcel() {
    if (typeof XLSX === 'undefined') {
      alert('No se pudo cargar el generador de Excel. Verifica tu conexión.');
      return;
    }
    const headers = is606
      ? ['#', 'RNC/Cédula', 'Tipo ID', 'Tipo B/S', 'NCF', 'Fecha', 'Monto facturado', 'ITBIS facturado', 'Ret. ISR', 'Estado']
      : ['#', 'RNC/Cédula', 'Tipo ID', 'NCF', 'Fecha', 'Monto facturado', 'ITBIS facturado', 'Estado'];

    const data = rows.map((r, i) => {
      const tipoId = r.rnc.replace(/\D/g, '').length === 11 ? '2' : '1';
      const fecha = r.fecha.replace(/-/g, '');
      if (is606) {
        return [i + 1, r.rnc, tipoId, r.tipoBS, r.ncf, fecha,
          Number(r.monto), Number(r.itbis), Number(r.retIsr || 0), r.estado];
      }
      return [i + 1, r.rnc, tipoId, r.ncf, fecha,
        Number(r.monto), Number(r.itbis), r.estado];
    });

    const totalRow = is606
      ? ['', 'TOTALES', '', '', '', '', totMonto, totItbis, totRet, '']
      : ['', 'TOTALES', '', '', '', totMonto, totItbis, ''];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data, totalRow]);

    // Formato de moneda en columnas de monto
    const montoCols = is606 ? [6, 7, 8] : [5, 6];
    for (let R = 1; R <= data.length + 1; R++) {
      montoCols.forEach((C) => {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '#,##0.00';
      });
    }
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${tipo} ${PERIODO.codigo}`);
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
  }

  return (
    <div className="flow">
      <div className="flow-head">
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="arrowLeft" size={18}/></button>
        <div style={{ flex: 1 }}>
          <div className="t-h2">Vista previa — Reporte {tipo}</div>
          <div className="t-sm t-muted">{cli.nombre} · {is606 ? 'Compras' : 'Ventas'} · {PERIODO.label}</div>
        </div>
        {conErrores.length > 0
          ? <span className="badge badge-amber"><Icon name="alert" size={11}/>{conErrores.length} facturas con errores</span>
          : <span className="badge badge-green"><Icon name="checkCircle" size={11}/>Sin errores</span>}
        <div style={{ width: 12 }}></div>
        <button className="btn btn-secondary"><Icon name="copy" size={14}/>Copiar</button>
        <button className="btn btn-secondary" disabled={!puedeExportar} onClick={exportarExcel}
          title={!puedeExportar ? 'Resuelve los errores antes de exportar' : 'Descarga una hoja Excel para revisión/respaldo'}>
          <Icon name="download" size={15}/>Exportar Excel
        </button>
        <button className="btn btn-primary" disabled={!puedeExportar} onClick={exportarTxt}
          title={!puedeExportar ? 'Resuelve los errores antes de exportar' : 'Descarga el archivo oficial para la Oficina Virtual DGII'}>
          <Icon name="download" size={15}/>Exportar .txt DGII
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', background: 'var(--bg-page)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {/* metadatos del reporte */}
          <div className="report-meta">
            <div><div className="rm-label">RNC declarante</div><div className="rm-value mono">{formatRNC(cli.rnc)}</div></div>
            <div><div className="rm-label">Período</div><div className="rm-value">{PERIODO.label}</div></div>
            <div><div className="rm-label">Registros</div><div className="rm-value">{rows.length} comprobantes</div></div>
            <div><div className="rm-label">Formato</div><div className="rm-value">DGII {tipo} · TXT</div></div>
          </div>

          {conErrores.length > 0 && (
            <div className="row gap-3" style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 8 }}>
              <Icon name="alert" size={16} style={{ color: 'var(--amber-600)', minWidth: 16 }}/>
              <div className="t-sm" style={{ color: 'var(--amber-700)', flex: 1 }}>
                Hay {conErrores.length} factura(s) con RNC inválido o datos incompletos. La exportación está deshabilitada hasta resolverlas.
              </div>
              <button className="btn btn-sm" style={{ background: 'var(--amber-500)', color: '#fff' }}>Ver pendientes</button>
            </div>
          )}

          <div className="row" style={{ marginBottom: 14 }}>
            <div className="seg">
              <button className={vista === 'tabla' ? 'active' : ''} onClick={() => setVista('tabla')}>Tabla</button>
              <button className={vista === 'txt' ? 'active' : ''} onClick={() => setVista('txt')}>Archivo .txt</button>
            </div>
            <div className="spacer"></div>
            <span className="t-sm t-muted">Así se enviará a la Oficina Virtual de la DGII</span>
          </div>

          {vista === 'tabla' ? (
            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>#</th>
                      <th>RNC/Cédula</th>
                      {is606 && <th>Tipo ID</th>}
                      {is606 && <th>Tipo B/S</th>}
                      <th>NCF</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'right' }}>Monto facturado</th>
                      <th style={{ textAlign: 'right' }}>ITBIS facturado</th>
                      {is606 && <th style={{ textAlign: 'right' }}>Ret. ISR</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const err = r.estado !== 'procesado';
                      return (
                        <tr key={r.id} style={err ? { background: 'var(--red-50)' } : null}>
                          <td className="muted-cell mono" style={{ fontSize: 12 }}>{String(i+1).padStart(2,'0')}</td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {r.rnc === '131298540' ? <span className="muted-cell">— consumidor final</span> : r.rnc}
                            {err && <Icon name="xCircle" size={12} style={{ color: 'var(--red-500)', marginLeft: 6, verticalAlign: 'middle' }}/>}
                          </td>
                          {is606 && <td className="mono" style={{ fontSize: 12 }}>{r.rnc.length === 11 ? '2' : '1'}</td>}
                          {is606 && <td className="mono" style={{ fontSize: 12 }}>{r.tipoBS}</td>}
                          <td className="mono" style={{ fontSize: 12 }}>{r.ncf}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{r.fecha.replace(/-/g,'')}</td>
                          <td className="num">{formatMoney(r.monto, false)}</td>
                          <td className="num">{formatMoney(r.itbis, false)}</td>
                          {is606 && <td className="num">{(r.retIsr||0).toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={is606 ? 6 : 4}>Totales</td>
                      <td className="num">{formatMoney(totMonto, false)}</td>
                      <td className="num">{formatMoney(totItbis, false)}</td>
                      {is606 && <td className="num">{formatMoney(totRet, false)}</td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="invoice-preview" style={{ background: 'var(--slate-900)' }}>
              <pre style={{ margin: 0, padding: '18px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, color: '#C8D3E0', overflow: 'auto' }}>
<span style={{ color: 'var(--blue-300)' }}>{header606}</span>{'\n'}
{rows.map((r, i) => <span key={r.id} style={r.estado !== 'procesado' ? { color: 'var(--red-500)' } : null}>{lineaTxt(r)}{'\n'}</span>)}
              </pre>
              <div style={{ padding: '10px 20px', borderTop: '1px solid #2a3645', display: 'flex', justifyContent: 'space-between' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-on-dark-muted)' }}>DGII_{tipo}_{cli.rnc}_{PERIODO.codigo}.txt</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-on-dark-muted)' }}>{rows.length + 1} líneas · UTF-8</span>
              </div>
            </div>
          )}

          <div className="t-sm t-muted" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="helpCircle" size={14}/>
            El archivo cumple el layout oficial {tipo} de la DGII. Súbelo en la Oficina Virtual &gt; Envío de Datos.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ReportPreview });
