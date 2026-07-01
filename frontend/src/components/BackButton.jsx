import { IconBack } from './Icons.jsx'

// Consistent header back button. Sits at the top-left of a screen's navy header.
export default function BackButton({ onClick, label = 'Back' }) {
  if (!onClick) return null
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginLeft: -6,
        marginBottom: 8,
        color: '#fff',
        opacity: 0.92,
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '2px 4px',
      }}
    >
      <IconBack size={20} /> {label}
    </button>
  )
}
