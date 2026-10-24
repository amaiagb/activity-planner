import { UiIcon } from './UiIcon'

// Intentionally empty until definitive equipment artwork is available.
const equipmentIconMap: Record<string, 'dumbbell'> = {}

export function EquipmentIcon({ slug, className = '' }: { slug: string; className?: string }) {
  return <UiIcon name={equipmentIconMap[slug] ?? 'dumbbell'} className={`equipment-icon${className ? ` ${className}` : ''}`} />
}
