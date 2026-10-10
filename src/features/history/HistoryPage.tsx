import { useEffect, useState } from 'react'
import { loadWorkoutHistory } from '../../lib/historyData'
import type { WorkoutHistoryData } from '../../lib/historyData'
import { useAuth } from '../auth/useAuth'
import { useI18n } from '../../lib/i18n'

function displayDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function displayCategory(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function HistoryPage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const [history, setHistory] = useState<WorkoutHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    void loadWorkoutHistory(session.user.id).then((data) => {
      if (active) setHistory(data)
    }).catch(() => {
      if (active) setError('Could not load workout history.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session])

  if (loading) return <section className="page-content"><p role="status">{t('Loading your history…')}</p></section>
  if (!history) return <section className="page-content"><p className="form-error" role="alert">{error ?? t('Workout history is unavailable.')}</p></section>

  return (
    <section className="page-content history-page" aria-labelledby="history-title">
      <p className="eyebrow">{t('YOUR ACTIVITY')}</p>
      <h1 id="history-title">{t('History')}</h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="history-summary-grid">
        <article className="card history-summary-card" aria-labelledby="weekly-summary-title">
          <p className="eyebrow">{t('THIS WEEK')}</p>
          <h2 id="weekly-summary-title">{history.weekly.completed} / {history.weekly.planned} {t(history.weekly.planned === 1 ? 'workout' : 'workouts')}</h2>
          <p>{history.weekly.activeMinutes} {t('active minutes')}</p>
          <span>{history.weekly.completionPercent}% {t('completion')}</span>
        </article>
        <article className="card history-summary-card" aria-labelledby="monthly-summary-title">
          <p className="eyebrow">{t('THIS MONTH')}</p>
          <h2 id="monthly-summary-title">{history.monthly.completed} {t(history.monthly.completed === 1 ? 'workout' : 'workouts')}</h2>
          <p>{formatActiveTimeLocalized(history.monthly.activeMinutes, language)} {t('active time')}</p>
          <span>{history.monthly.completionPercent}% {t('completion')}</span>
        </article>
        <article className="card history-summary-card streak-summary" aria-labelledby="streak-title">
          <p className="eyebrow">{t('CURRENT STREAK')}</p>
          <h2 id="streak-title">{history.currentStreak} {t(history.currentStreak === 1 ? 'planned workout day' : 'planned workout days')}</h2>
          <p>{t('Completed scheduled training days in a row.')}</p>
        </article>
      </div>

      <section className="history-recent-section" aria-labelledby="recent-workouts-title">
        <h2 id="recent-workouts-title">{t('Recent workouts')}</h2>
        {history.recentWorkouts.length === 0 ? <p className="empty-state">{t('Completed workouts will appear here.')}</p> : <ul className="history-list">
          {history.recentWorkouts.map((workout) => <li className="card history-record" key={workout.id}>
            <div className="history-record-heading"><div><h3>{t(workout.name)}</h3><time dateTime={workout.completionDate}>{displayDate(workout.completionDate, language)}</time></div><span>{workout.durationMinutes} min</span></div>
            <p>{t(displayCategory(workout.category))}</p>
            {workout.perceivedExertion !== null && <p>{t('Perceived exertion:')} {workout.perceivedExertion} / 5</p>}
          </li>)}
        </ul>}
      </section>
    </section>
  )
}

function formatActiveTimeLocalized(minutes: number, language: string) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (language === 'es') {
    if (!hours) return `${remainingMinutes} min`
    if (!remainingMinutes) return `${hours} h`
    return `${hours} h ${remainingMinutes} min`
  }
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}
