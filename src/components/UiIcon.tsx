export type UiIconName = 'brand' | 'play' | 'star' | 'resource' | 'profile' | 'chevron-right' | 'chevron-left' | 'plus' | 'more' | 'check' | 'skip' | 'close' | 'search' | 'sort' | 'calendar' | 'trophy' | 'alphabetical' | 'system' | 'sun' | 'moon'

export function UiIcon({ name, className = '', filled = false }: { name: UiIconName; className?: string; filled?: boolean }) {
  const common = { className: `ui-icon${className ? ` ${className}` : ''}`, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'brand') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'play') return <svg {...common}><path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" /></svg>
  if (name === 'star') return <svg {...common}><path d="m12 4 2.4 5 5.6.7-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.6-.7z" fill={filled ? '#FFE14D' : 'none'} stroke={filled ? '#d8a200' : 'currentColor'} /></svg>
  if (name === 'resource') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>
  if (name === 'profile') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'more') return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'skip') return <svg {...common}><path d="M6 5v14M10 5l8 7-8 7z" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'search') return <svg {...common}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4 4" /></svg>
  if (name === 'sort') return <svg {...common}><path d="M7 5v14M4 8l3-3 3 3M17 19V5m-3 11 3 3 3-3" /></svg>
  if (name === 'calendar') return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
  if (name === 'trophy') return <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4" /></svg>
  if (name === 'alphabetical') return <svg {...common}><path d="M5 19 9 5l4 14M6.5 14h5M15 7h4l-4 5h4M15 19h4" /></svg>
  if (name === 'system') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 4v16M4 12h16" /></svg>
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
  if (name === 'moon') return <svg {...common}><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>
  if (name === 'chevron-left') return <svg {...common}><path d="m15 6-6 6 6 6" /></svg>
  return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>
}
