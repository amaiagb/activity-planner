import { estimateWorkoutDurationMinutes, exerciseById, exerciseBySlug, hasRequiredEquipment, workoutTemplates } from './catalogue'
import type { ExerciseDefinition, WorkoutTemplate } from './catalogue'
import { weekdays } from './types'
import type {
  CandidateScoreContext,
  FitnessLevel,
  PlannerInput,
  PlannerOptions,
  PlannedExercise,
  PlannedWorkout,
  WeeklyPlan,
  Weekday,
  WorkoutHistory,
  UnscheduledReason,
  UnscheduledSession,
} from './types'

const lowerBodyMuscles = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves'])
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function dateFromIso(value: string): Date | null {
  if (!datePattern.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function weekMonday(date = new Date()): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const offset = (utcDate.getUTCDay() + 6) % 7
  utcDate.setUTCDate(utcDate.getUTCDate() - offset)
  return dateString(utcDate)
}

function weekdayForDate(value: string): Weekday | null {
  const date = dateFromIso(value)
  if (!date) return null
  return weekdays[(date.getUTCDay() + 6) % 7] ?? null
}

function addDays(value: string, days: number): string {
  const date = dateFromIso(value)
  if (!date) return value
  date.setUTCDate(date.getUTCDate() + days)
  return dateString(date)
}

function dayDifference(a: string, b: string): number {
  const first = dateFromIso(a)
  const second = dateFromIso(b)
  if (!first || !second) return Number.POSITIVE_INFINITY
  return Math.round((second.getTime() - first.getTime()) / 86_400_000)
}

function getSessionCount(input: PlannerInput): number {
  const dayCount = new Set(input.availability.days).size
  if (dayCount <= 2) return dayCount
  return Math.min(dayCount, 5)
}

function scheduledDates(input: PlannerInput, weekStart: string): string[] {
  const days = weekdays.filter((day) => input.availability.days.includes(day))
  const count = getSessionCount(input)
  if (count === 0) return []
  const selected = count === days.length
    ? days
    : Array.from({ length: count }, (_, index) => days[Math.round(index * (days.length - 1) / (count - 1))]).filter((day): day is Weekday => Boolean(day))
  return selected.map((day) => addDays(weekStart, weekdays.indexOf(day)))
}

function dateFitsRequestedDuration(templateDuration: number, requested: number): boolean {
  const explicitRanges: Record<number, [number, number]> = {
    15: [10, 15],
    20: [15, 20],
    30: [25, 35],
    45: [40, 50],
    60: [50, 65],
  }
  const range = explicitRanges[requested] ?? [Math.max(5, requested - 5), requested + 5]
  return templateDuration >= range[0] && templateDuration <= range[1]
}

function durationScore(templateDuration: number, requested: number): number {
  const tolerance = Math.max(5, requested * 0.2)
  return Math.max(0, 1 - Math.abs(templateDuration - requested) / tolerance)
}

function templateBySlug(slug: string): WorkoutTemplate | undefined {
  const baseSlug = slug.split('__plus__')[0]
  return workoutTemplates.find((template) => template.slug === baseSlug)
}

function plannedExercises(template: WorkoutTemplate): PlannedExercise[] {
  return template.blocks.map((item) => {
    const exercise = exerciseBySlug.get(item.slug)
    if (!exercise) throw new Error(`Unknown catalogue exercise: ${item.slug}`)
    return { id: exercise.id, slug: exercise.slug, name: exercise.name, prescribedSets: item.prescribedSets, prescribedReps: item.prescribedReps, prescribedDurationSeconds: item.prescribedDurationSeconds, restSeconds: item.restSeconds }
  })
}

function buildWorkout(template: WorkoutTemplate, date: string): PlannedWorkout {
  const exerciseRows = template.blocks.map((item) => exerciseBySlug.get(item.slug)).filter((row): row is ExerciseDefinition => Boolean(row))
  return {
    id: `${date}:${template.slug}`,
    date,
    templateSlug: template.slug,
    name: template.name,
    category: template.category,
    durationMinutes: estimateWorkoutDurationMinutes(template),
    exercises: plannedExercises(template),
    status: 'planned',
    isOutdoor: exerciseRows.some((exercise) => exercise.isOutdoor),
    intensity: template.intensity,
    movementPatterns: [...new Set(exerciseRows.map((exercise) => exercise.movementPattern))],
    muscleGroups: [...new Set(exerciseRows.flatMap((exercise) => exercise.muscleGroups))],
  }
}

function isHardLowerBody(workout: PlannedWorkout | WorkoutHistory): boolean {
  const ids = 'exercises' in workout ? workout.exercises.map((item) => item.id) : workout.exerciseIds
  const lowerBodyExercises = ids.map((id) => exerciseById.get(id)).filter((exercise) => exercise?.muscleGroups.some((muscle) => lowerBodyMuscles.has(muscle)))
  const muscles = workoutMuscleGroups(workout)
  const lowerMuscles = new Set(muscles.filter((muscle) => lowerBodyMuscles.has(muscle)))
  if (workout.intensity !== undefined) return workout.intensity === 'high' && lowerBodyExercises.length > 0
  // Legacy history often lacks intensity; infer hard lower-body work from a strength category
  // and multiple lower-body exercises/muscle groups, or from several moderate/high exercises.
  if (workout.category === 'strength') return lowerBodyExercises.length >= 2 || lowerMuscles.size >= 2
  return lowerBodyExercises.length >= 3 && lowerBodyExercises.some((exercise) => exercise?.intensity !== 'low')
}

function candidateRejectionReasons(workout: PlannedWorkout, input: PlannerInput, checkDuration = true): UnscheduledReason[] {
  const reasons = new Set<UnscheduledReason>()
  if (checkDuration && !dateFitsRequestedDuration(workout.durationMinutes, input.availability.durationMinutes)) reasons.add('duration')
  if (workout.isOutdoor && !input.preferences.canGoOutside) reasons.add('outdoor-access')
  const excluded = new Set(input.excludedExerciseIds)
  for (const item of workout.exercises) {
    const exercise = exerciseById.get(item.id)
    if (!exercise || !exercise.active) reasons.add('inactive-exercise')
    else {
      if (excluded.has(exercise.id)) reasons.add('excluded-exercise')
      if (!hasRequiredEquipment(exercise, input.equipment)) reasons.add('equipment')
      if (exercise.isOutdoor && !input.preferences.canGoOutside) reasons.add('outdoor-access')
    }
  }
  return [...reasons]
}

function isCandidateValid(workout: PlannedWorkout, input: PlannerInput, checkDuration = true): boolean {
  return candidateRejectionReasons(workout, input, checkDuration).length === 0
}

function recent(workouts: Array<PlannedWorkout | WorkoutHistory>, date: string): Array<PlannedWorkout | WorkoutHistory> {
  return workouts.filter((workout) => {
    const age = dayDifference(workout.date, date)
    return age >= 0 && age <= 28
  })
}

function workoutExerciseIds(workout: PlannedWorkout | WorkoutHistory): string[] {
  return 'exercises' in workout ? workout.exercises.map((exercise) => exercise.id) : workout.exerciseIds
}

function workoutMovementPatterns(workout: PlannedWorkout | WorkoutHistory): string[] {
  if (workout.movementPatterns) return workout.movementPatterns
  return workoutExerciseIds(workout).flatMap((id) => {
    const movement = exerciseById.get(id)?.movementPattern
    return movement ? [movement] : []
  })
}

function workoutMuscleGroups(workout: PlannedWorkout | WorkoutHistory): string[] {
  if (workout.muscleGroups) return workout.muscleGroups
  return workoutExerciseIds(workout).flatMap((id) => exerciseById.get(id)?.muscleGroups ?? [])
}

function preferenceScore(workout: PlannedWorkout, input: PlannerInput): number {
  const preferences = input.preferences
  const preferred: Record<string, boolean> = {
    strength: preferences.strength,
    cardio: preferences.cardio || preferences.hiit,
    walking: preferences.walking,
    mobility: preferences.mobility,
    recovery: preferences.mobility,
  }
  const anyPreference = preferences.strength || preferences.cardio || preferences.walking || preferences.hiit || preferences.mobility
  return preferred[workout.category] ? 1 : anyPreference ? 0.4 : 0.65
}

function equipmentScore(workout: PlannedWorkout, input: PlannerInput): number {
  const rows = workout.exercises.map((item) => exerciseById.get(item.id)).filter((row): row is ExerciseDefinition => Boolean(row))
  const groups = rows.flatMap((row) => row.equipmentGroups)
  if (!groups.length) return 1
  const nonBodyweightSatisfied = groups.filter((group) => group.some((slug) => slug !== 'bodyweight' && input.equipment.includes(slug))).length
  return 0.8 + 0.2 * nonBodyweightSatisfied / groups.length
}

function recoveryScore(workout: PlannedWorkout, context: CandidateScoreContext): number {
  let score = workout.intensity === 'low' ? 1 : workout.intensity === 'moderate' ? 0.78 : 0.58
  if (context.previousWorkout) {
    if (isHardLowerBody(context.previousWorkout) && isHardLowerBody(workout)) score -= 1
    if (context.previousWorkout.intensity === 'high' && workout.intensity !== 'high') score += 0.2
    if (context.previousWorkout.intensity === 'low' && workout.intensity === 'low') score -= 0.08
  }
  return Math.max(0, Math.min(1, score))
}

function fitnessLevelScore(workout: PlannedWorkout, fitnessLevel: FitnessLevel): number {
  const template = templateBySlug(workout.templateSlug)
  if (!template) return 0
  if (template.difficulty === fitnessLevel) return 1
  if (fitnessLevel === 'beginner' && template.difficulty === 'intermediate') return 0.55
  if (fitnessLevel === 'advanced' && template.difficulty === 'beginner') return 0.72
  return 0.8
}

function varietyPenalty(workout: PlannedWorkout, context: CandidateScoreContext): number {
  const recentWorkouts = context.recentWorkouts ?? []
  let penalty = 0
  if (recentWorkouts.some((item) => item.templateSlug === workout.templateSlug)) penalty += 25
  const currentIds = new Set(workout.exercises.map((exercise) => exercise.id))
  const recentlyUsed = new Set(recentWorkouts.flatMap(workoutExerciseIds))
  for (const id of currentIds) if (recentlyUsed.has(id)) penalty += 10

  const previous = context.previousWorkout
  if (previous && dayDifference(previous.date, workout.date) === 1) {
    const previousMovements = new Set(workoutMovementPatterns(previous))
    if (workoutMovementPatterns(workout).some((pattern) => previousMovements.has(pattern))) penalty += 15
    const previousMuscles = new Set(workoutMuscleGroups(previous))
    if (workoutMuscleGroups(workout).some((muscle) => previousMuscles.has(muscle)) && (previous.intensity === 'high' || workout.intensity === 'high')) penalty += 15
    const sameExerciseSet = [...currentIds].every((id) => workoutExerciseIds(previous).includes(id))
    if (sameExerciseSet) penalty += 25
  }
  if (previous && isHardLowerBody(previous) && isHardLowerBody(workout)) penalty += 100
  return penalty
}

export function scoreWorkoutCandidate(workout: PlannedWorkout, input: PlannerInput, context: CandidateScoreContext = {}): number {
  const score = preferenceScore(workout, input) * 25
    + equipmentScore(workout, input) * 20
    + (1 - varietyPenalty(workout, context) / 100) * 20
    + recoveryScore(workout, context) * 15
    + durationScore(workout.durationMinutes, input.availability.durationMinutes) * 10
    + fitnessLevelScore(workout, input.fitnessLevel) * 10
  return score - varietyPenalty(workout, context)
}

type RandomSource = () => number

function randomSource(seed?: number): RandomSource {
  if (seed === undefined) return Math.random
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function contextForDate(history: WorkoutHistory[], planned: PlannedWorkout[], date: string): CandidateScoreContext {
  const relevant = [...history, ...planned].filter((item) => dayDifference(item.date, date) >= 0)
  const ordered = relevant.slice().sort((a, b) => b.date.localeCompare(a.date))
  return { recentWorkouts: recent(relevant, date), previousWorkout: ordered.find((item) => dayDifference(item.date, date) === 1) }
}

function candidateWorkouts(date: string, input: PlannerInput, checkDuration = true): PlannedWorkout[] {
  const baseCandidates = workoutTemplates.map((template) => buildWorkout(template, date)).filter((workout) => isCandidateValid(workout, input, checkDuration))
  // Keep combinations in the scoring pool even when a single template also fits.
  const components = workoutTemplates.filter((template) => isCandidateValid(buildWorkout(template, date), input, false))
  const combinations: PlannedWorkout[] = []
  for (let firstIndex = 0; firstIndex < components.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < components.length; secondIndex += 1) {
      const first = components[firstIndex]!
      const second = components[secondIndex]!
      const durationMinutes = estimateWorkoutDurationMinutes(first) + estimateWorkoutDurationMinutes(second)
      if (first.category === second.category || (checkDuration && !dateFitsRequestedDuration(durationMinutes, input.availability.durationMinutes))) continue
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 } as const
      const intensityOrder = { low: 0, moderate: 1, high: 2 } as const
      const template: WorkoutTemplate = {
        slug: `${first.slug}__plus__${second.slug}`,
        name: `${first.name} + ${second.name}`,
        category: first.category,
        durationMinutes,
        difficulty: difficultyOrder[first.difficulty] >= difficultyOrder[second.difficulty] ? first.difficulty : second.difficulty,
        intensity: intensityOrder[first.intensity] >= intensityOrder[second.intensity] ? first.intensity : second.intensity,
        blocks: [...first.blocks, ...second.blocks],
      }
      const workout = buildWorkout(template, date)
      if (isCandidateValid(workout, input, checkDuration)) combinations.push(workout)
    }
  }
  return [...baseCandidates, ...combinations]
}

export type TodayWorkoutRequest = {
  durationMinutes: number
  outdoor: boolean
  muscleGroup?: string
  equipment?: string[]
}

/** Generate a one-day session from explicit limits without changing the user's weekly availability. */
export function generateTodayWorkout(date: string, input: PlannerInput, request: TodayWorkoutRequest, options: PlannerOptions = {}): PlannedWorkout | null {
  if (!weekdayForDate(date) || request.durationMinutes < 5 || request.durationMinutes > 240) return null
  if (request.outdoor) {
    const exercise = exerciseBySlug.get('walk_easy')
    if (!exercise || !exercise.active || input.excludedExerciseIds.includes(exercise.id)) return null
    return {
      id: `${date}:manual_easy_walk_${request.durationMinutes}`, date,
      templateSlug: `manual_easy_walk_${request.durationMinutes}`, name: 'Easy walk', category: 'walking',
      durationMinutes: request.durationMinutes,
      exercises: [{ id: exercise.id, slug: exercise.slug, name: exercise.name, prescribedSets: null, prescribedReps: null, prescribedDurationSeconds: request.durationMinutes * 60, restSeconds: 0 }],
      status: 'planned', isOutdoor: true, intensity: 'low', movementPatterns: [exercise.movementPattern], muscleGroups: [...exercise.muscleGroups],
    }
  }

  const selectedEquipment = request.equipment ?? []
  if (selectedEquipment.some((slug) => !input.equipment.includes(slug))) return null
  const dayInput: PlannerInput = {
    ...input,
    availability: { ...input.availability, durationMinutes: request.durationMinutes },
    equipment: selectedEquipment.length ? [...new Set([...input.equipment, ...selectedEquipment])] : input.equipment,
    preferences: { ...input.preferences, canGoOutside: false },
  }
  const context = contextForDate(input.history, [], date)
  const random = randomSource(options.seed)
  const candidates = candidateWorkouts(date, dayInput, false).filter((candidate) => {
    if (candidate.isOutdoor || candidate.durationMinutes > request.durationMinutes) return false
    if (request.muscleGroup && !candidate.muscleGroups.includes(request.muscleGroup)) return false
    if (selectedEquipment.length && !candidate.exercises.some((item) => {
      const definition = exerciseById.get(item.id)
      return definition?.equipmentGroups.some((group) => group.some((slug) => selectedEquipment.includes(slug)))
    })) return false
    return true
  })
  const ranked = candidates.map((candidate) => ({ candidate, rank: scoreWorkoutCandidate(candidate, dayInput, context) + random() * 1.5 }))
  ranked.sort((a, b) => b.rank - a.rank)
  return ranked[0]?.candidate ?? null
}

function chooseWorkout(date: string, input: PlannerInput, context: CandidateScoreContext, random: RandomSource, differentFrom?: string): PlannedWorkout | null {
  const candidates = candidateWorkouts(date, input)
  const different = differentFrom ? candidates.filter((candidate) => candidate.templateSlug !== differentFrom) : candidates
  const pool = different.length ? different : candidates
  if (!pool.length) return null
  const ranked = pool.map((candidate) => ({ candidate, rank: scoreWorkoutCandidate(candidate, input, context) + random() * 1.5 }))
  ranked.sort((a, b) => b.rank - a.rank)
  return ranked[0]?.candidate ?? null
}

/** Returns the highest-scoring valid template for a given date, or null when constraints make one impossible. */
export function generateWorkout(date: string, input: PlannerInput, options: PlannerOptions = {}): PlannedWorkout | null {
  const weekday = weekdayForDate(date)
  if (!weekday || !input.availability.days.includes(weekday)) return null
  return chooseWorkout(date, input, contextForDate(input.history, [], date), randomSource(options.seed))
}

export function generateWeeklyPlan(input: PlannerInput, options: PlannerOptions = {}): WeeklyPlan {
  const weekStart = input.weekStart ?? weekMonday()
  if (!dateFromIso(weekStart)) throw new Error('weekStart must be a valid ISO date in YYYY-MM-DD format.')
  const random = randomSource(options.seed)
  const workouts: PlannedWorkout[] = []
  const dates = scheduledDates(input, weekStart)
  const unscheduledSessions: UnscheduledSession[] = []
  for (const date of dates) {
    const blocked = input.blockedDates?.find((item) => item.date === date)
    if (blocked) {
      unscheduledSessions.push({ date, reasons: ['date-blocked'], message: blocked.reason || 'This date is blocked from scheduling.' })
      continue
    }
    const context = contextForDate(input.history, workouts, date)
    const workout = chooseWorkout(date, input, context, random)
    if (workout) workouts.push(workout)
    else {
      const reasons = diagnoseUnscheduledReasons(date, input)
      unscheduledSessions.push({ date, reasons, message: describeUnscheduledReasons(reasons) })
    }
  }
  return { weekStart, requestedSessions: dates.length, workouts, unscheduledSessions }
}

function diagnoseUnscheduledReasons(date: string, input: PlannerInput): UnscheduledReason[] {
  const reasons = new Set<UnscheduledReason>()
  for (const template of workoutTemplates) {
    for (const reason of candidateRejectionReasons(buildWorkout(template, date), input)) reasons.add(reason)
  }
  if (reasons.size === 0) reasons.add('no-candidate')
  return [...reasons]
}

function describeUnscheduledReasons(reasons: UnscheduledReason[]): string {
  const descriptions: Record<UnscheduledReason, string> = {
    'date-blocked': 'The date is blocked from scheduling.',
    duration: 'No available session fits the requested duration.',
    equipment: 'Available equipment does not satisfy any session.',
    'excluded-exercise': 'Exercise exclusions prevent every available session.',
    'outdoor-access': 'Outdoor access is required by the available sessions.',
    'inactive-exercise': 'No active catalogue session satisfies the constraints.',
    'no-candidate': 'No session satisfies the current planning constraints.',
  }
  return `Could not generate this requested session: ${reasons.map((reason) => descriptions[reason]).join(' ')}`
}

/** Replaces a planned workout or adds an alternative after a skip, preserving completed/skipped records and inputs. */
export function regenerateWorkout(
  date: string,
  currentPlan: WeeklyPlan,
  history: WorkoutHistory[],
  input: PlannerInput,
  options: PlannerOptions = {},
): WeeklyPlan {
  const weekOffset = dayDifference(currentPlan.weekStart, date)
  if (weekOffset < 0 || weekOffset > 6) return currentPlan
  const current = currentPlan.workouts.find((workout) => workout.date === date)
  const weekday = weekdayForDate(date)
  if (current?.status === 'completed' || !weekday || !input.availability.days.includes(weekday)) return currentPlan

  const skippedRecord: WorkoutHistory[] = current?.status === 'skipped'
    ? [{ date: current.date, templateSlug: current.templateSlug, exerciseIds: current.exercises.map((exercise) => exercise.id), movementPatterns: current.movementPatterns, muscleGroups: current.muscleGroups, category: current.category, intensity: current.intensity, skipped: true }]
    : []
  const selected = chooseWorkout(date, input, contextForDate([...history, ...skippedRecord], currentPlan.workouts.filter((workout) => workout.date !== date), date), randomSource(options.seed), current?.templateSlug)
  if (!selected) {
    const reasons = diagnoseUnscheduledReasons(date, input)
    const unscheduledSessions = currentPlan.unscheduledSessions.filter((item) => item.date !== date)
    unscheduledSessions.push({ date, reasons, message: describeUnscheduledReasons(reasons) })
    return { ...currentPlan, unscheduledSessions }
  }

  const workouts = currentPlan.workouts.filter((workout) => workout.date !== date || workout.status !== 'planned')
  workouts.push(selected)
  return { ...currentPlan, workouts: workouts.sort((a, b) => a.date.localeCompare(b.date) || Number(a.status === 'planned') - Number(b.status === 'planned')), unscheduledSessions: currentPlan.unscheduledSessions.filter((item) => item.date !== date) }
}

export type WeeklyPlanValidation = { valid: boolean; errors: string[] }

export function validateWeeklyPlan(plan: WeeklyPlan, input: PlannerInput): WeeklyPlanValidation {
  const errors: string[] = []
  const weekStart = dateFromIso(plan.weekStart)
  if (!weekStart) errors.push('The week start must be a valid ISO date.')
  else if (weekStart.getUTCDay() !== 1) errors.push('The week must start on Monday.')

  const seenPlannedDates = new Set<string>()
  for (const workout of plan.workouts) {
    const date = dateFromIso(workout.date)
    if (!date) {
      errors.push(`${workout.id} has an invalid date.`)
      continue
    }
    if (weekStart && (dayDifference(plan.weekStart, workout.date) < 0 || dayDifference(plan.weekStart, workout.date) > 6)) errors.push(`${workout.id} is outside the plan week.`)
    if (workout.status !== 'planned') continue
    if (!input.availability.days.includes(weekdayForDate(workout.date) as Weekday)) errors.push(`${workout.id} is scheduled on an unavailable day.`)
    if (workout.status === 'planned' && seenPlannedDates.has(workout.date)) errors.push(`${workout.date} has more than one planned workout.`)
    if (workout.status === 'planned') seenPlannedDates.add(workout.date)
    if (!dateFitsRequestedDuration(workout.durationMinutes, input.availability.durationMinutes)) errors.push(`${workout.id} does not fit the requested duration.`)
    if (workout.isOutdoor && !input.preferences.canGoOutside) errors.push(`${workout.id} requires outdoor access.`)
    for (const item of workout.exercises) {
      const exercise = exerciseById.get(item.id)
      if (!exercise || !exercise.active) errors.push(`${workout.id} includes an unknown or inactive exercise.`)
      else {
        if (input.excludedExerciseIds.includes(item.id)) errors.push(`${workout.id} includes an excluded exercise (${exercise.slug}).`)
        if (!hasRequiredEquipment(exercise, input.equipment)) errors.push(`${workout.id} requires unavailable equipment for ${exercise.slug}.`)
        if (exercise.isOutdoor && !input.preferences.canGoOutside) errors.push(`${workout.id} includes an outdoor exercise (${exercise.slug}).`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

export { exercises, workoutTemplates } from './catalogue'
export type {
  CandidateScoreContext,
  EquipmentSlug,
  FitnessLevel,
  PlannerInput,
  PlannerOptions,
  PlannedExercise,
  PlannedWorkout,
  Weekday,
  WeeklyPlan,
  WorkoutCategory,
  WorkoutHistory,
  WorkoutStatus,
} from './types'
