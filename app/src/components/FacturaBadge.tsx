import { CheckCircle, AlertTriangle, XCircle, Clock, Loader } from 'lucide-react'

const MAP: Record<string, { cls: string; Icon: React.ElementType; txt: string; hint: string }> = {
  procesada:          { cls: 'badge-green',   Icon: CheckCircle,    txt: 'Procesada',   hint: 'Lista. Entra al reporte 606/607 del período.' },
  pendiente_revision: { cls: 'badge-amber',   Icon: AlertTriangle,  txt: 'Revisar',     hint: 'La IA no está segura de algún campo. Verifica contra la imagen antes de exportar.' },
  error_extraccion:   { cls: 'badge-red',     Icon: XCircle,        txt: 'Error',       hint: 'No se pudo extraer. Reintenta o corrige los datos a mano.' },
  procesando:         { cls: 'badge-blue',    Icon: Loader,         txt: 'Procesando',  hint: 'La IA está extrayendo los datos ahora mismo.' },
  en_cola:            { cls: 'badge-neutral', Icon: Clock,          txt: 'En cola',     hint: 'En espera. El procesamiento corre cada pocos minutos.' },
}

export default function FacturaBadge({ estado }: { estado: string }) {
  const m = MAP[estado] ?? MAP.pendiente_revision
  return (
    <span className={`badge ${m.cls}`} title={m.hint}>
      <m.Icon size={11} />
      {m.txt}
    </span>
  )
}
