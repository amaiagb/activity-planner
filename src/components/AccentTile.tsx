import type { CSSProperties, ReactNode } from 'react'

export type Accent = 'lime' | 'yellow' | 'pink'

export function accentForId(id: string): Accent {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return (['lime', 'yellow', 'pink'] as const)[Math.abs(hash) % 3]
}

export const ENTITY_ACCENT = { templates: 'pink', resources: 'yellow', exercises: 'lime', streak: 'lime', activity: 'lime' } as const

export function AccentTile({ accent, icon, size = 40, pattern }: { accent: Accent; icon: ReactNode; size?: 40 | 56 | 72; pattern?: 'dots' | 'diag' | 'lines' }) {
  return <span className={`accent-tile accent-${accent}${pattern ? ` pat-${pattern}` : ''}`} style={{ '--tile-size': `${size}px` } as CSSProperties} aria-hidden="true">{icon}</span>
}
