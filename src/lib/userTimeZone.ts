import { supabase } from './supabase'

export function browserTimeZone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
  return isValidTimeZone(detected) ? detected : 'UTC'
}

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function localDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export async function getOrInitializeUserTimeZone(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const profile = await supabase.from('profiles').select('time_zone').eq('user_id', userId).maybeSingle()
  if (profile.error) throw new Error(profile.error.message)
  if (isValidTimeZone(profile.data?.time_zone)) return profile.data.time_zone

  const timeZone = browserTimeZone()
  const saved = await supabase.from('profiles').upsert({ user_id: userId, time_zone: timeZone }, { onConflict: 'user_id' })
  if (saved.error) throw new Error(saved.error.message)
  return timeZone
}
