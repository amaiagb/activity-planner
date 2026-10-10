import { generateTodayWorkout, generateWeeklyPlan, regenerateWorkout } from '../../planner'
import type { TodayWorkoutRequest } from '../../planner'
import { exerciseBySlug } from '../../planner/catalogue'
import type { PlannerInput, PlannedWorkout, WeeklyPlan, WorkoutHistory } from '../../planner'
import { supabase } from '../../lib/supabase'
import type { FitnessLevel, WeekDayKey } from '../../types/profile'

export type ExerciseGuide = {
  id: string
  slug: string
  name: string
  instructions: string | null
  equipment: string[][]
}

export type PlannerContext = {
  input: PlannerInput
  exercises: Record<string, ExerciseGuide>
  databaseExerciseIds: Record<string, string>
  equipmentLabels: string[]
}

type JsonRecord = Record<string, unknown>
type DatabaseExercise = {
  id: string; slug: string; name: string; instructions: string | null; is_outdoor: boolean
  exercise_equipment: Array<{ requirement_group: number; equipment: { slug: string; name: string } | null }>
}

let exerciseCatalogueRequest: Promise<DatabaseExercise[]> | null = null

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function throwOnError(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message)
}

function mondayOf(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function loadExerciseCatalogue(db: ReturnType<typeof client>) {
  if (!exerciseCatalogueRequest) {
    exerciseCatalogueRequest = Promise.resolve(db.from('exercises')
      .select('id,slug,name,instructions,is_outdoor,exercise_equipment(requirement_group,equipment:equipment(slug,name))')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message)
        return (data ?? []) as unknown as DatabaseExercise[]
      }))
      .catch((cause: unknown) => {
        exerciseCatalogueRequest = null
        throw cause
      })
  }
  return exerciseCatalogueRequest
}

function mapHistory(rows: JsonRecord[]): WorkoutHistory[] {
  return rows.flatMap((row) => {
    const workout = row.planned_workout as JsonRecord | null
    if (!workout || typeof workout.workout_date !== 'string') return []
    const exercises = Array.isArray(workout.exercises) ? workout.exercises as Array<{ id?: string }> : []
    return [{
      date: workout.workout_date,
      templateSlug: typeof workout.template_slug === 'string' ? workout.template_slug : undefined,
      exerciseIds: exercises.flatMap((exercise) => exercise.id ? [exercise.id] : []),
      movementPatterns: Array.isArray(workout.movement_patterns) ? workout.movement_patterns as string[] : undefined,
      muscleGroups: Array.isArray(workout.muscle_groups) ? workout.muscle_groups as string[] : undefined,
      category: typeof workout.category === 'string' ? workout.category as WorkoutHistory['category'] : undefined,
      intensity: typeof workout.intensity === 'string' ? workout.intensity as WorkoutHistory['intensity'] : undefined,
      skipped: row.status === 'skipped',
      completed: row.status === 'completed',
    }]
  })
}

export async function loadPlannerContext(userId: string): Promise<PlannerContext> {
  const db = client()
  const [profile, availability, preferences, equipmentResult, exclusions, historyResult, databaseExercises] = await Promise.all([
    db.from('profiles').select('fitness_level').eq('user_id', userId).maybeSingle(),
    db.from('availability').select('monday,tuesday,wednesday,thursday,friday,saturday,sunday,default_duration_minutes').eq('user_id', userId).maybeSingle(),
    db.from('preferences').select('likes_strength,likes_cardio,likes_walking,likes_hiit,likes_mobility,can_go_outside,outside_is_weather_dependent').eq('user_id', userId).maybeSingle(),
    db.from('user_equipment').select('equipment:equipment(slug,name)').eq('user_id', userId),
    db.from('excluded_exercises').select('exercise:exercises(slug)').eq('user_id', userId),
    db.from('workout_sessions').select('status,planned_workout:planned_workouts(workout_date,template_slug,category,intensity,muscle_groups,movement_patterns,exercises)').eq('user_id', userId).in('status', ['completed', 'skipped']).order('started_at', { ascending: false }),
    loadExerciseCatalogue(db),
  ])
  for (const result of [profile, availability, preferences, equipmentResult, exclusions, historyResult]) throwOnError(result)

  const availableEquipment = (equipmentResult.data ?? []).flatMap((item) => {
    const equipment = item.equipment as unknown as { slug: string; name: string } | null
    return equipment?.slug ? [equipment] : []
  })
  const dbExerciseIds: Record<string, string> = {}
  const guides: Record<string, ExerciseGuide> = {}
  for (const exercise of databaseExercises) {
    dbExerciseIds[exercise.slug] = exercise.id
    guides[exercise.slug] = {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      instructions: exercise.instructions,
      equipment: [...(exercise.exercise_equipment ?? []).reduce((groups, item) => {
        if (!item.equipment?.name) return groups
        const group = groups.get(item.requirement_group) ?? new Set<string>()
        group.add(item.equipment.name)
        groups.set(item.requirement_group, group)
        return groups
      }, new Map<number, Set<string>>()).entries()].sort(([a], [b]) => a - b).map(([, group]) => [...group]),
    }
  }

  const days = (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as WeekDayKey[])
    .filter((day) => availability.data?.[day])
  const exclusionSlugs = (exclusions.data ?? []).flatMap((item) => {
    const exercise = item.exercise as unknown as { slug: string } | null
    return exercise?.slug ? [exercise.slug] : []
  })
  const history = mapHistory((historyResult.data ?? []) as unknown as JsonRecord[])
  const profileFitness = profile.data?.fitness_level
  const fitnessLevel = profileFitness === 'intermediate' || profileFitness === 'advanced' ? profileFitness : 'beginner'
  return {
    input: {
      availability: { days, durationMinutes: availability.data?.default_duration_minutes ?? 30 },
      equipment: availableEquipment.map((item) => item.slug),
      preferences: {
        strength: preferences.data?.likes_strength ?? false,
        cardio: preferences.data?.likes_cardio ?? false,
        walking: preferences.data?.likes_walking ?? false,
        hiit: preferences.data?.likes_hiit ?? false,
        mobility: preferences.data?.likes_mobility ?? false,
        canGoOutside: preferences.data?.can_go_outside ?? false,
        weatherDependent: preferences.data?.outside_is_weather_dependent ?? false,
      },
      excludedExerciseIds: exclusionSlugs.flatMap((slug) => exerciseBySlug.get(slug)?.id ?? []),
      fitnessLevel: fitnessLevel as FitnessLevel,
      history,
      weekStart: mondayOf(),
    },
    exercises: guides,
    databaseExerciseIds: dbExerciseIds,
    equipmentLabels: availableEquipment.map((item) => item.name),
  }
}

export async function loadWeeklyPlan(userId: string, weekStart: string): Promise<WeeklyPlan | null> {
  const db = client()
  const found = await db.from('weekly_plans').select('id,week_start,requested_sessions,unscheduled_sessions').eq('user_id', userId).eq('week_start', weekStart).maybeSingle()
  throwOnError(found)
  if (!found.data) return null
  const workoutsResult = await db.from('planned_workouts').select('workout_json').eq('weekly_plan_id', found.data.id).order('workout_date')
  throwOnError(workoutsResult)
  return {
    weekStart,
    requestedSessions: found.data.requested_sessions,
    unscheduledSessions: (found.data.unscheduled_sessions ?? []) as WeeklyPlan['unscheduledSessions'],
    workouts: (workoutsResult.data ?? []).flatMap((row) => row.workout_json ? [row.workout_json as unknown as PlannedWorkout] : []),
  }
}

export async function saveWeeklyPlan(userId: string, plan: WeeklyPlan, replacePlanned = false): Promise<WeeklyPlan> {
  const db = client()
  const parent = await db.from('weekly_plans').upsert({
    user_id: userId,
    week_start: plan.weekStart,
    requested_sessions: plan.requestedSessions,
    unscheduled_sessions: plan.unscheduledSessions,
  }, { onConflict: 'user_id,week_start' }).select('id').single()
  throwOnError(parent)
  if (!parent.data) throw new Error('Could not save the weekly plan.')

  const [existingResult, sessionsResult] = await Promise.all([
    db.from('planned_workouts').select('id,workout_date,status').eq('weekly_plan_id', parent.data.id),
    db.from('workout_sessions').select('planned_workout_id,status').eq('user_id', userId).in('status', ['in_progress', 'completed']),
  ])
  throwOnError(existingResult)
  throwOnError(sessionsResult)
  const existing = existingResult.data ?? []
  const protectedIds = new Set((sessionsResult.data ?? []).map((session) => session.planned_workout_id))
  const protectedDates = new Set(existing.filter((row) => row.status !== 'planned' || protectedIds.has(row.id)).map((row) => row.workout_date))

  if (replacePlanned) {
    const deletions = existing.filter((row) => row.status === 'planned' && !protectedIds.has(row.id) && !plan.workouts.some((workout) => workout.date === row.workout_date))
    for (const row of deletions) {
      const deleted = await db.from('planned_workouts').delete().eq('id', row.id).eq('user_id', userId)
      throwOnError(deleted)
    }
  }

  const rows = plan.workouts.filter((workout) => !protectedDates.has(workout.date)).map((workout) => {
    const savedId = existing.find((row) => row.workout_date === workout.date && row.status === 'planned')?.id ?? crypto.randomUUID()
    const savedWorkout = { ...workout, id: savedId }
    return {
    id: savedId,
    weekly_plan_id: parent.data.id,
    user_id: userId,
    workout_date: workout.date,
    template_slug: workout.templateSlug,
    name: workout.name,
    category: workout.category,
    duration_minutes: workout.durationMinutes,
    is_outdoor: workout.isOutdoor,
    intensity: workout.intensity,
    movement_patterns: workout.movementPatterns,
    muscle_groups: workout.muscleGroups,
    exercises: savedWorkout.exercises,
    workout_json: savedWorkout,
    status: 'planned',
  }})
  if (rows.length) {
    const upserted = await db.from('planned_workouts').upsert(rows, { onConflict: 'weekly_plan_id,workout_date' })
    throwOnError(upserted)
  }
  return await loadWeeklyPlan(userId, plan.weekStart) ?? plan
}

export async function getOrCreateWeeklyPlan(userId: string, context: PlannerContext, weekStart: string): Promise<WeeklyPlan> {
  const existing = await loadWeeklyPlan(userId, weekStart)
  if (existing) return existing
  const generated = generateWeeklyPlan({ ...context.input, weekStart })
  return saveWeeklyPlan(userId, generated)
}

export async function regenerateDay(userId: string, context: PlannerContext, plan: WeeklyPlan, date: string): Promise<WeeklyPlan> {
  const next = regenerateWorkout(date, plan, context.input.history, { ...context.input, weekStart: plan.weekStart })
  if (next === plan) return plan
  return saveWeeklyPlan(userId, next, true)
}

export async function createTodayWorkout(userId: string, context: PlannerContext, plan: WeeklyPlan, date: string, request: TodayWorkoutRequest): Promise<WeeklyPlan> {
  const current = plan.workouts.find((workout) => workout.date === date)
  if (current && current.status !== 'planned') throw new Error('This workout can no longer be changed.')
  const db = client()
  if (current) {
    const sessions = await db.from('workout_sessions').select('id,status').eq('user_id', userId).eq('planned_workout_id', current.id)
    throwOnError(sessions)
    if ((sessions.data ?? []).length) throw new Error('This workout already has a session.')
  }
  const workout = generateTodayWorkout(date, context.input, request)
  if (!workout) throw new Error(request.outdoor ? 'Easy walk is unavailable.' : 'No workout matches these choices.')
  const wasUnscheduled = plan.unscheduledSessions.some((item) => item.date === date)
  const next: WeeklyPlan = {
    ...plan,
    requestedSessions: plan.requestedSessions + (!current && !wasUnscheduled ? 1 : 0),
    workouts: [...plan.workouts.filter((item) => item.date !== date), workout].sort((a, b) => a.date.localeCompare(b.date)),
    unscheduledSessions: plan.unscheduledSessions.filter((item) => item.date !== date),
  }
  return saveWeeklyPlan(userId, next)
}

export async function regenerateWeek(userId: string, context: PlannerContext, plan: WeeklyPlan): Promise<WeeklyPlan> {
  const next = generateWeeklyPlan({ ...context.input, weekStart: plan.weekStart })
  return saveWeeklyPlan(userId, next, true)
}

export async function startWorkout(userId: string, workout: PlannedWorkout, databaseExerciseIds: Record<string, string>) {
  const db = client()
  const session = await db.from('workout_sessions').insert({ planned_workout_id: workout.id, user_id: userId, planned_duration_minutes: workout.durationMinutes }).select('id,started_at').single()
  throwOnError(session)
  if (!session.data) throw new Error('Could not start the workout session.')
  const exerciseRows = workout.exercises.map((exercise, index) => {
    const exerciseId = databaseExerciseIds[exercise.slug]
    if (!exerciseId) throw new Error(`Exercise ${exercise.slug} is missing from the Supabase catalogue.`)
    return { workout_session_id: session.data.id, planned_workout_id: workout.id, user_id: userId, exercise_id: exerciseId, position: index + 1 }
  })
  if (exerciseRows.length) {
    const savedExercises = await db.from('exercise_sessions').insert(exerciseRows)
    if (savedExercises.error) {
      await db.from('workout_sessions').delete().eq('id', session.data.id).eq('user_id', userId)
      throw new Error(savedExercises.error.message)
    }
  }
  return { id: session.data.id, startedAt: session.data.started_at }
}

export async function loadActiveSession(userId: string, plannedWorkoutId: string) {
  const db = client()
  const result = await db.from('workout_sessions').select('id,status,started_at,completed_at,actual_duration_minutes,perceived_exertion,note,exercise_sessions(id,position,status,sets_completed,reps_completed,duration_seconds,exercise_id)').eq('user_id', userId).eq('planned_workout_id', plannedWorkoutId).order('started_at', { ascending: false }).limit(1).maybeSingle()
  throwOnError(result)
  return result.data
}

export async function setExerciseStatus(userId: string, exerciseSessionId: string, status: 'done' | 'skipped') {
  const result = await client().from('exercise_sessions').update({ status }).eq('user_id', userId).eq('id', exerciseSessionId)
  throwOnError(result)
}

export async function completeWorkout(userId: string, sessionId: string, workout: PlannedWorkout, values: { actualDurationMinutes: number; perceivedExertion: number | null; note: string }) {
  const db = client()
  const finishedAt = new Date().toISOString()
  const completedWorkout = { ...workout, status: 'completed' as const }
  const [session, updatedWorkout] = await Promise.all([
    db.from('workout_sessions').update({ status: 'completed', completed_at: finishedAt, actual_duration_minutes: values.actualDurationMinutes, perceived_exertion: values.perceivedExertion, note: values.note.trim() || null }).eq('user_id', userId).eq('id', sessionId),
    db.from('planned_workouts').update({ status: 'completed', workout_json: completedWorkout }).eq('user_id', userId).eq('id', workout.id),
  ])
  throwOnError(session)
  throwOnError(updatedWorkout)
}

export async function skipPlannedWorkout(userId: string, workout: PlannedWorkout) {
  const db = client()
  const skippedWorkout = { ...workout, status: 'skipped' as const }
  const updated = await db.from('planned_workouts').update({ status: 'skipped', workout_json: skippedWorkout }).eq('user_id', userId).eq('id', workout.id).eq('status', 'planned')
  throwOnError(updated)
  const result = await db.from('workout_sessions').insert({ planned_workout_id: workout.id, user_id: userId, planned_duration_minutes: workout.durationMinutes, status: 'skipped', completed_at: new Date().toISOString() })
  throwOnError(result)
}

export function currentWeekStart() {
  return mondayOf()
}

