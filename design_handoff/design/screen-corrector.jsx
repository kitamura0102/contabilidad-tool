/* CIFRA — Pantalla 4: Editor de corrección 50/50 (OCR baja confianza) */

function Corrector({ client, onClose, onSaved }) {
  const x = EXTRACCION_FALLO.campos;
  const [active, setActive] = React.useState(null);
  const [rncVal, setRncVal] = React.useState(x.rnc.valor);

  // cajas de detección sobre la imagen (coordenadas en %)
  const boxes = {
    nombre: { top: '15%', left: '8%', width: '54%', height: '6%' },
    rnc:    { top: '23%', left: '8%', width: '34%', height: '5.5%' },
    ncf:    { top: '30%', left: '8%', width: '38%', height: '5.5%' },
    fecha:  { top: '30%', left: '60%', width: '30%', height: '5.5%' },
    monto:  { top: '74%', left: '52%', width: '38%', height: '6%' },
    itbis:  { top: '81%', left: '52%', width: '38%', height: '5.5%' },
  };

  const bajos = Object.values(x).filter(f => f.nivel === 'bajo').length;

  return (
    <div className="flow">
      <div className="flow-head">
        <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="arrowLeft" size={18}/></button>
        <div style={{ flex: 1 }}>
          <div className="t-h2">Corregir factura</div>
          <div className="t-sm t-muted">{client ? client.nombre : 'Ferretería del Cibao'} · {EXTRACCION_FALLO.archivo}</div>
        </div>
        <span className="badge badge-red"><Icon name="alert" size={11}/>OCR de baja confianza · {bajos} campos</span>
        <div style={{ width: 12 }}></div>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSaved}><Icon name="check" size={15}/>Guardar factura</button>
      </div>

      <div className="flow-body">
        {/* IZQUIERDA — imagen de la factura */}
        <div style={{ flex: '1 1 50%', background: '#EDF0F4', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignSelf: 'stretch', marginBottom: 14 }}>
            <span className="upper-label">Imagen original</span>
            <div className="spacer"></div>
            <button className="btn btn-ghost btn-sm"><Icon name="search" size={14}/>Zoom</button>
            <button className="btn btn-ghost btn-sm"><Icon name="refresh" size={14}/>Rotar</button>
          </div>

          <div className="invoice-preview" style={{ width: 460, maxWidth: '100%' }}>
            <div className="invoice-paper" style={{ minHeight: 600, position: 'relative' }}>
              <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '.04em' }}>SUPLIDORA NACIONAL SRL</div>
              <div>Av. 27 de Febrero #245, Santo Domingo</div>
              <div>RNC: 1-30-84527-6</div>
              <div>NCF: B0100008834</div>
              <div style={{ float: 'right', marginTop: -34 }}>Fecha: 03/05/2026</div>
              <div style={{ borderTop: '1px dashed #bbb', margin: '16px 0' }}></div>
              <div style={{ fontSize: 11 }}>FACTURA DE CRÉDITO FISCAL</div>
              <div style={{ borderTop: '1px dashed #bbb', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cemento gris (40 fundas)</span><span>28,400.00</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Varilla 1/2 (60 und)</span><span>13,900.00</span></div>
              <div style={{ borderTop: '1px dashed #bbb', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>42,300.00</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ITBIS 18%</span><span>7,614.00</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}><span>TOTAL RD$</span><span>49,914.00</span></div>

              {/* cajas de detección */}
              {Object.entries(boxes).map(([k, pos]) => (
                <div key={k} className={'detect-box lvl-' + x[k].nivel + (active === k ? ' active' : '')}
                  style={pos} onMouseEnter={() => setActive(k)}>
                  {active === k && <span className="detect-tag">{x[k].conf}% · {k}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="t-sm t-muted" style={{ marginTop: 14, textAlign: 'center', maxWidth: 420 }}>
            Las regiones marcadas son los datos que la IA leyó. Pasa el cursor sobre un campo para ubicarlo en la imagen.
          </div>
        </div>

        {/* DERECHA — campos editables */}
        <div style={{ flex: '1 1 50%', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', overflow: 'auto' }}>
          <div style={{ padding: '24px 28px', maxWidth: 520 }}>
            <div className="row gap-3" style={{ marginBottom: 18, padding: '11px 13px', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 8 }}>
              <Icon name="alert" size={16} style={{ color: 'var(--amber-600)', minWidth: 16 }}/>
              <div className="t-sm" style={{ color: 'var(--amber-700)' }}>
                La imagen estaba borrosa. Verifica los campos en <strong>rojo</strong> y <strong>ámbar</strong> contra la factura.
              </div>
            </div>

            <div className="upper-label" style={{ marginBottom: 12 }}>Datos del emisor</div>
            <div onMouseEnter={() => setActive('rnc')}>
              <XField label="RNC emisor" field={x.rnc} mono onChange={setRncVal}>
                <span className="xfield-status"><RncCheck rnc={rncVal} compact /></span>
              </XField>
            </div>
            <div onMouseEnter={() => setActive('nombre')}>
              <XField label="Razón social" field={x.nombre} />
            </div>

            <div className="upper-label" style={{ margin: '18px 0 12px' }}>Comprobante</div>
            <div className="row gap-3">
              <div style={{ flex: 1 }} onMouseEnter={() => setActive('ncf')}>
                <XField label="NCF" field={x.ncf} mono />
              </div>
              <div style={{ width: 150 }} onMouseEnter={() => setActive('fecha')}>
                <XField label="Fecha" field={x.fecha} mono />
              </div>
            </div>
            <XField label="Tipo de bien/servicio" field={x.tipoBS}>
              <span className="xfield-status"><Icon name="chevronDown" size={15} style={{ color: 'var(--text-faint)' }}/></span>
            </XField>

            <div className="upper-label" style={{ margin: '18px 0 12px' }}>Montos</div>
            <div className="row gap-3">
              <div style={{ flex: 1 }} onMouseEnter={() => setActive('monto')}>
                <XField label="Monto (sin ITBIS)" field={x.monto} mono />
              </div>
              <div style={{ flex: 1 }} onMouseEnter={() => setActive('itbis')}>
                <XField label="ITBIS" field={x.itbis} mono />
              </div>
              <div style={{ width: 86 }}><XField label="Tasa %" field={x.tasa} mono /></div>
            </div>

            <div className="row gap-2" style={{ marginTop: 8, padding: '10px 13px', background: 'var(--slate-50)', borderRadius: 8, justifyContent: 'space-between' }}>
              <span className="t-sm t-muted">Total con ITBIS</span>
              <span className="mono cell-strong" style={{ fontSize: 15 }}>RD$ 49,914.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Corrector });
