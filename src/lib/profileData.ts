import { supabase } from './supabase'
import type { MeasurementKey, MeasurementRecord, ProfileData, ProfileFormValues } from '../types/profile'

function getClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key to your local environment.')
  return supabase
}

export async function loadProfileData(userId: string): Promise<ProfileData> {
  const client = getClient()
  const results = await Promise.all([
    client.from('profiles').select('user_id, display_name, primary_goal, secondary_goal, fitness_level').eq('user_id', userId).maybeSingle(),
    client.from('availability').select('user_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, default_duration_minutes').eq('user_id', userId).maybeSingle(),
    client.from('preferences').select('user_id, likes_strength, likes_cardio, likes_walking, likes_hiit, likes_mobility, can_go_outside, outside_is_weather_dependent').eq('user_id', userId).maybeSingle(),
    client.from('user_equipment').select('equipment_id').eq('user_id', userId),
    client.from('excluded_exercises').select('exercise_id').eq('user_id', userId),
    client.from('equipment').select('id, slug, name, category').order('name'),
    client.from('exercises').select('id, slug, name, category').eq('is_active', true).order('name'),
    client.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }),
  ])

  const error = results.find((result) => result.error)?.error
  if (error) throw new Error(error.message)

  return {
    profile: results[0].data as ProfileData['profile'],
    availability: results[1].data as ProfileData['availability'],
    preferences: results[2].data as ProfileData['preferences'],
    equipmentIds: (results[3].data ?? []).map((row) => row.equipment_id as string),
    excludedExerciseIds: (results[4].data ?? []).map((row) => row.exercise_id as string),
    equipment: (results[5].data ?? []) as ProfileData['equipment'],
    exercises: (results[6].data ?? []) as ProfileData['exercises'],
    measurements: (results[7].data ?? []) as MeasurementRecord[],
  }
}

export async function saveProfileData(userId: string, values: ProfileFormValues) {
  const client = getClient()
  const writes = await Promise.all([
    client.from('profiles').upsert({
      user_id: userId,
      display_name: values.displayName.trim() || null,
      primary_goal: values.primaryGoal || null,
      secondary_goal: values.secondaryGoal || null,
      fitness_level: values.fitnessLevel || null,
    }, { onConflict: 'user_id' }),
    client.from('availability').upsert({
      user_id: userId,
      ...values.days,
      default_duration_minutes: values.duration,
    }, { onConflict: 'user_id' }),
    client.from('preferences').upsert({
      user_id: userId,
      likes_strength: values.likes.strength,
      likes_cardio: values.likes.cardio,
      likes_walking: values.likes.walking,
      likes_hiit: values.likes.hiit,
      likes_mobility: values.likes.mobility,
      can_go_outside: values.canGoOutside,
      outside_is_weather_dependent: values.outsideWeatherDependent,
    }, { onConflict: 'user_id' }),
  ])
  const failedWrite = writes.find((result) => result.error)
  if (failedWrite?.error) throw new Error(failedWrite.error.message)

  const [equipmentDelete, exclusionsDelete] = await Promise.all([
    client.from('user_equipment').delete().eq('user_id', userId),
    client.from('excluded_exercises').delete().eq('user_id', userId),
  ])
  if (equipmentDelete.error) throw new Error(equipmentDelete.error.message)
  if (exclusionsDelete.error) throw new Error(exclusionsDelete.error.message)

  const relationWrites = await Promise.all([
    values.equipmentIds.length
      ? client.from('user_equipment').insert(values.equipmentIds.map((equipment_id) => ({ user_id: userId, equipment_id })))
      : Promise.resolve({ error: null }),
    values.excludedExerciseIds.length
      ? client.from('excluded_exercises').insert(values.excludedExerciseIds.map((exercise_id) => ({ user_id: userId, exercise_id })))
      : Promise.resolve({ error: null }),
  ])
  const failedRelation = relationWrites.find((result) => result.error)
  if (failedRelation?.error) throw new Error(failedRelation.error.message)
}

export type MeasurementInput = {
  measured_at: string
  values: Record<MeasurementKey, string>
  notes: string
}

function hasMeasurement(input: MeasurementInput) {
  return Object.values(input.values).some((value) => value.trim() !== '')
}

function measurementPayload(input: MeasurementInput) {
  const payload: Record<string, string | number | null> = {
    measured_at: input.measured_at,
    notes: input.notes.trim() || null,
  }
  for (const [key, value] of Object.entries(input.values)) {
    payload[key] = value.trim() === '' ? null : Number(value)
  }
  return payload
}

export async function saveMeasurement(userId: string, input: MeasurementInput, id?: string) {
  if (!hasMeasurement(input)) throw new Error('Enter at least one measurement, or skip this step.')
  const client = getClient()
  const payload = measurementPayload(input)
  const result = id
    ? await client.from('body_measurements').update(payload).eq('id', id).eq('user_id', userId)
    : await client.from('body_measurements').insert({ ...payload, user_id: userId })
  if (result.error) throw new Error(result.error.message)
}

export async function deleteMeasurement(userId: string, id: string) {
  const { error } = await getClient().from('body_measurements').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function deleteAccount() {
  const client = getClient()
  const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' })
  if (error) throw new Error(error.message)
  if (data?.deleted !== true) throw new Error('The server did not confirm account deletion.')
  const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
  if (signOutError) throw new Error(signOutError.message)
}
