import { ArrowLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  crumbs?: string[]
  onBack?: () => void
  periodo?: boolean
  periodoValue?: string
  onPeriodoChange?: (v: string) => void
  actions?: React.ReactNode
}

export default function Topbar({ title, subtitle, crumbs, onBack, periodo, periodoValue, onPeriodoChange, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="row gap-3" style={{ minWidth: 0, flex: 1 }}>
        {onBack && (
          <button className="btn btn-ghost btn-icon" onClick={onBack} title="Volver">
            <ArrowLeft size={17} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {crumbs && crumbs.length > 0 && (
            <div className="crumbs">
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <ChevronRight size={12} className="crumb-sep" />}
                  <span className={i === crumbs.length - 1 ? 'crumb-current' : 'crumb'}>{c}</span>
                </span>
              ))}
            </div>
          )}
          <div className="t-h1">{title}</div>
          {subtitle && <div className="t-sm t-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>

      <div className="row gap-2" style={{ flexShrink: 0 }}>
        {periodo && onPeriodoChange && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Calendar size={15} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <input
              type="month"
              value={periodoValue ?? ''}
              onChange={e => onPeriodoChange(e.target.value)}
              className="period-input"
              style={{ paddingLeft: 32 }}
            />
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, color: 'var(--text-faint)', pointerEvents: 'none' }} />
          </div>
        )}
        {actions}
      </div>
    </header>
  )
}
