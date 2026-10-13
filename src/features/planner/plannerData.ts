import { exerciseBySlug } from '../../planner/catalogue'
import type { PlannerInput, PlannedWorkout, WorkoutHistory } from '../../planner'
import { supabase } from '../../lib/supabase'
import { getOrInitializeUserTimeZone, localDateInTimeZone } from '../../lib/userTimeZone'
import type { FitnessLevel } from '../../types/profile'

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
    db.from('availability').select('default_duration_minutes').eq('user_id', userId).maybeSingle(),
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

  const exclusionSlugs = (exclusions.data ?? []).flatMap((item) => {
    const exercise = item.exercise as unknown as { slug: string } | null
    return exercise?.slug ? [exercise.slug] : []
  })
  const history = mapHistory((historyResult.data ?? []) as unknown as JsonRecord[])
  const profileFitness = profile.data?.fitness_level
  const fitnessLevel = profileFitness === 'intermediate' || profileFitness === 'advanced' ? profileFitness : 'beginner'
  return {
    input: {
      availability: { days: [], durationMinutes: availability.data?.default_duration_minutes ?? 30 },
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
    },
    exercises: guides,
    databaseExerciseIds: dbExerciseIds,
    equipmentLabels: availableEquipment.map((item) => item.name),
  }
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
  const doneExercise = await db.from('exercise_sessions').select('id').eq('user_id', userId).eq('workout_session_id', sessionId).eq('status', 'done').limit(1).maybeSingle()
  throwOnError(doneExercise)
  if (!doneExercise.data) throw new Error('Complete at least one exercise before finishing your workout.')
  const completionTimezone = await getOrInitializeUserTimeZone(userId)
  const finishedAt = new Date().toISOString()
  const completedLocalDate = localDateInTimeZone(new Date(finishedAt), completionTimezone)
  const completedWorkout = { ...workout, status: 'completed' as const }
  const [session, updatedWorkout] = await Promise.all([
    db.from('workout_sessions').update({ status: 'completed', completed_at: finishedAt, completed_local_date: completedLocalDate, completion_timezone: completionTimezone, actual_duration_minutes: values.actualDurationMinutes, perceived_exertion: values.perceivedExertion, note: values.note.trim() || null }).eq('user_id', userId).eq('id', sessionId).eq('status', 'in_progress'),
    db.from('planned_workouts').update({ status: 'completed', workout_json: completedWorkout }).eq('user_id', userId).eq('id', workout.id),
  ])
  throwOnError(session)
  throwOnError(updatedWorkout)
}

export async function abandonWorkoutSession(userId: string, sessionId: string, workout: PlannedWorkout) {
  const db = client()
  const skippedAt = new Date().toISOString()
  const skippedWorkout = { ...workout, status: 'skipped' as const }
  const [session, plannedWorkout] = await Promise.all([
    db.from('workout_sessions').update({ status: 'skipped', completed_at: skippedAt }).eq('user_id', userId).eq('id', sessionId).eq('status', 'in_progress'),
    db.from('planned_workouts').update({ status: 'skipped', workout_json: skippedWorkout }).eq('user_id', userId).eq('id', workout.id).eq('status', 'planned'),
  ])
  throwOnError(session)
  throwOnError(plannedWorkout)
}

export type SavedTemplate = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  is_favorite: boolean
  created_at: string
  exercises: Array<{ exercise_id: string; slug: string; name: string; prescribed_sets: number | null; prescribed_reps: string | null; prescribed_duration_seconds: number | null; rest_seconds: number }>
}

export async function loadSavedTemplates(userId: string): Promise<SavedTemplate[]> {
  const result = await client().from('user_workout_templates').select('id,name,description,duration_minutes,is_favorite,created_at,user_workout_template_exercises(exercise_id,position,prescribed_sets,prescribed_reps,prescribed_duration_seconds,rest_seconds,exercise:exercises(slug,name))').eq('user_id', userId).order('updated_at', { ascending: false })
  throwOnError(result)
  return (result.data ?? []).map((row) => {
    const blocks = (row.user_workout_template_exercises ?? []) as unknown as Array<{ exercise_id: string; position: number; prescribed_sets: number | null; prescribed_reps: string | null; prescribed_duration_seconds: number | null; rest_seconds: number; exercise: { slug: string; name: string } | null }>
    return { id: row.id, name: row.name, description: row.description, duration_minutes: row.duration_minutes, is_favorite: row.is_favorite, created_at: row.created_at, exercises: blocks.sort((a, b) => a.position - b.position).flatMap((block) => block.exercise ? [{ exercise_id: block.exercise_id, slug: block.exercise.slug, name: block.exercise.name, prescribed_sets: block.prescribed_sets, prescribed_reps: block.prescribed_reps, prescribed_duration_seconds: block.prescribed_duration_seconds, rest_seconds: block.rest_seconds }] : []) }
  })
}

export async function saveTemplate(userId: string, input: { name: string; description: string; durationMinutes: number; exercises: Array<{ exerciseId: string; sets: number; reps: string; durationSeconds: number | null }> }) {
  if (!input.name.trim() || !input.exercises.length) throw new Error('Choose a name and at least one exercise for your template.')
  const db = client()
  const template = await db.from('user_workout_templates').insert({ user_id: userId, name: input.name.trim(), description: input.description.trim() || null, duration_minutes: input.durationMinutes }).select('id').single()
  throwOnError(template)
  if (!template.data) throw new Error('Could not save the template.')
  const blocks = await db.from('user_workout_template_exercises').insert(input.exercises.map((exercise, index) => ({ template_id: template.data.id, user_id: userId, exercise_id: exercise.exerciseId, position: index + 1, prescribed_sets: exercise.sets, prescribed_reps: exercise.reps.trim() || null, prescribed_duration_seconds: exercise.durationSeconds, rest_seconds: 45 })))
  if (blocks.error) { await db.from('user_workout_templates').delete().eq('id', template.data.id).eq('user_id', userId); throw new Error(blocks.error.message) }
}

export async function toggleTemplateFavorite(userId: string, templateId: string, isFavorite: boolean) {
  const result = await client().from('user_workout_templates').update({ is_favorite: isFavorite }).eq('id', templateId).eq('user_id', userId); throwOnError(result)
}

export async function deleteTemplate(userId: string, templateId: string) {
  const result = await client().from('user_workout_templates').delete().eq('id', templateId).eq('user_id', userId); throwOnError(result)
}

export async function createWorkoutFromTemplate(userId: string, template: SavedTemplate, date: string): Promise<PlannedWorkout> {
  const id = crypto.randomUUID()
  const workout: PlannedWorkout = { id, date, templateSlug: `user_template_${template.id}`, name: template.name, category: 'strength', durationMinutes: template.duration_minutes, exercises: template.exercises.map((exercise) => ({ id: exercise.exercise_id, slug: exercise.slug, name: exercise.name, prescribedSets: exercise.prescribed_sets, prescribedReps: exercise.prescribed_reps, prescribedDurationSeconds: exercise.prescribed_duration_seconds, restSeconds: exercise.rest_seconds })), status: 'planned', isOutdoor: false, intensity: 'moderate', movementPatterns: [], muscleGroups: [] }
  const result = await client().from('planned_workouts').insert({ id, user_id: userId, workout_date: date, template_slug: workout.templateSlug, name: workout.name, category: workout.category, duration_minutes: workout.durationMinutes, is_outdoor: false, intensity: workout.intensity, movement_patterns: [], muscle_groups: [], exercises: workout.exercises, workout_json: workout, source_type: 'user_template', source_template_id: template.id, status: 'planned' })
  throwOnError(result)
  return workout
}

export async function createStandaloneWorkout(userId: string, workout: PlannedWorkout): Promise<PlannedWorkout> {
  const savedWorkout = { ...workout, id: crypto.randomUUID() }
  const result = await client().from('planned_workouts').insert({ id: savedWorkout.id, user_id: userId, workout_date: savedWorkout.date, template_slug: savedWorkout.templateSlug, name: savedWorkout.name, category: savedWorkout.category, duration_minutes: savedWorkout.durationMinutes, is_outdoor: savedWorkout.isOutdoor, intensity: savedWorkout.intensity, movement_patterns: savedWorkout.movementPatterns, muscle_groups: savedWorkout.muscleGroups, exercises: savedWorkout.exercises, workout_json: savedWorkout, source_type: 'generated', status: 'planned' })
  throwOnError(result)
  return savedWorkout
}

export async function loadStandaloneWorkout(userId: string, workoutId: string): Promise<PlannedWorkout | null> {
  const result = await client().from('planned_workouts').select('workout_json').eq('user_id', userId).eq('id', workoutId).maybeSingle(); throwOnError(result)
  return result.data?.workout_json ? result.data.workout_json as unknown as PlannedWorkout : null
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
  const date = new Date()
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

