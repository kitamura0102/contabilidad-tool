import { CheckCircle, AlertTriangle, XCircle, Clock, Loader } from 'lucide-react'

const MAP: Record<string, { cls: string; Icon: React.ElementType; txt: string }> = {
  procesada:          { cls: 'badge-green',   Icon: CheckCircle,    txt: 'Procesada' },
  pendiente_revision: { cls: 'badge-amber',   Icon: AlertTriangle,  txt: 'Revisar' },
  error_extraccion:   { cls: 'badge-red',     Icon: XCircle,        txt: 'Error' },
  procesando:         { cls: 'badge-blue',    Icon: Loader,         txt: 'Procesando' },
  en_cola:            { cls: 'badge-neutral', Icon: Clock,          txt: 'En cola' },
}

export default function FacturaBadge({ estado }: { estado: string }) {
  const m = MAP[estado] ?? MAP.pendiente_revision
  return (
    <span className={`badge ${m.cls}`}>
      <m.Icon size={11} />
      {m.txt}
    </span>
  )
}
