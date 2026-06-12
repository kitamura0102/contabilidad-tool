import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

export default function Toast({ message, onDone, ms = 3200 }: { message: string; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, ms)
    return () => clearTimeout(t)
  }, [message, ms, onDone])

  return (
    <div className="toast" role="status">
      <CheckCircle size={15} style={{ color: 'var(--green-500)' }} />
      {message}
    </div>
  )
}
