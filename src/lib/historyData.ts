import { supabase } from './supabase'

export type PlannedWorkoutHistoryRow = {
  workout_date: string
  status: 'planned' | 'completed' | 'skipped'
  duration_minutes: number
}

export type CompletedWorkoutHistoryRow = {
  id: string
  completed_at: string | null
  actual_duration_minutes: number | null
  planned_duration_minutes: number
  perceived_exertion: number | null
  note: string | null
  planned_workout: { workout_date: string; name: string; category: string } | null
}

export type WorkoutSummary = {
  completed: number
  planned: number
  activeMinutes: number
  completionPercent: number
}

export type WorkoutHistoryData = {
  recentWorkouts: Array<{
    id: string
    name: string
    category: string
    completionDate: string
    durationMinutes: number
    perceivedExertion: number | null
  }>
  weekly: WorkoutSummary
  monthly: WorkoutSummary
  currentStreak: number
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return localIsoDate(date)
}

function startOfNextWeek(value: string) {
  const date = new Date(`${startOfWeek(value)}T12:00:00`)
  date.setDate(date.getDate() + 7)
  return localIsoDate(date)
}

function startOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`
}

function startOfNextMonth(value: string) {
  const date = new Date(`${startOfMonth(value)}T12:00:00`)
  date.setMonth(date.getMonth() + 1)
  return localIsoDate(date)
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

export function summarizeWorkoutHistory(
  workouts: PlannedWorkoutHistoryRow[],
  sessions: CompletedWorkoutHistoryRow[],
  today = localIsoDate(new Date()),
): WorkoutHistoryData {
  const weekly = summaryFor(workouts, sessions, startOfWeek(today), startOfNextWeek(today))
  const monthly = summaryFor(workouts, sessions, startOfMonth(today), startOfNextMonth(today))
  const pastPlannedDays = workouts.filter((workout) => workout.workout_date <= today).slice().sort((a, b) => b.workout_date.localeCompare(a.workout_date))
  let currentStreak = 0
  const checkedDates = new Set<string>()
  for (const workout of pastPlannedDays) {
    if (checkedDates.has(workout.workout_date)) continue
    checkedDates.add(workout.workout_date)
    if (workout.status !== 'completed') break
    currentStreak += 1
  }
  return {
    recentWorkouts: sessions.flatMap((session) => {
      const workout = session.planned_workout
      if (!workout) return []
      return [{
        id: session.id,
        name: workout.name,
        category: workout.category,
        completionDate: session.completed_at?.slice(0, 10) ?? workout.workout_date,
        durationMinutes: session.actual_duration_minutes ?? session.planned_duration_minutes,
        perceivedExertion: session.perceived_exertion,
      }]
    }).slice(0, 25),
    weekly,
    monthly,
    currentStreak,
  }
}

export async function loadWorkoutHistory(userId: string, today = localIsoDate(new Date())): Promise<WorkoutHistoryData> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [planned, sessions] = await Promise.all([
    supabase.from('planned_workouts').select('workout_date,status,duration_minutes').eq('user_id', userId).order('workout_date', { ascending: false }),
    supabase.from('workout_sessions').select('id,completed_at,actual_duration_minutes,planned_duration_minutes,perceived_exertion,note,planned_workout:planned_workouts(workout_date,name,category)').eq('user_id', userId).eq('status', 'completed').order('completed_at', { ascending: false }),
  ])
  const error = planned.error ?? sessions.error
  if (error) throw new Error(error.message)
  return summarizeWorkoutHistory(
    (planned.data ?? []) as PlannedWorkoutHistoryRow[],
    (sessions.data ?? []) as unknown as CompletedWorkoutHistoryRow[],
    today,
  )
}

export function formatActiveTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}
