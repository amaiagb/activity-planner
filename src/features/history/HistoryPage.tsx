import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { buildActivityCalendar, loadWorkoutHistory, saveManualActivity } from '../../lib/historyData'
import type { WorkoutHistoryData } from '../../lib/historyData'
import { useAuth } from '../auth/useAuth'
import { useI18n } from '../../lib/i18n'
import { UiIcon } from '../../components/UiIcon'
import { Modal } from '../../components/Modal'

function displayDate(value: string, language: string, timeZone = 'UTC') {
  return new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric', timeZone }).format(new Date(`${value}T12:00:00Z`))
}

function monthLabel(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 7)}-15T12:00:00Z`))
}

function monthYearLabel(value: string, language: string) {
  const parts = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(`${value.slice(0, 7)}-15T12:00:00Z`))
  return parts.filter((part) => part.type === 'month' || part.type === 'year').map((part) => part.value).join(' ')
}

export function HistoryPage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const [history, setHistory] = useState<WorkoutHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityDate, setActivityDate] = useState<string | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)
  const [activityType, setActivityType] = useState<'training' | 'walking' | 'padel'>('training')
  const [duration, setDuration] = useState('30')
  const [exercises, setExercises] = useState('')
  const [saving, setSaving] = useState(false)

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

  const calendarDays = buildActivityCalendar(history.today, history.trackingStartedOn, history.activityDates)
  const calendarWeeks = Array.from({ length: calendarDays.length / 7 }, (_, index) => calendarDays.slice(index * 7, index * 7 + 7))
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 5 + index))
    return new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(date)
  })

  async function registerActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !activityDate || !history) return
    setSaving(true)
    setError(null)
    try {
      await saveManualActivity(session.user.id, {
        activity_date: activityDate,
        activity_type: activityType,
        duration_minutes: Number(duration),
        exercises: activityType === 'training' ? exercises.trim() || null : null,
      })
      setHistory(await loadWorkoutHistory(session.user.id))
      setActivityDate(null)
      setExercises('')
    } catch {
      setError('Could not save activity.')
    } finally { setSaving(false) }
  }

  return (
    <section className="page-content history-page streak-page" aria-labelledby="history-title">
      <p className="eyebrow streak-page-kicker">{monthYearLabel(history.today, language)}</p>
      <section className="streak-hero" aria-label={`${history.currentStreak} ${t(history.currentStreak === 1 ? 'day in a row' : 'days in a row')}`}>
        <div><h1 id="history-title">{history.currentStreak}</h1><p>{t(history.currentStreak === 1 ? 'day in a row' : 'days in a row')}</p><span className="streak-claim">{t(history.currentStreak ? 'Streak on fire' : 'Start a streak today')}</span></div>
        <svg className="streak-hero-flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" /></svg>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="history-streak-cards streak-metrics">
        <article className="history-streak-card"><strong>{history.bestStreak}</strong><span>{t('BEST STREAK')}</span></article>
        <article className="history-streak-card"><strong>{history.activeDaysThisMonth}</strong><span>{t('THIS MONTH')}</span></article>
      </div>

      <section className="activity-calendar-section" aria-labelledby="activity-calendar-title">
        <div className="section-heading-row"><h2 id="activity-calendar-title">{t('Training activity')}</h2><p>{monthLabel(history.today, language)}</p></div>
        <table className="activity-calendar"><caption className="sr-only">{t('Training activity calendar')} · {monthLabel(history.today, language)}</caption><thead><tr>{weekdayLabels.map((label, index) => <th scope="col" key={index}>{label}</th>)}</tr></thead><tbody>{calendarWeeks.map((week, weekIndex) => <tr key={weekIndex}>{week.map((day, dayIndex) => <td key={day.date ?? `empty-${weekIndex}-${dayIndex}`}>{day.date && day.date <= history.today ? <button className={`activity-calendar-day day-${day.state}`} type="button" disabled={day.date === history.today && day.state !== 'active'} aria-label={`${displayDate(day.date, language, history.timeZone)}: ${t(`calendar-${day.state}`)}`} onClick={() => day.state === 'active' ? setDetailDate(day.date) : setActivityDate(day.date)}><span aria-hidden="true">{Number(day.date.slice(-2))}</span><span className="sr-only">{t(`calendar-${day.state}`)}</span>{day.state === 'active' && <span className="calendar-check" aria-hidden="true"><UiIcon name="check" /></span>}</button> : day.date ? <span className={`activity-calendar-day day-${day.state}`} aria-label={`${displayDate(day.date, language, history.timeZone)}: ${t(`calendar-${day.state}`)}`}><span>{Number(day.date.slice(-2))}</span></span> : null}</td>)}</tr>)}</tbody></table>
        <ul className="activity-calendar-legend" aria-label={t('Calendar legend')}><li><span className="legend-swatch is-active" aria-hidden="true"><UiIcon name="check" /></span>{t('Completed activity')}</li><li><span className="legend-swatch" aria-hidden="true">·</span>{t('No completed activity')}</li><li><span className="legend-swatch is-unknown" aria-hidden="true">?</span>{t('No data yet')}</li></ul>
      </section>

      {detailDate && <Modal title={displayDate(detailDate, language, history.timeZone)} onClose={() => setDetailDate(null)} className="confirm-dialog activity-detail-dialog"><span className="detail-icon" aria-hidden="true"><UiIcon name="check" /></span>{history.activityDetails.filter((activity) => activity.date === detailDate).map((activity) => <p key={`${activity.name}-${activity.durationMinutes}`}>{t(activity.name)} · {activity.durationMinutes} min</p>)}<button className="button button-secondary" type="button" onClick={() => setDetailDate(null)}>{t('Close')}</button></Modal>}
      {activityDate && <Modal title={t('Register activity')} onClose={() => setActivityDate(null)} className="today-workout-dialog activity-dialog"><form onSubmit={(event) => void registerActivity(event)}>
        <label>{t('Date')}<input type="date" value={activityDate} max={history.today} onChange={(event) => setActivityDate(event.target.value)} required /></label>
        <label>{t('Activity type')}<select value={activityType} onChange={(event) => setActivityType(event.target.value as typeof activityType)}><option value="training">{t('Training')}</option><option value="walking">{t('Walking')}</option><option value="padel">{t('Padel')}</option></select></label>
        <label>{t('Duration (minutes)')}<input type="number" min="1" max="1440" required value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
        {activityType === 'training' && <label>{t('Exercises (optional)')}<textarea maxLength={2000} value={exercises} onChange={(event) => setExercises(event.target.value)} placeholder={t('You can leave this blank.')} /></label>}
        {error && <p className="form-error" role="alert">{t(error)}</p>}
        <div className="button-row"><button className="button button-primary" type="submit" disabled={saving}>{saving ? t('Saving…') : t('Save activity')}</button><button className="button button-secondary" type="button" onClick={() => setActivityDate(null)}>{t('Cancel')}</button></div>
      </form></Modal>}
    </section>
  )
}
