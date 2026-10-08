import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { PlannedWorkout, WeeklyPlan } from '../../planner'
import { useAuth } from '../auth/useAuth'
import {
  completeWorkout,
  currentWeekStart,
  getOrCreateWeeklyPlan,
  loadActiveSession,
  loadPlannerContext,
  regenerateDay,
  regenerateWeek,
  setExerciseStatus,
  skipPlannedWorkout,
  startWorkout,
} from './plannerData'
import type { ExerciseGuide, PlannerContext } from './plannerData'

type PlannerState = { context: PlannerContext; plan: WeeklyPlan }

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateFromWeek(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return localDate(date)
}

function readableDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options ?? { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function usePlannerState() {
  const { session } = useAuth()
  const [state, setState] = useState<PlannerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!session) return
    setError(null)
    const context = await loadPlannerContext(session.user.id)
    const plan = await getOrCreateWeeklyPlan(session.user.id, context, currentWeekStart())
    setState({ context, plan })
  }, [session])

  useEffect(() => {
    let active = true
    void refresh().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load your plan.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  return { session, state, setState, loading, error, setError, busy, setBusy, refresh }
}

function PageStatus({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <section className="page-content"><p role="status">Loading your plan…</p></section>
  if (error) return <section className="page-content"><p className="form-error" role="alert">{error}</p></section>
  return null
}

function TodayWorkout({ workout, guides, onStart }: { workout: PlannedWorkout; guides: Record<string, ExerciseGuide>; onStart: () => void }) {
  return (
    <article className="card plan-card">
      <div className="workout-card-heading">
        <div><p className="eyebrow">{titleCase(workout.category)} · {workout.isOutdoor ? 'Outdoor' : 'Indoor'}</p><h2>{workout.name}</h2></div>
        <span className="duration-pill">{workout.durationMinutes} min</span>
      </div>
      <ol className="workout-preview-list">
        {workout.exercises.map((exercise, index) => <li key={`${exercise.id}-${index}`}>{guides[exercise.slug]?.name ?? exercise.name}</li>)}
      </ol>
      <button className="button button-primary" type="button" onClick={onStart}>Start workout</button>
    </article>
  )
}

export function TodayPage() {
  const { session, state, setState, loading, error, setError, busy, setBusy } = usePlannerState()
  const navigate = useNavigate()
  const today = localDate()
  const workout = state?.plan.workouts.find((item) => item.date === today)
  const unscheduled = state?.plan.unscheduledSessions.find((item) => item.date === today)
  const start = () => { if (workout) navigate(`/workout/${workout.id}`) }

  async function changeWorkout() {
    if (!session || !state || !workout) return
    setBusy(true)
    setError(null)
    try {
      const plan = await regenerateDay(session.user.id, state.context, state.plan, today)
      setState({ ...state, plan })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change today’s workout.')
    } finally { setBusy(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error} />
  return (
    <section className="page-content planner-page" aria-labelledby="today-title">
      <p className="eyebrow">YOUR DAILY PLAN</p>
      <div className="section-heading-row planner-heading"><div><h1 id="today-title">Today</h1><p className="page-intro">{readableDate(today)}</p></div><Link className="text-button" to="/week">View week</Link></div>
      {workout ? <>
        <TodayWorkout workout={workout} guides={state!.context.exercises} onStart={start} />
        {workout.status === 'planned' && <button className="button button-secondary planner-action" type="button" disabled={busy} onClick={() => void changeWorkout()}>{busy ? 'Finding another workout…' : "Change today's workout"}</button>}
      </> : <article className="card empty-state-card"><span className="rest-icon" aria-hidden="true">↟</span><h2>{unscheduled ? 'No workout could be planned' : 'Rest day'}</h2><p>{unscheduled?.message ?? 'There is no workout scheduled for today. Your next planned session is in your week.'}</p><Link className="button button-secondary" to="/week">Open your week</Link></article>}
    </section>
  )
}

const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function WeekPage() {
  const { session, state, setState, loading, error, setError, busy, setBusy, refresh } = usePlannerState()
  const [notice, setNotice] = useState<string | null>(null)
  const [skipTarget, setSkipTarget] = useState<PlannedWorkout | null>(null)
  const weekStart = state?.plan.weekStart ?? currentWeekStart()
  const days = useMemo(() => weekdayLabels.map((label, index) => ({ date: dateFromWeek(weekStart, index), label })), [weekStart])

  async function changeDay(workout: PlannedWorkout) {
    if (!session || !state) return
    setBusy(true); setError(null)
    try { setState({ ...state, plan: await regenerateDay(session.user.id, state.context, state.plan, workout.date) }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change this workout.') }
    finally { setBusy(false) }
  }

  async function refreshWeek() {
    if (!session || !state) return
    const completed = state.plan.workouts.filter((workout) => workout.status === 'completed')
    const message = completed.length
      ? `Regenerate this week's plan? ${completed.length} completed session${completed.length === 1 ? ' will' : 's will'} remain unchanged.`
      : 'Regenerate this week’s plan?'
    if (!window.confirm(message)) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const plan = await regenerateWeek(session.user.id, state.context, state.plan)
      setState({ ...state, plan })
      setNotice(completed.length ? `The week was regenerated. ${completed.length} completed session${completed.length === 1 ? ' was' : 's were'} left unchanged.` : 'Your week was regenerated.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not regenerate your week.') }
    finally { setBusy(false) }
  }

  async function skipWorkout() {
    if (!session || !state || !skipTarget) return
    setBusy(true); setError(null)
    try {
      await skipPlannedWorkout(session.user.id, skipTarget)
      await refresh()
      setSkipTarget(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not skip this workout.') }
    finally { setBusy(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error} />
  return (
    <section className="page-content planner-page" aria-labelledby="week-title">
      <p className="eyebrow">YOUR TRAINING SCHEDULE</p>
      <div className="section-heading-row planner-heading"><div><h1 id="week-title">Your week</h1><p className="page-intro">Week of {readableDate(weekStart, { month: 'long', day: 'numeric' })}</p></div><button className="button button-secondary" type="button" disabled={busy} onClick={() => void refreshWeek()}>{busy ? 'Regenerating…' : 'Regenerate week'}</button></div>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {state?.plan.unscheduledSessions.length ? <div className="form-notice" role="status"><strong>Generated {state.plan.workouts.length} of {state.plan.requestedSessions} requested sessions.</strong><ul>{state.plan.unscheduledSessions.map((item) => <li key={item.date}>{readableDate(item.date)}: {item.message}</li>)}</ul></div> : null}
      <div className="week-list">
        {days.map(({ date, label }) => {
          const workout = state?.plan.workouts.find((item) => item.date === date)
          const statusLabel = workout?.status === 'completed' ? 'Completed' : workout?.status === 'skipped' ? 'Skipped' : workout ? 'Planned' : 'Rest'
          return <article className={`card week-day-card ${workout?.status === 'completed' ? 'is-completed' : ''}`} key={date}>
            <div className="week-day-date"><span>{label}</span><time dateTime={date}>{readableDate(date, { month: 'short', day: 'numeric' })}</time></div>
            <div className="week-day-detail"><span className={`day-status status-${workout?.status ?? 'rest'}`}>{workout?.status === 'completed' ? '✓ Completed' : statusLabel}</span><h2>{workout?.name ?? (state?.plan.unscheduledSessions.some((item) => item.date === date) ? 'Not scheduled' : 'Rest day')}</h2>{workout && <p>{workout.durationMinutes} min · {titleCase(workout.category)} · {workout.isOutdoor ? 'Outdoor' : 'Indoor'}</p>}{!workout && state?.plan.unscheduledSessions.find((item) => item.date === date) && <p>{state.plan.unscheduledSessions.find((item) => item.date === date)?.message}</p>}</div>
            {workout?.status !== 'skipped' && workout && <div className="button-row week-day-actions"><Link className="button button-secondary" to={`/workout/${workout.id}`}>{workout.status === 'completed' ? 'View session' : 'Open workout'}</Link>{workout.status === 'planned' && <><button className="text-button" type="button" disabled={busy} onClick={() => void changeDay(workout)}>Change</button><button className="text-button danger-text" type="button" disabled={busy} onClick={() => setSkipTarget(workout)}>Skip</button></>}</div>}
          </article>
        })}
      </div>
      {skipTarget && <div className="dialog-backdrop" role="presentation"><section className="card confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="skip-title"><h2 id="skip-title">Skip this workout?</h2><p>{skipTarget.name} will be recorded as skipped.</p><div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void skipWorkout()}>Confirm skip</button><button className="button button-secondary" type="button" onClick={() => setSkipTarget(null)}>Keep workout</button></div></section></div>}
    </section>
  )
}

type ExerciseSession = { id: string; position: number; status: 'planned' | 'done' | 'skipped'; exercise_id: string }
type ActiveSession = { id: string; status: 'in_progress' | 'completed' | 'skipped'; started_at: string; completed_at: string | null; actual_duration_minutes: number | null; perceived_exertion: number | null; note: string | null; exercise_sessions: ExerciseSession[] }

export function WorkoutPage() {
  const { id } = useParams()
  const { session, state, loading, error, setError, refresh } = usePlannerState()
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [rpe, setRpe] = useState('')
  const [note, setNote] = useState('')
  const workout = state?.plan.workouts.find((item) => item.id === id)

  const reloadSession = useCallback(async () => {
    if (!session || !id) return
    const next = await loadActiveSession(session.user.id, id)
    setActive(next as unknown as ActiveSession | null)
  }, [session, id])

  useEffect(() => { void reloadSession().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load this workout.')) }, [reloadSession, setError])

  async function start() {
    if (!session || !state || !workout) return
    setStarting(true); setError(null)
    try {
      await startWorkout(session.user.id, workout, state.context.databaseExerciseIds)
      await reloadSession()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start this workout.') }
    finally { setStarting(false) }
  }

  async function markExercise(exerciseSessionId: string, status: 'done' | 'skipped') {
    if (!session) return
    try { await setExerciseStatus(session.user.id, exerciseSessionId, status); await reloadSession() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this exercise.') }
  }

  async function finish() {
    if (!session || !active || !workout) return
    setFinishing(true); setError(null)
    try {
      const actualDurationMinutes = Math.max(0, Math.ceil((Date.now() - new Date(active.started_at).getTime()) / 60_000))
      await completeWorkout(session.user.id, active.id, workout, { actualDurationMinutes, perceivedExertion: rpe ? Number(rpe) : null, note })
      await reloadSession()
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not complete this session.') }
    finally { setFinishing(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error} />
  if (!workout || !state) return <section className="page-content"><h1>Workout unavailable</h1><p>This workout is not part of your current weekly plan.</p><Link to="/week">Return to your week</Link></section>
  const alreadyComplete = active?.status === 'completed' || workout.status === 'completed'
  const doneCount = active?.exercise_sessions.filter((item) => item.status !== 'planned').length ?? 0
  const allExercisesHandled = Boolean(active?.exercise_sessions.length) && doneCount === active?.exercise_sessions.length
  const guides = state.context.exercises

  if (alreadyComplete) return <section className="page-content planner-page" aria-labelledby="completion-title"><p className="eyebrow">SESSION SAVED</p><h1 id="completion-title">Workout complete</h1><article className="card form-card"><h2>{workout.name}</h2><p>Planned duration: {workout.durationMinutes} min</p>{active?.actual_duration_minutes !== null && active?.actual_duration_minutes !== undefined && <p>Actual duration: {active.actual_duration_minutes} min</p>}{active?.perceived_exertion && <p>Effort: {active.perceived_exertion} / 5</p>}{active?.note && <p>{active.note}</p>}<Link className="button button-primary" to="/week">Back to your week</Link></article></section>

  return (
    <section className="page-content planner-page" aria-labelledby="workout-title">
      <p className="eyebrow">{readableDate(workout.date)}</p><h1 id="workout-title">{workout.name}</h1>
      {!active ? <article className="card form-card workout-start-card"><p>{workout.durationMinutes} min · {titleCase(workout.category)} · {workout.isOutdoor ? 'Outdoor' : 'Indoor'}</p><p>{workout.exercises.length} movements. You can mark each one done or skip it; no logging is required.</p><button className="button button-primary" type="button" disabled={starting || workout.status !== 'planned'} onClick={() => void start()}>{starting ? 'Starting…' : 'Start workout'}</button></article> : <>
        {active.status === 'in_progress' && <p className="progress-copy" role="status">{doneCount} of {active.exercise_sessions.length} exercises done or skipped</p>}
        <ol className="execution-list">
          {workout.exercises.map((exercise, index) => {
            const row = active.exercise_sessions.find((item) => item.position === index + 1)
            const guide = guides[exercise.slug]
            const finished = row?.status === 'done' || row?.status === 'skipped'
            return <li className={`card exercise-execution-card ${finished ? 'exercise-finished' : ''}`} key={`${exercise.id}-${index}`}>
              <div className="exercise-execution-heading"><span className="exercise-number">{index + 1}</span><div><h2>{guide?.name ?? exercise.name}</h2><p>{prescription(exercise.prescribedSets, exercise.prescribedReps, exercise.prescribedDurationSeconds)}</p></div>{row?.status === 'done' ? <span className="exercise-state">Done</span> : row?.status === 'skipped' ? <span className="exercise-state">Skipped</span> : null}</div>
              {exercise.restSeconds > 0 && <p className="exercise-rest">Rest {exercise.restSeconds} sec</p>}
              {guide?.equipment.length ? <p className="exercise-equipment">Equipment: {guide.equipment.map((group) => group.join(' or ')).join(' · ')}</p> : null}
              {guide?.instructions && <details className="exercise-instructions"><summary>How to do it</summary><p>{guide.instructions}</p></details>}
              {active.status === 'in_progress' && row && !finished && <div className="button-row exercise-actions"><button className="button button-primary" type="button" onClick={() => void markExercise(row.id, 'done')}>Done</button><button className="button button-secondary" type="button" onClick={() => void markExercise(row.id, 'skipped')}>Skip</button></div>}
            </li>
          })}
        </ol>
        {active.status === 'in_progress' && allExercisesHandled && <article className="card form-card completion-form"><h2>Finish session</h2><p>Planned duration: {workout.durationMinutes} min</p><label className="field-label" htmlFor="perceived-exertion">Perceived exertion <span className="optional-note">(optional, 1–5)</span></label><select id="perceived-exertion" value={rpe} onChange={(event) => setRpe(event.target.value)}><option value="">Skip</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select><label className="field-label" htmlFor="session-note">Note <span className="optional-note">(optional)</span></label><textarea id="session-note" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finish()}>{finishing ? 'Saving session…' : 'Complete workout'}</button></article>}
      </>}
    </section>
  )
}

function prescription(sets: number | null, reps: string | null, duration: number | null) {
  const parts = [sets ? `${sets} sets` : null, reps, duration ? `${duration} sec` : null].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Move at a comfortable pace'
}

