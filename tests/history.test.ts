import { describe, expect, it } from 'vitest'
import { buildActivityCalendar, formatActiveTime, summarizeWorkoutHistory } from '../src/lib/historyData'
import { localDateInTimeZone } from '../src/lib/userTimeZone'
import type { CompletedWorkoutHistoryRow, PlannedWorkoutHistoryRow } from '../src/lib/historyData'

describe('workout history summaries', () => {
  it('calculates weekly and monthly completion, active time, and planned-day streaks', () => {
    const planned: PlannedWorkoutHistoryRow[] = [
      { workout_date: '2026-10-08', status: 'completed', duration_minutes: 30 },
      { workout_date: '2026-10-06', status: 'completed', duration_minutes: 30 },
      { workout_date: '2026-10-03', status: 'completed', duration_minutes: 30 },
      { workout_date: '2026-10-09', status: 'planned', duration_minutes: 30 },
      { workout_date: '2026-10-01', status: 'skipped', duration_minutes: 30 },
      { workout_date: '2026-09-29', status: 'completed', duration_minutes: 30 },
    ]
    const sessions: CompletedWorkoutHistoryRow[] = [
      { id: 'a', completed_at: '2026-10-08T08:30:00Z', completed_local_date: '2026-10-08', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 32, planned_duration_minutes: 30, perceived_exertion: 3, note: null, planned_workout: { workout_date: '2026-10-08', name: 'Strength', category: 'strength' } },
      { id: 'b', completed_at: '2026-10-06T08:30:00Z', completed_local_date: '2026-10-07', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 30, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-10-06', name: 'Walk', category: 'walking' } },
      { id: 'c', completed_at: '2026-10-03T08:30:00Z', completed_local_date: '2026-10-03', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 28, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-10-03', name: 'Mobility', category: 'mobility' } },
      { id: 'd', completed_at: '2026-09-29T08:30:00Z', completed_local_date: '2026-09-29', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 30, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-09-29', name: 'Cardio', category: 'cardio' } },
    ]

    const summary = summarizeWorkoutHistory(planned, sessions, '2026-10-08', '2026-09-01', 'Europe/Madrid')

    expect(summary.weekly).toEqual({ completed: 2, planned: 3, activeMinutes: 62, completionPercent: 67 })
    expect(summary.monthly).toEqual({ completed: 3, planned: 5, activeMinutes: 90, completionPercent: 60 })
    expect(summary.currentStreak).toBe(2)
    expect(summary.bestStreak).toBe(2)
    expect(summary.activeDaysThisMonth).toBe(3)
    expect(summary.recentWorkouts[0]?.perceivedExertion).toBe(3)
  })

  it('formats long active durations as hours and minutes', () => {
    expect(formatActiveTime(385)).toBe('6h 25m')
    expect(formatActiveTime(60)).toBe('1h')
    expect(formatActiveTime(42)).toBe('42 min')
  })

  it('credits one calendar day per completed session with at least one exercise done', () => {
    const sessions: CompletedWorkoutHistoryRow[] = [
      { id: 'today-1', completed_at: null, completed_local_date: '2026-10-10', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 0, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: null },
      { id: 'today-2', completed_at: null, completed_local_date: '2026-10-10', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 0, planned_duration_minutes: 15, perceived_exertion: null, note: null, planned_workout: null },
      { id: 'skipped-all', completed_at: null, completed_local_date: '2026-10-09', completion_timezone: 'Europe/Madrid', exercise_sessions: [{ status: 'skipped' }], actual_duration_minutes: 60, planned_duration_minutes: 60, perceived_exertion: null, note: null, planned_workout: null },
      { id: 'legacy', completed_at: '2026-10-08T22:00:00Z', completed_local_date: null, completion_timezone: null, exercise_sessions: [{ status: 'done' }], actual_duration_minutes: 30, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: null },
    ]
    const summary = summarizeWorkoutHistory([], sessions, '2026-10-10', '2026-10-01')
    expect(summary.activityDates).toEqual(['2026-10-10'])
    expect(summary.currentStreak).toBe(1)
    expect(summary.bestStreak).toBe(1)
  })

  it('keeps yesterday’s streak alive through today and resets after a missed day', () => {
    const yesterday = [{ id: 'y', completed_at: null, completed_local_date: '2026-10-09', completion_timezone: 'UTC', exercise_sessions: [{ status: 'done' as const }], actual_duration_minutes: null, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: null }]
    expect(summarizeWorkoutHistory([], yesterday, '2026-10-10').currentStreak).toBe(1)
    expect(summarizeWorkoutHistory([], yesterday, '2026-10-11').currentStreak).toBe(0)
  })

  it('marks calendar days before tracking began as unknown and leaves future days distinct', () => {
    const days = buildActivityCalendar('2026-10-10', '2026-10-08', ['2026-10-08'])
    expect(days.find((day) => day.date === '2026-10-07')?.state).toBe('unknown')
    expect(days.find((day) => day.date === '2026-10-08')?.state).toBe('active')
    expect(days.find((day) => day.date === '2026-10-09')?.state).toBe('inactive')
    expect(days.find((day) => day.date === '2026-10-11')?.state).toBe('future')
  })

  it('uses the saved IANA time zone across local midnight and daylight-saving transitions', () => {
    expect(localDateInTimeZone(new Date('2026-10-10T23:30:00Z'), 'Europe/Madrid')).toBe('2026-10-11')
    expect(localDateInTimeZone(new Date('2026-10-25T00:30:00Z'), 'Europe/Madrid')).toBe('2026-10-25')
  })
})
