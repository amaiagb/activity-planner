export type UiIconName = 'brand' | 'play' | 'star' | 'resource' | 'chevron-right' | 'chevron-left' | 'plus' | 'more' | 'check' | 'close' | 'skip' | 'search' | 'sort' | 'system' | 'sun' | 'moon' | 'calendar' | 'trophy'

export function UiIcon({ name, className = 'ui-icon', filled = false }: { name: UiIconName; className?: string; filled?: boolean }) {
  const common = { className, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'brand') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'play') return <svg {...common}><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></svg>
  if (name === 'star') return <svg {...common}><path d="m12 4 2.4 5 5.6.7-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.6-.7z" fill={filled ? 'currentColor' : 'none'} /></svg>
  if (name === 'resource') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'more') return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'skip') return <svg {...common}><path d="m5 5 8 7-8 7zM18 5v14" /></svg>
  if (name === 'search') return <svg {...common}><circle cx="10.5" cy="10.5" r="6" /><path d="m16 16 4 4" /></svg>
  if (name === 'sort') return <svg {...common}><path d="M7 5v14M4 8l3-3 3 3M17 19V5m-3 11 3 3 3-3" /></svg>
  if (name === 'system') return <svg {...common}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (name === 'moon') return <svg {...common}><path d="M20 15.5A8 8 0 1 1 8.5 4 6 6 0 0 0 20 15.5Z" /></svg>
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>
  if (name === 'trophy') return <svg {...common}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></svg>
  if (name === 'chevron-left') return <svg {...common}><path d="m15 6-6 6 6 6" /></svg>
  return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>
}

export const Icon = UiIcon
