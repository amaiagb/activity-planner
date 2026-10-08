import { useEffect, useState } from 'react'
import { loadWorkoutHistory } from '../../lib/historyData'
import type { WorkoutHistoryData } from '../../lib/historyData'
import { formatActiveTime } from '../../lib/historyData'
import { useAuth } from '../auth/useAuth'

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function displayCategory(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function HistoryPage() {
  const { session } = useAuth()
  const [history, setHistory] = useState<WorkoutHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    void loadWorkoutHistory(session.user.id).then((data) => {
      if (active) setHistory(data)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load workout history.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session])

  if (loading) return <section className="page-content"><p role="status">Loading your history…</p></section>
  if (!history) return <section className="page-content"><p className="form-error" role="alert">{error ?? 'Workout history is unavailable.'}</p></section>

  return (
    <section className="page-content history-page" aria-labelledby="history-title">
      <p className="eyebrow">YOUR ACTIVITY</p>
      <h1 id="history-title">History</h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="history-summary-grid">
        <article className="card history-summary-card" aria-labelledby="weekly-summary-title">
          <p className="eyebrow">THIS WEEK</p>
          <h2 id="weekly-summary-title">{history.weekly.completed} / {history.weekly.planned} workouts</h2>
          <p>{history.weekly.activeMinutes} active minutes</p>
          <span>{history.weekly.completionPercent}% completion</span>
        </article>
        <article className="card history-summary-card" aria-labelledby="monthly-summary-title">
          <p className="eyebrow">THIS MONTH</p>
          <h2 id="monthly-summary-title">{history.monthly.completed} workouts</h2>
          <p>{formatActiveTime(history.monthly.activeMinutes)} active time</p>
          <span>{history.monthly.completionPercent}% completion</span>
        </article>
        <article className="card history-summary-card streak-summary" aria-labelledby="streak-title">
          <p className="eyebrow">CURRENT STREAK</p>
          <h2 id="streak-title">{history.currentStreak} planned workout {history.currentStreak === 1 ? 'day' : 'days'}</h2>
          <p>Completed scheduled training days in a row.</p>
        </article>
      </div>

      <section className="history-recent-section" aria-labelledby="recent-workouts-title">
        <h2 id="recent-workouts-title">Recent workouts</h2>
        {history.recentWorkouts.length === 0 ? <p className="empty-state">Completed workouts will appear here.</p> : <ul className="history-list">
          {history.recentWorkouts.map((workout) => <li className="card history-record" key={workout.id}>
            <div className="history-record-heading"><div><h3>{workout.name}</h3><time dateTime={workout.completionDate}>{displayDate(workout.completionDate)}</time></div><span>{workout.durationMinutes} min</span></div>
            <p>{displayCategory(workout.category)}</p>
            {workout.perceivedExertion !== null && <p>Perceived exertion: {workout.perceivedExertion} / 5</p>}
          </li>)}
        </ul>}
      </section>
    </section>
  )
}
