import { useNavigate } from 'react-router-dom'
import { Upload, Sparkles, FileText, Inbox, ChevronRight } from 'lucide-react'
import Topbar from '../components/Topbar'

const PASOS = [
  { icon: Upload,   title: 'Sube las facturas', body: 'Entra a un cliente y usa "Subir facturas". Puedes subir varias fotos o PDFs a la vez, separando compras (606) de ventas (607).' },
  { icon: Sparkles, title: 'La IA extrae los datos', body: 'Cuadre lee el RNC emisor, NCF, fecha, monto e ITBIS automáticamente. Las facturas con baja confianza se marcan para que las revises.' },
  { icon: Inbox,    title: 'Revisa en la Bandeja', body: 'La Bandeja reúne todo lo que necesita atención de todos tus clientes. Corrige con la imagen al lado y usa "Guardar y siguiente" para avanzar.' },
  { icon: FileText, title: 'Exporta a la DGII', body: 'Desde Reportes o desde el cliente, descarga el 606/607 en .txt oficial para la Oficina Virtual, o en Excel para tu respaldo.' },
]

const FAQ = [
  { q: '¿Qué formatos de factura puedo subir?', a: 'Fotos (JPG, PNG) y PDFs. Las imágenes se comprimen automáticamente antes de enviarse para no gastar datos.' },
  { q: '¿Por qué algunas facturas quedan "Por revisar"?', a: 'Cuando la IA no está segura de un campo (foto borrosa, ángulo, sello encima), la marca para que la verifiques contra la imagen antes de exportar.' },
  { q: '¿Qué pasa si una factura da "Error"?', a: 'Suele ser un límite temporal del servicio de IA o una imagen ilegible. Usa "Reintentar" (individual o en lote desde la Bandeja). Si persiste, corrige los datos a mano.' },
  { q: '¿Qué se exporta en el reporte?', a: 'Solo las facturas en estado "Procesada" del período seleccionado. Las que están por revisar o en error se omiten automáticamente.' },
  { q: '¿El .txt sirve directo para la DGII?', a: 'Sí: sigue el formato pipe-delimitado oficial del 606 (Registro de Compras) y 607 (Registro de Ventas) para subir a la Oficina Virtual.' },
]

export default function Ayuda() {
  const navigate = useNavigate()

  return (
    <>
      <Topbar title="Ayuda" subtitle="Cómo funciona Cuadre y preguntas frecuentes" />

      <div className="content">
        <div style={{ maxWidth: 760 }}>
          {/* Cómo funciona */}
          <div className="upper-label" style={{ marginBottom: 14 }}>Cómo funciona</div>
          <div className="col gap-3" style={{ marginBottom: 32 }}>
            {PASOS.map((p, i) => (
              <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-50)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p.icon size={18} />
                </div>
                <div>
                  <div className="t-h3" style={{ marginBottom: 3 }}>{i + 1}. {p.title}</div>
                  <div className="t-sm t-muted">{p.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sobre 606/607 */}
          <div className="upper-label" style={{ marginBottom: 14 }}>Sobre los reportes 606 y 607</div>
          <div className="card" style={{ padding: 18, marginBottom: 32 }}>
            <div className="t-sm" style={{ lineHeight: 1.7 }}>
              El <strong>606</strong> es el Registro de Compras de Bienes y Servicios; el <strong>607</strong> es el
              Registro de Ventas. Ambos se presentan mensualmente a la <strong>DGII</strong> a través de la Oficina
              Virtual. Cuadre arma estos archivos en el formato oficial a partir de las facturas que procesa, para que
              no tengas que transcribir RNC, NCF ni montos a mano.
            </div>
          </div>

          {/* FAQ */}
          <div className="upper-label" style={{ marginBottom: 14 }}>Preguntas frecuentes</div>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 32 }}>
            {FAQ.map((f, i) => (
              <details key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <summary style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 14, color: 'var(--text-strong)', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  {f.q}
                  <ChevronRight size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                </summary>
                <div className="t-sm t-muted" style={{ padding: '0 18px 16px', lineHeight: 1.65 }}>{f.a}</div>
              </details>
            ))}
          </div>

          {/* Empezar */}
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="t-h3">¿Listo para procesar facturas?</div>
              <div className="t-sm t-muted">Entra a un cliente y sube las primeras.</div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/app')}>Ir a Clientes</button>
          </div>
        </div>
      </div>
    </>
  )
}
