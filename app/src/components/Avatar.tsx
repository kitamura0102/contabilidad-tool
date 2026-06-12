type Tone = 'blue' | 'green' | 'amber' | 'slate' | 'red'

const TONES: Record<Tone, [string, string]> = {
  blue:  ['#DCE6FF', '#173AA6'],
  green: ['#C9EBD7', '#0B6E3D'],
  amber: ['#F6E3B8', '#855A06'],
  slate: ['#E3E7EC', '#4B5560'],
  red:   ['#F8D2D2', '#A82323'],
}

export default function Avatar({ name, size = 30, tone = 'blue' }: { name: string; size?: number; tone?: Tone }) {
  const initials = name
    .split(/\s+/)
    .filter(w => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
  const [bg, fg] = TONES[tone] ?? TONES.blue
  return (
    <span style={{
      width: size, height: size, minWidth: size, borderRadius: size,
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: '.02em',
      fontFamily: 'var(--font-ui)',
    }}>
      {initials || '?'}
    </span>
  )
}
