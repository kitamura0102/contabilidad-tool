/* CIFRA — Pantalla 3: Upload + extracción IA (drawer) */

function XField({ label, field, mono, onChange, children }) {
  const lvl = field.nivel;
  return (
    <div className="xfield">
      <div className="xfield-top">
        <span className="field-label" style={{ margin: 0 }}>{label}</span>
        <ConfChip conf={field.conf} nivel={lvl} />
      </div>
      <div className="xfield-input-wrap">
        <input className={'input' + (mono ? ' mono' : '') + (lvl !== 'alto' ? ' lvl-' + lvl : '')}
          defaultValue={field.valor} onChange={e => onChange && onChange(e.target.value)} />
        {children}
      </div>
      {field.nota && <div className={'field-note ' + (lvl === 'bajo' ? 'bad' : 'warn')}><Icon name="alert" size={12}/>{field.nota}</div>}
    </div>
  );
}

function UploadDrawer({ client, onClose, onCorrect, onConfirmed }) {
  const [stage, setStage] = React.useState('drop'); // drop | processing | review
  const [over, setOver] = React.useState(false);
  const [rncVal, setRncVal] = React.useState(EXTRACCION.campos.rnc.valor);

  function startProcessing() {
    setStage('processing');
    setTimeout(() => setStage('review'), 2100);
  }

  const x = EXTRACCION.campos;

  return (
    <div className="overlay right" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer" onMouseDown={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="via-icon via-whatsapp"><Icon name="upload" size={15}/></div>
          <div style={{ flex: 1 }}>
            <div className="t-h2">Subir factura</div>
            <div className="t-sm t-muted">{client.nombre} · Compras 606 · {PERIODO.label}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div className="drawer-body">
          {stage === 'drop' && (
            <>
              <div className={'dropzone' + (over ? ' over' : '')}
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={e => { e.preventDefault(); setOver(false); startProcessing(); }}
                onClick={startProcessing}>
                <div className="dropzone-ico"><Icon name="fileUp" size={24}/></div>
                <div>
                  <div className="t-h3">Arrastra una imagen o PDF aquí</div>
                  <div className="t-sm t-muted" style={{ marginTop: 3 }}>JPG, PNG o PDF · hasta 10 MB · varios archivos a la vez</div>
                </div>
                <button className="btn btn-secondary btn-sm"><Icon name="image" size={14}/>Seleccionar archivo</button>
              </div>

              <div className="row gap-2" style={{ margin: '20px 0 12px' }}>
                <div className="divider" style={{ flex: 1 }}></div>
                <span className="t-faint" style={{ fontSize: 12 }}>o llegan solas</span>
                <div className="divider" style={{ flex: 1 }}></div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div className="row gap-3">
                  <div className="via-icon via-whatsapp"><Icon name="whatsapp" size={15}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="t-h3">WhatsApp y correo conectados</div>
                    <div className="t-sm t-muted">Tus clientes reenvían las facturas y aparecen en la Bandeja.</div>
                  </div>
                </div>
                <div className="row gap-2" style={{ marginTop: 12 }}>
                  <span className="mono t-sm" style={{ background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', flex: 1 }}>{CONTADOR.email_unico}</span>
                  <button className="btn btn-ghost btn-icon" title="Copiar"><Icon name="copy" size={15}/></button>
                </div>
              </div>
            </>
          )}

          {stage === 'processing' && (
            <div className="ai-processing">
              <div className="ai-orb"><Icon name="sparkles" size={22}/></div>
              <div>
                <div className="t-h2">Extrayendo datos…</div>
                <div className="t-sm t-muted" style={{ marginTop: 4 }}>Leyendo RNC, NCF, montos e ITBIS de la imagen</div>
              </div>
              <div className="mono t-sm t-faint">{EXTRACCION.archivo}</div>
            </div>
          )}

          {stage === 'review' && (
            <>
              <div className="row gap-3" style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 8 }}>
                <Icon name="checkCircle" size={16} style={{ color: 'var(--green-600)' }}/>
                <div className="t-sm" style={{ color: 'var(--green-700)', fontWeight: 500 }}>Datos extraídos. Revisa los campos marcados antes de guardar.</div>
              </div>

              {/* miniatura */}
              <div className="row gap-3" style={{ marginBottom: 18 }}>
                <div className="invoice-preview" style={{ width: 84, height: 100, minWidth: 84 }}>
                  <div className="invoice-paper" style={{ padding: 8, fontSize: 6, lineHeight: 1.5 }}>
                    DISTRIBUIDORA<br/>CORRIPIO SA<br/>RNC 101023154<br/>NCF B0100004521<br/>━━━━━<br/>Total 99,710
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="t-h3">{EXTRACCION.archivo}</div>
                  <div className="t-sm t-muted" style={{ margin: '2px 0 8px' }}>Recibida hoy · 10:12 a.m. · WhatsApp</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => onCorrect()}>
                    <Icon name="panelLeft" size={14}/>Ver imagen y corregir
                  </button>
                </div>
              </div>

              <div className="upper-label" style={{ marginBottom: 10 }}>Datos de la factura</div>

              <XField label="RNC emisor" field={x.rnc} mono onChange={setRncVal}>
                <span className="xfield-status"><RncCheck rnc={rncVal} compact /></span>
              </XField>
              <XField label="Razón social" field={x.nombre} />
              <div className="row gap-3">
                <div style={{ flex: 1 }}><XField label="NCF" field={x.ncf} mono /></div>
                <div style={{ width: 140 }}><XField label="Fecha" field={x.fecha} mono /></div>
              </div>
              <XField label="Tipo de bien/servicio" field={x.tipoBS}>
                <span className="xfield-status t-sm t-muted" style={{ pointerEvents: 'none' }}>09 · Compras</span>
              </XField>
              <div className="row gap-3">
                <div style={{ flex: 1 }}><XField label="Monto (sin ITBIS)" field={x.monto} mono /></div>
                <div style={{ flex: 1 }}><XField label="ITBIS (18%)" field={x.itbis} mono /></div>
              </div>
            </>
          )}
        </div>

        {stage === 'review' && (
          <div className="drawer-foot">
            <button className="btn btn-ghost" onClick={() => onCorrect()}><Icon name="pencil" size={15}/>Corregir en detalle</button>
            <div className="spacer"></div>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={onConfirmed}><Icon name="check" size={15}/>Confirmar y guardar</button>
          </div>
        )}
        {stage === 'drop' && (
          <div className="drawer-foot">
            <div className="t-sm t-muted row gap-2"><Icon name="zap" size={13} style={{ color: 'var(--accent)' }}/>La IA pre-llena los campos; tú confirmas.</div>
            <div className="spacer"></div>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { UploadDrawer, XField });
