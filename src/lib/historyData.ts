import { supabase } from './supabase'
import { getOrInitializeUserTimeZone, localDateInTimeZone } from './userTimeZone'

export type PlannedWorkoutHistoryRow = {
  workout_date: string
  status: 'planned' | 'completed' | 'skipped'
  duration_minutes: number
}

export type CompletedWorkoutHistoryRow = {
  id: string
  completed_at: string | null
  completed_local_date: string | null
  completion_timezone: string | null
  actual_duration_minutes: number | null
  planned_duration_minutes: number
  perceived_exertion: number | null
  note: string | null
  exercise_sessions: Array<{ status: 'planned' | 'done' | 'skipped' }> | null
  planned_workout: { workout_date: string; name: string; category: string } | null
}

export type ManualActivityRow = {
  id: string
  activity_date: string
  activity_type: 'training' | 'walking' | 'padel'
  duration_minutes: number
  exercises: string | null
}

export type WorkoutSummary = {
  completed: number
  planned: number
  activeMinutes: number
  completionPercent: number
}

export type WorkoutHistoryData = {
  activityDetails: Array<{ date: string; name: string; durationMinutes: number; manual?: boolean }>
  recentWorkouts: Array<{
    id: string
    name: string
    category: string
    completionDate: string
    durationMinutes: number
    perceivedExertion: number | null
    manual?: boolean
    exercises?: string | null
  }>
  weekly: WorkoutSummary
  monthly: WorkoutSummary
  currentStreak: number
  bestStreak: number
  activeDaysThisMonth: number
  today: string
  activityDates: string[]
  trackingStartedOn: string
  timeZone: string
}

function localIsoDate(date = new Date()) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return localDateInTimeZone(date, timeZone)
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function startOfNextWeek(value: string) {
  return addDays(startOfWeek(value), 7)
}

function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`
}

function startOfNextMonth(value: string) {
  const date = new Date(`${startOfMonth(value)}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 10)
}

function summaryFor(
  workouts: PlannedWorkoutHistoryRow[],
  sessions: CompletedWorkoutHistoryRow[],
  start: string,
  end: string,
): WorkoutSummary {
  const inRange = workouts.filter((workout) => workout.workout_date >= start && workout.workout_date < end)
  const completedIds = new Set(inRange.filter((workout) => workout.status === 'completed').map((workout) => workout.workout_date))
  const completed = completedIds.size
  const activeMinutesByDate = new Map<string, number>()
  for (const session of sessions) {
    const workoutDate = session.planned_workout?.workout_date
    if (!workoutDate || workoutDate < start || workoutDate >= end) continue
    activeMinutesByDate.set(workoutDate, session.actual_duration_minutes ?? session.planned_duration_minutes)
  }
  const activeMinutes = [...completedIds].reduce((total, date) => total + (activeMinutesByDate.get(date) ?? inRange.find((item) => item.workout_date === date)?.duration_minutes ?? 0), 0)
  const planned = inRange.length
  return { completed, planned, activeMinutes, completionPercent: planned ? Math.round((completed / planned) * 100) : 0 }
}

function isActivityCredit(session: CompletedWorkoutHistoryRow) {
  return Boolean(session.completed_local_date && session.exercise_sessions?.some((exercise) => exercise.status === 'done'))
}

function streakMetrics(activityDates: string[], today: string) {
  const dates = [...new Set(activityDates)].sort()
  const dateSet = new Set(dates)
  let currentStreak = 0
  let cursor = dateSet.has(today) ? today : addDays(today, -1)
  while (dateSet.has(cursor)) {
    currentStreak += 1
    cursor = addDays(cursor, -1)
  }

  let bestStreak = 0
  let streak = 0
  let previous: string | null = null
  for (const date of dates) {
    streak = previous && addDays(previous, 1) === date ? streak + 1 : 1
    bestStreak = Math.max(bestStreak, streak)
    previous = date
  }
  return { currentStreak, bestStreak }
}

export type ActivityCalendarDay = { date: string | null; state: 'active' | 'inactive' | 'unknown' | 'future' }

export function buildActivityCalendar(today: string, trackingStartedOn: string, activityDates: string[]): ActivityCalendarDay[] {
  const monthStart = startOfMonth(today)
  const monthEnd = startOfNextMonth(today)
  const firstDay = new Date(`${monthStart}T00:00:00Z`)
  const daysInMonth = Math.round((new Date(`${monthEnd}T00:00:00Z`).getTime() - firstDay.getTime()) / 86_400_000)
  const leadingEmptyDays = (firstDay.getUTCDay() + 6) % 7
  const active = new Set(activityDates)
  const days: ActivityCalendarDay[] = Array.from({ length: leadingEmptyDays }, () => ({ date: null, state: 'unknown' }))
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthStart.slice(0, 8)}${String(day).padStart(2, '0')}`
    const state = date > today ? 'future' : date < trackingStartedOn ? 'unknown' : active.has(date) ? 'active' : 'inactive'
    days.push({ date, state })
  }
  while (days.length % 7) days.push({ date: null, state: 'unknown' })
  return days
}

export function summarizeWorkoutHistory(
  workouts: PlannedWorkoutHistoryRow[],
  sessions: CompletedWorkoutHistoryRow[],
  today = localIsoDate(),
  trackingStartedOn = '0001-01-01',
  timeZone = 'UTC',
  manualActivities: ManualActivityRow[] = [],
): WorkoutHistoryData {
  const weekly = summaryFor(workouts, sessions, startOfWeek(today), startOfNextWeek(today))
  const monthly = summaryFor(workouts, sessions, startOfMonth(today), startOfNextMonth(today))
  const activityDates = [...new Set([...sessions
    .filter(isActivityCredit)
    .map((session) => session.completed_local_date!)
    .filter((date) => date >= trackingStartedOn && date <= today), ...manualActivities
      .map((activity) => activity.activity_date)
      .filter((date) => date >= trackingStartedOn && date <= today)])].sort()
  const { currentStreak, bestStreak } = streakMetrics(activityDates, today)
  const monthStart = startOfMonth(today)
  const monthEnd = startOfNextMonth(today)
  return {
    activityDetails: [...sessions.flatMap((session) => {
      const workout = session.planned_workout
      const date = session.completed_local_date ?? session.completed_at?.slice(0, 10) ?? workout?.workout_date
      if (!workout || !date || !isActivityCredit(session)) return []
      return [{ date, name: workout.name, durationMinutes: session.actual_duration_minutes ?? session.planned_duration_minutes }]
    }), ...manualActivities.map((activity) => ({
      date: activity.activity_date,
      name: activity.activity_type === 'training' ? 'Training' : activity.activity_type === 'walking' ? 'Walking' : 'Padel',
      durationMinutes: activity.duration_minutes,
      manual: true,
    }))],
    recentWorkouts: [...sessions.flatMap((session) => {
      const workout = session.planned_workout
      if (!workout) return []
      return [{
        id: session.id,
        name: workout.name,
        category: workout.category,
        completionDate: session.completed_local_date ?? session.completed_at?.slice(0, 10) ?? workout.workout_date,
        durationMinutes: session.actual_duration_minutes ?? session.planned_duration_minutes,
        perceivedExertion: session.perceived_exertion,
      }]
    }), ...manualActivities.map((activity) => ({
      id: activity.id,
      name: activity.activity_type === 'training' ? 'Training' : activity.activity_type === 'walking' ? 'Walking' : 'Padel',
      category: activity.activity_type,
      completionDate: activity.activity_date,
      durationMinutes: activity.duration_minutes,
      perceivedExertion: null,
      manual: true,
      exercises: activity.exercises,
    }))].sort((a, b) => b.completionDate.localeCompare(a.completionDate)).slice(0, 25),
    weekly,
    monthly,
    currentStreak,
    bestStreak,
    activeDaysThisMonth: activityDates.filter((date) => date >= monthStart && date < monthEnd).length,
    today,
    activityDates,
    trackingStartedOn,
    timeZone,
  }
}

export async function loadWorkoutHistory(userId: string): Promise<WorkoutHistoryData> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [planned, sessions, manualActivities, profile] = await Promise.all([
    supabase.from('planned_workouts').select('workout_date,status,duration_minutes').eq('user_id', userId).order('workout_date', { ascending: false }),
    supabase.from('workout_sessions').select('id,completed_at,completed_local_date,completion_timezone,actual_duration_minutes,planned_duration_minutes,perceived_exertion,note,exercise_sessions(status),planned_workout:planned_workouts(workout_date,name,category)').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }),
    supabase.from('manual_activities').select('id,activity_date,activity_type,duration_minutes,exercises').eq('user_id', userId).order('activity_date', { ascending: false }),
    supabase.from('profiles').select('time_zone,streak_tracking_started_on').eq('user_id', userId).maybeSingle(),
  ])
  const error = planned.error ?? sessions.error ?? manualActivities.error ?? profile.error
  if (error) throw new Error(error.message)
  const timeZone = await getOrInitializeUserTimeZone(userId)
  const today = localDateInTimeZone(new Date(), timeZone)
  const configuredTrackingStart = profile.data?.streak_tracking_started_on ?? today
  const firstManualDate = (manualActivities.data ?? []).reduce<string | null>((earliest, activity) =>
    !earliest || activity.activity_date < earliest ? activity.activity_date : earliest, null)
  const trackingStartedOn = firstManualDate && firstManualDate < configuredTrackingStart ? firstManualDate : configuredTrackingStart
  return summarizeWorkoutHistory(
    (planned.data ?? []) as PlannedWorkoutHistoryRow[],
    (sessions.data ?? []) as unknown as CompletedWorkoutHistoryRow[],
    today,
    trackingStartedOn,
    timeZone,
    (manualActivities.data ?? []) as ManualActivityRow[],
  )
}

export async function saveManualActivity(userId: string, activity: Omit<ManualActivityRow, 'id'>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('manual_activities').insert({ user_id: userId, ...activity })
  if (error) throw new Error(error.message)
}

export function formatActiveTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}
