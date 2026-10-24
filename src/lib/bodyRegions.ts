/** Stable, user-facing regions used by filters and workout generation.
 * RepDB muscles remain available as detailed tags; these regions are a
 * deliberately smaller grouping that makes selection practical.
 */
export const BODY_REGION_OPTIONS = [
  { slug: 'legs', label: 'Legs' },
  { slug: 'arms', label: 'Arms' },
  { slug: 'chest', label: 'Chest' },
  { slug: 'back', label: 'Back' },
  { slug: 'shoulders', label: 'Shoulders' },
  { slug: 'core', label: 'Core' },
  { slug: 'full_body', label: 'Full body' },
] as const

const regionMuscles: Record<string, string[]> = {
  legs: ['quad', 'quadriceps', 'hamstring', 'glute', 'calf', 'adductor', 'abductor', 'hip'],
  arms: ['bicep', 'tricep', 'forearm', 'brachialis', 'brachioradialis'],
  chest: ['chest', 'pectoral'],
  back: ['back', 'latissimus', 'lat', 'rhomboid', 'trapezius', 'erector', 'lower back', 'upper back'],
  shoulders: ['shoulder', 'deltoid', 'rotator cuff'],
  core: ['core', 'abdom', 'oblique', 'transverse', 'rectus', 'serratus', 'hip flexor'],
}

function normalized(value: string) {
  return value.toLocaleLowerCase().replaceAll('_', ' ').replaceAll('-', ' ')
}

/** Returns the generic regions an exercise belongs to. */
export function bodyRegionsForExercise(category: string | null | undefined, muscles: string[] = []) {
  const categoryValue = normalized(category ?? '')
  const values = muscles.map(normalized)
  const regions = new Set<string>()
  for (const [region, terms] of Object.entries(regionMuscles)) {
    if (values.some((muscle) => terms.some((term) => muscle.includes(term)))) regions.add(region)
  }
  if (categoryValue === 'cardio' || categoryValue === 'outdoor' || categoryValue === 'walking' || categoryValue === 'mobility' || categoryValue === 'stretching') regions.add('full_body')
  if (categoryValue === 'push') { regions.add('chest'); regions.add('shoulders'); regions.add('arms') }
  if (categoryValue === 'pull') { regions.add('back'); regions.add('arms') }
  if (regions.size >= 3) regions.add('full_body')
  return [...regions]
}

export function matchesBodyRegion(category: string | null | undefined, muscles: string[], region: string) {
  if (region === 'push') return bodyRegionsForExercise(category, muscles).some((item) => ['chest', 'shoulders'].includes(item))
  if (region === 'pull') return bodyRegionsForExercise(category, muscles).some((item) => ['back', 'arms'].includes(item))
  return bodyRegionsForExercise(category, muscles).includes(region)
}
