import { describe, expect, it } from 'vitest'
import { exercises, generateWeeklyPlan, regenerateWorkout, scoreWorkoutCandidate, validateWeeklyPlan, workoutTemplates } from '../src/planner'
import { estimateWorkoutDurationMinutes, exerciseBySlug, hasRequiredEquipment } from '../src/planner/catalogue'
import type { PlannerInput, PlannedWorkout, Weekday, WorkoutCategory } from '../src/planner'

const defaultInput = (overrides: Partial<PlannerInput> = {}): PlannerInput => ({
  availability: { days: ['monday', 'wednesday', 'friday'], durationMinutes: 30 },
  equipment: [],
  preferences: { strength: false, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: false, weatherDependent: false },
  excludedExerciseIds: [],
  fitnessLevel: 'beginner',
  history: [],
  weekStart: '2026-10-05',
  ...overrides,
})

function makeWorkout(slug: string, date: string, category?: WorkoutCategory): PlannedWorkout {
  const template = workoutTemplates.find((item) => item.slug === slug)
  if (!template) throw new Error(`Missing template: ${slug}`)
  const rows = template.blocks.map((block) => {
    const exercise = exercises.find((item) => item.slug === block.slug)
    if (!exercise) throw new Error(`Missing exercise: ${block.slug}`)
    return { id: exercise.id, slug: exercise.slug, name: exercise.name, prescribedSets: block.prescribedSets, prescribedReps: block.prescribedReps, prescribedDurationSeconds: block.prescribedDurationSeconds, restSeconds: block.restSeconds }
  })
  const definitions = rows.map((row) => exercises.find((item) => item.id === row.id)!)
  return {
    id: `${date}:${slug}`, date, templateSlug: slug, name: template.name, category: category ?? template.category,
    durationMinutes: template.durationMinutes, exercises: rows, status: 'planned', isOutdoor: definitions.some((item) => item.isOutdoor),
    intensity: template.intensity, movementPatterns: [...new Set(definitions.map((item) => item.movementPattern))],
    muscleGroups: [...new Set(definitions.flatMap((item) => item.muscleGroups))],
  }
}

describe('pure weekly planner', () => {
  it('includes the complete Phase 03 exercise and ordered template catalogue', () => {
    expect(exercises).toHaveLength(47)
    expect(workoutTemplates).toHaveLength(12)
    expect(workoutTemplates.reduce((total, template) => total + template.blocks.length, 0)).toBe(55)
    expect(workoutTemplates.flatMap((template) => template.blocks).every((block) => exerciseBySlug.has(block.slug))).toBe(true)
  })

  it('treats equipment in a group as alternatives and different groups as simultaneous needs', () => {
    const gobletSquat = exerciseBySlug.get('goblet_squat')!
    const dumbbellChestPress = exerciseBySlug.get('dumbbell_chest_press')!
    expect(hasRequiredEquipment(gobletSquat, ['dumbbells'])).toBe(true)
    expect(hasRequiredEquipment(gobletSquat, ['kettlebell'])).toBe(true)
    expect(hasRequiredEquipment(dumbbellChestPress, ['dumbbells'])).toBe(false)
    expect(hasRequiredEquipment(dumbbellChestPress, ['dumbbells', 'bench'])).toBe(true)
  })

  it('schedules the requested number of sessions only on available days', () => {
    const input = defaultInput()
    const plan = generateWeeklyPlan(input, { seed: 21 })
    expect(plan.workouts).toHaveLength(3)
    expect(plan.workouts.map((workout) => workout.date)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09'])
    expect(validateWeeklyPlan(plan, input).valid).toBe(true)
  })

  it.each([[1, 1], [2, 2], [4, 4]])('generates %i sessions when %i days are available', (dayCount, expected) => {
    const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday'].slice(0, dayCount) as Weekday[]
    const plan = generateWeeklyPlan(defaultInput({ availability: { days, durationMinutes: 30 } }), { seed: dayCount })
    expect(plan.requestedSessions).toBe(expected)
    expect(plan.workouts).toHaveLength(expected)
  })
  it('caps plans at five sessions while choosing only available days', () => {
    const input = defaultInput({ availability: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], durationMinutes: 20 } })
    const plan = generateWeeklyPlan(input, { seed: 3 })
    expect(plan.workouts).toHaveLength(5)
    expect(plan.workouts.every((workout) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(weekdayOf(workout.date)))).toBe(true)
  })

  it('rejects templates whose equipment requirements cannot be met', () => {
    const input = defaultInput({ availability: { days: ['monday'], durationMinutes: 25 } })
    const plan = generateWeeklyPlan(input, { seed: 4 })
    const unavailable = exercises.filter((exercise) => exercise.equipmentGroups.some((group) => !group.some((slug) => slug === 'bodyweight' || input.equipment.includes(slug)))).map((exercise) => exercise.id)
    expect(plan.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.id)).some((id) => unavailable.includes(id))).toBe(false)
  })

  it('never includes excluded exercise ids', () => {
    const excluded = exercises.filter((exercise) => exercise.slug === 'bodyweight_squat' || exercise.slug === 'incline_push_up').map((exercise) => exercise.id)
    const input = defaultInput({ excludedExerciseIds: excluded })
    const plan = generateWeeklyPlan(input, { seed: 17 })
    expect(plan.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.id)).some((id) => excluded.includes(id))).toBe(false)
    expect(validateWeeklyPlan(plan, input).valid).toBe(true)
  })

  it('does not schedule outdoor exercise when outdoor access is unavailable', () => {
    const input = defaultInput({ availability: { days: ['monday'], durationMinutes: 20 } })
    const plan = generateWeeklyPlan(input, { seed: 1 })
    expect(plan.workouts.every((workout) => !workout.isOutdoor && workout.exercises.every((item) => !exercises.find((exercise) => exercise.id === item.id)?.isOutdoor))).toBe(true)
    const outdoorWorkout = makeWorkout('walking_20', '2026-10-05')
    expect(validateWeeklyPlan({ weekStart: input.weekStart!, requestedSessions: 1, workouts: [outdoorWorkout], unscheduledSessions: [] }, input).valid).toBe(false)
  })

  it('keeps generated session durations within the approximate target range', () => {
    const input = defaultInput({ availability: { days: ['monday', 'wednesday'], durationMinutes: 45 }, preferences: { strength: false, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: true, weatherDependent: false } })
    const plan = generateWeeklyPlan(input, { seed: 6 })
    expect(plan.workouts.length).toBeGreaterThan(0)
    expect(plan.workouts.every((workout) => workout.durationMinutes >= 40 && workout.durationMinutes <= 50)).toBe(true)
    expect(validateWeeklyPlan(plan, input).valid).toBe(true)
  })

  it('calculates timed cardio duration from block work, rests, and transitions', () => {
    const mixed = workoutTemplates.find((template) => template.slug === 'cardio_mixed')!
    const activeSeconds = mixed.blocks.reduce((total, item) => total + item.prescribedDurationSeconds!, 0)
    const rests = mixed.blocks.slice(0, -1).reduce((total, item) => total + item.restSeconds, 0)
    expect(estimateWorkoutDurationMinutes(mixed)).toBe(Math.round((activeSeconds + rests + (mixed.blocks.length - 1) * 30) / 60))
    expect(estimateWorkoutDurationMinutes(mixed)).toBe(20)
  })

  it('keeps modality combinations available for scoring when an individual template fits', () => {
    const input = defaultInput({ availability: { days: ['monday'], durationMinutes: 45 }, preferences: { strength: true, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: true, weatherDependent: false } })
    const plan = generateWeeklyPlan(input, { seed: 6 })
    expect(plan.workouts[0]?.templateSlug).toContain('__plus__')
    expect(plan.workouts[0]?.category).toBe('strength')
  })
  it('combines suitable modalities to cover the requested 60-minute duration', () => {
    const input = defaultInput({ availability: { days: ['monday'], durationMinutes: 60 } })
    const plan = generateWeeklyPlan(input, { seed: 13 })
    expect(plan.workouts).toHaveLength(1)
    expect(plan.workouts[0]?.durationMinutes).toBeGreaterThanOrEqual(50)
    expect(plan.workouts[0]?.durationMinutes).toBeLessThanOrEqual(65)
    expect(plan.workouts[0]?.templateSlug).toContain('__plus__')
    expect(validateWeeklyPlan(plan, input).valid).toBe(true)
  })

  it('reduces scores for recently repeated templates and exercises', () => {
    const input = defaultInput()
    const candidate = makeWorkout('strength_full_body_a', '2026-10-07')
    const previous = { date: '2026-10-05', templateSlug: candidate.templateSlug, exerciseIds: candidate.exercises.map((exercise) => exercise.id) }
    expect(scoreWorkoutCandidate(candidate, input)).toBeGreaterThan(scoreWorkoutCandidate(candidate, input, { recentWorkouts: [previous] }))
  })

  it('uses a low-impact session rather than scheduling consecutive hard lower-body sessions', () => {
    const input = defaultInput({
      availability: { days: ['monday', 'tuesday'], durationMinutes: 30 },
      preferences: { strength: true, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: false, weatherDependent: false },
    })
    const plan = generateWeeklyPlan(input, { seed: 7 })
    for (let index = 1; index < plan.workouts.length; index += 1) {
      const previous = plan.workouts[index - 1]!
      const current = plan.workouts[index]!
      const previousIsHardLower = previous.intensity === 'high' && previous.muscleGroups.some((muscle) => ['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(muscle))
      const currentIsHardLower = current.intensity === 'high' && current.muscleGroups.some((muscle) => ['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(muscle))
      expect(previousIsHardLower && currentIsHardLower).toBe(false)
    }
  })

  it('infers hard lower-body work from strength history without intensity', () => {
    const prior = makeWorkout('strength_full_body_a', '2026-10-05')
    const input = defaultInput({ availability: { days: ['tuesday'], durationMinutes: 30 }, preferences: { strength: true, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: false, weatherDependent: false }, history: [{ date: prior.date, category: 'strength', exerciseIds: prior.exercises.map((item) => item.id), muscleGroups: prior.muscleGroups }] })
    const candidate = makeWorkout('strength_full_body_a', '2026-10-06')
    const historyEntry = input.history[0]!
    expect(scoreWorkoutCandidate(candidate, input)).toBeGreaterThan(scoreWorkoutCandidate(candidate, input, { previousWorkout: historyEntry }))
  })
  it('raises candidate scores when its category matches the selected preference', () => {
    const strength = makeWorkout('strength_full_body_a', '2026-10-05')
    const input = defaultInput({ preferences: { strength: true, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: false, weatherDependent: false } })
    const withoutPreference = defaultInput()
    expect(scoreWorkoutCandidate(strength, input)).toBeGreaterThan(scoreWorkoutCandidate(strength, withoutPreference))
  })

  it('plans later available days after a skipped workout using history for variety', () => {
    const skipped = makeWorkout('mobility_15', '2026-10-05')
    const input = defaultInput({
      availability: { days: ['tuesday'], durationMinutes: 20 },
      history: [{ date: skipped.date, templateSlug: skipped.templateSlug, exerciseIds: skipped.exercises.map((exercise) => exercise.id), skipped: true }],
    })
    const plan = generateWeeklyPlan(input, { seed: 42 })
    expect(plan.workouts).toHaveLength(1)
    expect(plan.workouts[0]?.date).toBe('2026-10-06')
    expect(plan.workouts[0]?.templateSlug).not.toBe(skipped.templateSlug)
  })

  it('regenerates a different valid candidate and leaves completed workouts untouched', () => {
    const input = defaultInput({ availability: { days: ['monday', 'wednesday'], durationMinutes: 30 } })
    const original = makeWorkout('strength_full_body_a', '2026-10-05')
    const completed = { ...makeWorkout('cardio_low_impact', '2026-10-07'), status: 'completed' as const }
    const currentPlan = { weekStart: input.weekStart!, requestedSessions: 2, workouts: [original, completed], unscheduledSessions: [] }
    const updated = regenerateWorkout(original.date, currentPlan, [], input, { seed: 5 })
    expect(updated.workouts.find((workout) => workout.date === original.date && workout.status === 'planned')?.templateSlug).not.toBe(original.templateSlug)
    expect(updated.workouts.find((workout) => workout.date === completed.date)).toEqual(completed)
    expect(original.status).toBe('planned')
    expect(validateWeeklyPlan(updated, input).valid).toBe(true)
  })

  it('preserves a skipped workout record and adds a different replacement', () => {
    const input = defaultInput({ availability: { days: ['monday'], durationMinutes: 30 } })
    const skipped = { ...makeWorkout('strength_full_body_a', '2026-10-05'), status: 'skipped' as const }
    const history = [{ date: skipped.date, templateSlug: skipped.templateSlug, exerciseIds: skipped.exercises.map((exercise) => exercise.id), skipped: true }]
    const plan = { weekStart: input.weekStart!, requestedSessions: 1, workouts: [skipped], unscheduledSessions: [] }
    const updated = regenerateWorkout(skipped.date, plan, history, input, { seed: 15 })
    expect(updated.workouts).toContainEqual(skipped)
    expect(updated.workouts.find((workout) => workout.status === 'planned')?.templateSlug).not.toBe(skipped.templateSlug)
    expect(history[0]?.templateSlug).toBe(skipped.templateSlug)
  })

  it('preserves a completed target workout during regeneration', () => {
    const input = defaultInput()
    const completed = { ...makeWorkout('strength_full_body_a', '2026-10-05'), status: 'completed' as const }
    const plan = { weekStart: input.weekStart!, requestedSessions: 1, workouts: [completed], unscheduledSessions: [] }
    expect(regenerateWorkout(completed.date, plan, [], input, { seed: 8 })).toBe(plan)
  })

  it('falls back to valid bodyweight strength when no equipment is selected', () => {
    const input = defaultInput({
      availability: { days: ['monday'], durationMinutes: 30 },
      preferences: { strength: true, cardio: false, walking: false, hiit: false, mobility: false, canGoOutside: false, weatherDependent: false },
    })
    const plan = generateWeeklyPlan(input, { seed: 8 })
    expect(plan.workouts[0]?.category).toBe('strength')
    expect(validateWeeklyPlan(plan, input).valid).toBe(true)
  })

  it('returns no invalid workouts when every exercise is excluded', () => {
    const input = defaultInput({ excludedExerciseIds: exercises.map((exercise) => exercise.id) })
    const plan = generateWeeklyPlan(input, { seed: 9 })
    expect(plan.workouts).toEqual([])
    expect(validateWeeklyPlan(plan, input)).toEqual({ valid: true, errors: [] })
  })

  it('reports why a requested session could not be generated in a partial plan', () => {
    const input = defaultInput({ availability: { days: ['monday', 'tuesday'], durationMinutes: 30 }, blockedDates: [{ date: '2026-10-06', reason: 'Recovery appointment' }] })
    const plan = generateWeeklyPlan(input, { seed: 9 })
    expect(plan.requestedSessions).toBe(2)
    expect(plan.workouts).toHaveLength(1)
    expect(plan.unscheduledSessions).toEqual([{ date: '2026-10-06', reasons: ['date-blocked'], message: 'Recovery appointment' }])
  })

  it('does not modify the plan when asked to regenerate outside its week', () => {
    const input = defaultInput()
    const workout = makeWorkout('strength_full_body_a', '2026-10-05')
    const plan = { weekStart: input.weekStart!, requestedSessions: 1, workouts: [workout], unscheduledSessions: [] }
    expect(regenerateWorkout('2026-10-12', plan, [], input, { seed: 2 })).toBe(plan)
  })
  it('produces the same plan for the same input and seed', () => {
    const input = defaultInput({ availability: { days: ['monday', 'tuesday', 'thursday', 'saturday'], durationMinutes: 30 } })
    expect(generateWeeklyPlan(input, { seed: 12345 })).toEqual(generateWeeklyPlan(input, { seed: 12345 }))
  })
})

function weekdayOf(date: string): Weekday {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  return (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[weekday]!
}
