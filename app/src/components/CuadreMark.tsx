type Variant = 'light' | 'dark' | 'mono'

const VARIANTS: Record<Variant, { bg: string; stroke: string; square: string }> = {
  light: { bg: '#3f7a52', stroke: '#f4efe4', square: '#c47a52' },
  dark:  { bg: '#2a2420', stroke: '#f4efe4', square: '#cf9168' },
  mono:  { bg: 'none',    stroke: '#3f7a52', square: '#3f7a52' },
}

export default function CuadreMark({ size = 32, variant = 'light' }: { size?: number; variant?: Variant }) {
  const { bg, stroke, square } = VARIANTS[variant]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Cuadre">
      {bg !== 'none' && <rect width="100" height="100" rx="24" fill={bg} />}
      <path d="M76 23 L24 23 L24 77 L76 77" fill="none" stroke={stroke} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="55" y="42" width="16" height="16" rx="3.5" fill={square} />
    </svg>
  )
}
