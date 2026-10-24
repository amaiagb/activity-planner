import type { PlannerInput, PlannedWorkout, WorkoutHistory } from '../../planner'
import { supabase } from '../../lib/supabase'
import { getOrInitializeUserTimeZone, localDateInTimeZone } from '../../lib/userTimeZone'
import type { FitnessLevel } from '../../types/profile'
import { matchesBodyRegion } from '../../lib/bodyRegions'

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
  databaseExercises: DatabaseExercise[]
}

type JsonRecord = Record<string, unknown>
type DatabaseExercise = {
  id: string; slug: string; name: string; instructions: string | null; is_outdoor: boolean; is_active: boolean
  category: string; movement_pattern: string | null; difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  impact_level: 'low' | 'moderate' | 'high' | null; default_sets: number | null; default_reps: string | null; default_duration_seconds: number | null
  exercise_muscles: Array<{ muscle_group: string }>
  exercise_equipment: Array<{ requirement_group: number; equipment: { slug: string; name: string } | null }>
}

const legacyExerciseAliases: Record<string, string[]> = {
  thoracic_rotation: ['seated-spinal-twist'],
  hip_90_90: ['cow-face-pose'],
  world_greatest_stretch: ['low-lunge-to-half-split'],
  hamstring_stretch: ['seated-forward-fold'],
  hip_flexor_stretch: ['kneeling-hip-flexor-stretch'],
  child_pose: ['childs-pose'],
  shoulder_mobility: ['cross-body-shoulder-stretch'],
  knee_push_up: ['knee-push-ups'],
  single_leg_rdl: ['single-leg-romanian-deadlift'],
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
      .select('id,slug,name,instructions,is_outdoor,is_active,category,movement_pattern,difficulty,impact_level,default_sets,default_reps,default_duration_seconds,exercise_muscles(muscle_group),exercise_equipment(requirement_group,equipment:equipment(slug,name))')
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
      excludedExerciseIds: exclusionSlugs.flatMap((slug) => dbExerciseIds[slug] ? [dbExerciseIds[slug]] : []),
      fitnessLevel: fitnessLevel as FitnessLevel,
      history,
    },
    exercises: guides,
    databaseExerciseIds: dbExerciseIds,
    equipmentLabels: availableEquipment.map((item) => item.name),
    databaseExercises,
  }
}

function databaseEquipmentGroups(exercise: DatabaseExercise) {
  return [...(exercise.exercise_equipment ?? []).reduce((groups, item) => {
    const group = groups.get(item.requirement_group) ?? new Set<string>()
    if (item.equipment?.slug) group.add(item.equipment.slug)
    groups.set(item.requirement_group, group)
    return groups
  }, new Map<number, Set<string>>()).values()].map((group) => [...group])
}

function databaseCategory(value: string): PlannedWorkout['category'] {
  if (value === 'cardio' || value === 'walking' || value === 'outdoor') return value === 'outdoor' ? 'walking' : 'cardio'
  if (value === 'mobility' || value === 'stretching') return 'mobility'
  return 'strength'
}

function normalizeEquipmentSlug(value: string) {
  if (value === 'dumbbells') return 'dumbbell'
  if (value === 'kettlebells') return 'kettlebell'
  if (value === 'resistance_bands') return 'resistance_band'
  if (value === 'stationary_bikes') return 'stationary_bike'
  return value
}

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function generateDatabaseWorkout(date: string, context: PlannerContext, request: { durationMinutes: number; outdoor: boolean; muscleGroups?: string[]; muscleGroup?: string; equipment?: string[] }): PlannedWorkout | null {
  const selectedEquipment = (request.equipment ?? []).map(normalizeEquipmentSlug)
  const equipmentFilter = new Set(selectedEquipment.filter((item) => item !== 'no_equipment' && item !== 'bodyweight'))
  const bodyweightOnly = equipmentFilter.size === 0
  const excluded = new Set(context.input.excludedExerciseIds)
  const candidates = context.databaseExercises.filter((exercise) => {
    if (!exercise.is_active || excluded.has(exercise.id)) return false
    if (request.outdoor !== exercise.is_outdoor) return false
    const selectedRegions = request.muscleGroups?.length ? request.muscleGroups : request.muscleGroup ? [request.muscleGroup] : []
    if (!request.outdoor && selectedRegions.length && !selectedRegions.some((region) => matchesBodyRegion(exercise.category, (exercise.exercise_muscles ?? []).map((item) => item.muscle_group), region))) return false
    const groups = databaseEquipmentGroups(exercise).map((group) => group.map(normalizeEquipmentSlug))
    if (!groups.length) return bodyweightOnly
    return groups.every((group) => bodyweightOnly
      ? group.some((item) => item === 'bodyweight' || item === 'no_equipment')
      : group.some((item) => equipmentFilter.has(item)))
  })
  if (!candidates.length) return null
  // Three exercises with three sets only fill a short session. Build the
  // session from an approximate four-minute block per exercise so the chosen
  // duration remains meaningful once work, sets and rests are included.
  const count = request.outdoor ? 1 : Math.min(12, Math.max(1, Math.ceil(request.durationMinutes / 4)))
  const selected = shuffle(candidates).slice(0, count)
  const category = request.outdoor ? 'walking' : databaseCategory(selected[0].category)
  const exercises = selected.map((exercise) => ({
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    prescribedSets: exercise.default_reps ? (exercise.default_sets ?? 3) : null,
    prescribedReps: exercise.default_reps,
    prescribedDurationSeconds: exercise.default_reps ? null : Math.max(exercise.default_duration_seconds ?? 0, 45),
    restSeconds: 60,
  }))
  return {
    id: `${date}:database_${selected.map((exercise) => exercise.id).join('_')}_${request.durationMinutes}`,
    date,
    templateSlug: `database_${category}_${request.durationMinutes}`,
    name: category === 'walking' ? 'Easy walk' : category === 'mobility' ? 'Mobility session' : category === 'cardio' ? 'Cardio session' : 'Strength session',
    category,
    durationMinutes: request.durationMinutes,
    exercises,
    equipment: selectedEquipment,
    status: 'planned',
    isOutdoor: request.outdoor,
    intensity: selected.some((exercise) => exercise.impact_level === 'high') ? 'high' : selected.some((exercise) => exercise.impact_level === 'moderate') ? 'moderate' : 'low',
    movementPatterns: [...new Set(selected.flatMap((exercise) => exercise.movement_pattern ? [exercise.movement_pattern] : []))],
    muscleGroups: [...new Set(selected.flatMap((exercise) => (exercise.exercise_muscles ?? []).map((item) => item.muscle_group)))],
  }
}

export async function startWorkout(userId: string, workout: PlannedWorkout) {
  const db = client()
  const session = await db.from('workout_sessions').insert({ planned_workout_id: workout.id, user_id: userId, planned_duration_minutes: workout.durationMinutes }).select('id,started_at').single()
  throwOnError(session)
  if (!session.data) throw new Error('Could not start the workout session.')
  const exerciseRows = workout.exercises.map((exercise, index) => {
    return { workout_session_id: session.data.id, planned_workout_id: workout.id, user_id: userId, exercise_id: exercise.id, position: index + 1 }
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

export type SavedResource = {
  id: string
  original_url: string
  provider: 'youtube' | 'instagram' | 'tiktok'
  provider_video_id: string | null
  title: string | null
  source_title: string | null
  thumbnail_url: string | null
  is_favorite: boolean
  created_at: string
}

export async function loadSavedResources(userId: string): Promise<SavedResource[]> {
  const result = await client().from('user_resources').select('id,original_url,provider,provider_video_id,title,source_title,thumbnail_url,is_favorite,created_at').eq('user_id', userId).order('created_at', { ascending: false })
  throwOnError(result)
  return (result.data ?? []) as SavedResource[]
}

export function detectResourceUrl(value: string): { provider: SavedResource['provider']; videoId: string | null } | null {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      const videoId = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : (url.searchParams.get('v') ?? url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null)
      return videoId ? { provider: 'youtube', videoId } : null
    }
    if (host === 'instagram.com') {
      const match = url.pathname.match(/^\/(?:p|reel|tv)\/([^/?]+)/)
      return match ? { provider: 'instagram', videoId: match[1] } : null
    }
    if (host === 'tiktok.com') {
      const match = url.pathname.match(/\/video\/(\d+)/) ?? url.pathname.match(/\/player\/v1\/(\d+)/)
      return match ? { provider: 'tiktok', videoId: match[1] } : null
    }
    if (host === 'vm.tiktok.com') {
      return url.pathname.length > 1 ? { provider: 'tiktok', videoId: null } : null
    }
  } catch { /* invalid URL */ }
  return null
}

export async function saveResource(userId: string, input: { url: string; title: string }): Promise<SavedResource> {
  const parsed = detectResourceUrl(input.url)
  if (!parsed) throw new Error('Enter a valid YouTube, Instagram or TikTok video URL.')
  let sourceTitle: string | null = null
  let thumbnailUrl: string | null = null
  let providerVideoId = parsed.videoId
  if (parsed.provider === 'youtube' && parsed.videoId) thumbnailUrl = `https://i.ytimg.com/vi/${encodeURIComponent(parsed.videoId)}/hqdefault.jpg`
  if (parsed.provider === 'youtube' || parsed.provider === 'tiktok') {
    try {
      const endpoint = parsed.provider === 'youtube' ? `https://www.youtube.com/oembed?url=${encodeURIComponent(input.url.trim())}&format=json` : `https://www.tiktok.com/oembed?url=${encodeURIComponent(input.url.trim())}`
      const response = await fetch(endpoint)
      if (response.ok) {
        const metadata = await response.json() as { title?: unknown; thumbnail_url?: unknown; html?: unknown }
        sourceTitle = typeof metadata.title === 'string' ? metadata.title.trim().slice(0, 500) || null : null
        thumbnailUrl = typeof metadata.thumbnail_url === 'string' ? metadata.thumbnail_url : thumbnailUrl
        if (parsed.provider === 'tiktok' && !providerVideoId && typeof metadata.html === 'string') providerVideoId = metadata.html.match(/data-video-id=["'](\d+)["']/)?.[1] ?? null
      }
    } catch { /* metadata is optional; the resource can still be saved */ }
  }
  const result = await client().from('user_resources').insert({ user_id: userId, original_url: input.url.trim(), provider: parsed.provider, provider_video_id: providerVideoId, title: input.title.trim() || null, source_title: sourceTitle, thumbnail_url: thumbnailUrl }).select('id,original_url,provider,provider_video_id,title,source_title,thumbnail_url,is_favorite,created_at').single()
  throwOnError(result)
  if (!result.data) throw new Error('Could not save the resource.')
  return result.data as SavedResource
}

export async function deleteResource(userId: string, resourceId: string) {
  const result = await client().from('user_resources').delete().eq('id', resourceId).eq('user_id', userId)
  throwOnError(result)
}

export async function toggleResourceFavorite(userId: string, resourceId: string, isFavorite: boolean) {
  const result = await client().from('user_resources').update({ is_favorite: isFavorite }).eq('id', resourceId).eq('user_id', userId)
  throwOnError(result)
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
  const db = client()
  const result = await db.from('planned_workouts').select('workout_json').eq('user_id', userId).eq('id', workoutId).maybeSingle(); throwOnError(result)
  const workout = result.data?.workout_json ? result.data.workout_json as unknown as PlannedWorkout : null
  if (!workout) return null
  const slugs = [...new Set(workout.exercises.map((exercise) => exercise.slug))]
  const lookupSlugs = [...new Set(slugs.flatMap((slug) => [slug, slug.replaceAll('_', '-'), ...(legacyExerciseAliases[slug] ?? [])]))]
  const catalogue = lookupSlugs.length ? await db.from('exercises').select('id,slug').in('slug', lookupSlugs) : { data: [], error: null }
  throwOnError(catalogue)
  const bySlug = new Map((catalogue.data ?? []).map((exercise) => [exercise.slug, exercise]))
  const exercises = workout.exercises.map((exercise) => {
    const match = [exercise.slug.replaceAll('_', '-'), ...(legacyExerciseAliases[exercise.slug] ?? [])]
      .map((slug) => bySlug.get(slug)).find(Boolean) ?? bySlug.get(exercise.slug)
    return match ? { ...exercise, id: match.id, slug: match.slug } : exercise
  })
  return { ...workout, exercises }
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

