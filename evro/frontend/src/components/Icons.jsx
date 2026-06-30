// Minimal inline stroke icons (no icon dependency).
const S = ({ children, size = 18 }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
export const IconExec = () => <S><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></S>
export const IconPortfolio = () => <S><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></S>
export const IconForecast = () => <S><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></S>
export const IconOpportunity = () => <S><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></S>
export const IconSpend = () => <S><path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M21 9a9 9 0 0 0-9-6" /></S>
export const IconLeaderboard = () => <S><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" /></S>
export const IconReport = () => <S><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></S>
export const IconLeaf = () => <S><path d="M11 20A7 7 0 0 1 4 13c0-6 9-10 16-10-1 8-5 17-12 17z" /><path d="M4 21c4-4 7-7 16-9" /></S>
export const IconBook = () => <S><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></S>
export const IconPlus = () => <S><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></S>
export const IconMenu = () => <S><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></S>
export const IconBack = () => <S><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></S>
export const IconCheck = () => <S size={16}><polyline points="20 6 9 17 4 12" /></S>
export const IconAlert = () => <S size={16}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></S>
