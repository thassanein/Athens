// Inline SVG icon set — no raster assets. Each takes size + optional color
// (inherits currentColor by default). Stroke-based, 1.8 weight to match the UI.
const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export const IconMap = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Z" />
    <path d="M9 3v15M15 6v15" />
  </svg>
)

export const IconTasks = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M4 6h11M4 12h11M4 18h7" />
    <path d="M18.5 6.5 20 8l2.5-3" transform="translate(-2 -1)" />
    <circle cx="19" cy="16.5" r="2.5" />
  </svg>
)

export const IconAlerts = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
)

export const IconProfile = ({ size = 22 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
)

export const IconPlus = ({ size = 26 }) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconChevron = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconBack = ({ size = 24 }) => (
  <svg {...base(size)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const IconCamera = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2l1-1.6A1 1 0 0 1 8.6 4h6.8a1 1 0 0 1 .9.4l1 1.6h1.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
)

export const IconClose = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconCheck = ({ size = 18 }) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
)

export const IconDoc = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M6 3h7l5 5v13H6V3Z" />
    <path d="M13 3v5h5M9 13h6M9 17h6" />
  </svg>
)

export const IconPin = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)

export const IconExport = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
  </svg>
)

export const IconMicrosoft = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
    <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
    <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
    <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
  </svg>
)

export const IconLeaf = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 9-4 14-9 14Z" />
    <path d="M4 20c4-7 8-9 12-10" />
  </svg>
)
