type Tone = 'blue' | 'green' | 'amber' | 'slate' | 'red'

const TONES: Record<Tone, [string, string]> = {
  blue:  ['#DCE6FF', '#173AA6'],
  green: ['#C9EBD7', '#0B6E3D'],
  amber: ['#F6E3B8', '#855A06'],
  slate: ['#E3E7EC', '#4B5560'],
  red:   ['#F8D2D2', '#A82323'],
}

export default function Avatar({ name, size = 30, tone = 'blue', src }: { name: string; size?: number; tone?: Tone; src?: string | null }) {
  const style: React.CSSProperties = {
    width: size, height: size, minWidth: size, borderRadius: size,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  }

  if (src) {
    return (
      <span style={style}>
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
      </span>
    )
  }

  const initials = name
    .split(/\s+/)
    .filter(w => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
  const [bg, fg] = TONES[tone] ?? TONES.blue
  return (
    <span style={{
      ...style,
      background: bg, color: fg,
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: '.02em',
      fontFamily: 'var(--font-ui)',
    }}>
      {initials || '?'}
    </span>
  )
}
