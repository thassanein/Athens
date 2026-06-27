import { useEffect } from 'react'
import { IconCheck } from './Icons.jsx'

// Transient confirmation toast (1.9s, per README).
export default function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900)
    return () => clearTimeout(t)
  }, [message, onDone])

  return (
    <div className="toast" role="status">
      <IconCheck size={16} />
      {message}
    </div>
  )
}
