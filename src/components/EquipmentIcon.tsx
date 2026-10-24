type Props = { slug: string; className?: string }

/** Small inline SVGs keep the equipment picker visual without adding an icon dependency. */
export function EquipmentIcon({ slug, className = '' }: Props) {
  const common = { className: `equipment-icon${className ? ` ${className}` : ''}`, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (slug.includes('bike')) return <svg {...common}><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17 10 8h4l4 9M10 8l-2-3M10 8l3 9M14 8h3" /></svg>
  if (slug.includes('band') || slug.includes('loop')) return <svg {...common}><path d="M5 8c2-3 4-3 7 0s5 3 7 0M5 16c2-3 4-3 7 0s5 3 7 0" /><path d="M5 5v3M19 5v3M5 16v3M19 16v3" /></svg>
  if (slug.includes('kettlebell')) return <svg {...common}><path d="M8 9V7a4 4 0 0 1 8 0v2M6 11a6 6 0 1 0 12 0v2a6 6 0 1 1-12 0z" /><path d="M9 14h6" /></svg>
  if (slug.includes('dumbbell')) return <svg {...common}><path d="M3 9v6M6 7v10M9 10h6M18 7v10M21 9v6M6 9h3M15 9h3M6 15h3M15 15h3" /></svg>
  if (slug.includes('ball')) return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M5 8c4 1 7 1 14-2M6 17c3-3 7-4 12-2" /></svg>
  if (slug.includes('mat')) return <svg {...common}><path d="M5 5h10a4 4 0 0 1 0 8H9v6H5z" /><path d="M9 9h6" /></svg>
  return <svg {...common}><rect x="5" y="7" width="14" height="10" rx="2" /><path d="M8 7v10M16 7v10" /></svg>
}
