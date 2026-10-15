export type UiIconName = 'brand' | 'play' | 'star' | 'resource' | 'chevron-right' | 'plus'

export function UiIcon({ name, className = 'ui-icon', filled = false }: { name: UiIconName; className?: string; filled?: boolean }) {
  const common = { className, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'brand') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'play') return <svg {...common}><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></svg>
  if (name === 'star') return <svg {...common}><path d="m12 4 2.4 5 5.6.7-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.6-.7z" fill={filled ? 'currentColor' : 'none'} /></svg>
  if (name === 'resource') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>
}
