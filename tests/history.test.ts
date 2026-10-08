import { describe, expect, it } from 'vitest'
import { formatActiveTime, summarizeWorkoutHistory } from '../src/lib/historyData'
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
      { id: 'a', completed_at: '2026-10-08T08:30:00Z', actual_duration_minutes: 32, planned_duration_minutes: 30, perceived_exertion: 3, note: null, planned_workout: { workout_date: '2026-10-08', name: 'Strength', category: 'strength' } },
      { id: 'b', completed_at: '2026-10-06T08:30:00Z', actual_duration_minutes: 30, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-10-06', name: 'Walk', category: 'walking' } },
      { id: 'c', completed_at: '2026-10-03T08:30:00Z', actual_duration_minutes: 28, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-10-03', name: 'Mobility', category: 'mobility' } },
      { id: 'd', completed_at: '2026-09-29T08:30:00Z', actual_duration_minutes: 30, planned_duration_minutes: 30, perceived_exertion: null, note: null, planned_workout: { workout_date: '2026-09-29', name: 'Cardio', category: 'cardio' } },
    ]

    const summary = summarizeWorkoutHistory(planned, sessions, '2026-10-08')

    expect(summary.weekly).toEqual({ completed: 2, planned: 3, activeMinutes: 62, completionPercent: 67 })
    expect(summary.monthly).toEqual({ completed: 3, planned: 5, activeMinutes: 90, completionPercent: 60 })
    expect(summary.currentStreak).toBe(3)
    expect(summary.recentWorkouts[0]?.perceivedExertion).toBe(3)
  })

  it('formats long active durations as hours and minutes', () => {
    expect(formatActiveTime(385)).toBe('6h 25m')
    expect(formatActiveTime(60)).toBe('1h')
    expect(formatActiveTime(42)).toBe('42 min')
  })
})
