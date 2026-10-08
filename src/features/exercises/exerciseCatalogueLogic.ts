import type { CatalogueExercise } from './exerciseData'

export function displayTerm(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function filterExercises(exercises: CatalogueExercise[], search: string, bodyPart: string, equipment: string) {
  const needle = search.trim().toLocaleLowerCase()
  return exercises.filter((exercise) => {
    const matchesBodyPart = !bodyPart || exercise.muscles.includes(bodyPart)
    const matchesEquipment = !equipment || exercise.equipment.some((item) => item.slug === equipment)
    const searchContent = [exercise.name, exercise.slug, exercise.description ?? '', exercise.category, exercise.movement_pattern ?? '', ...exercise.muscles, ...exercise.equipment.map((item) => item.name)]
      .join(' ').toLocaleLowerCase()
    return matchesBodyPart && matchesEquipment && (!needle || searchContent.includes(needle))
  })
}

export function groupExercisesByLetter(exercises: CatalogueExercise[]) {
  const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  const groups = new Map<string, CatalogueExercise[]>()
  for (const exercise of sorted) {
    const letter = exercise.name.trim().charAt(0).toLocaleUpperCase()
    groups.set(letter, [...(groups.get(letter) ?? []), exercise])
  }
  return [...groups.entries()]
}

export function instructionSteps(instructions: string | null) {
  if (!instructions?.trim()) return []
  return instructions.trim().split(/(?<=[.!?])\s+/).map((step) => step.trim()).filter(Boolean)
}
