import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { PlannedWorkout, WeeklyPlan } from '../../planner'
import type { UnscheduledReason } from '../../planner/types'
import { useAuth } from '../auth/useAuth'
import {
  completeWorkout,
  createTodayWorkout,
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
import { useI18n } from '../../lib/i18n'
import { localizeExerciseCopy } from '../../lib/catalogueTranslations'
import { localizeEquipmentName } from '../../lib/catalogueTranslations'
import { exercises as catalogueExercises } from '../../planner/catalogue'

type PlannerState = { context: PlannerContext; plan: WeeklyPlan }

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateFromWeek(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return localDate(date)
}

function readableDate(value: string, language: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language, options ?? { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
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
    void refresh().catch(() => {
      if (active) setError('Could not load your plan.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  return { session, state, setState, loading, error, setError, busy, setBusy, refresh }
}

function PageStatus({ loading, error, t }: { loading: boolean; error: string | null; t: (value: string) => string }) {
  if (loading) return <section className="page-content"><p role="status">{t('Loading your plan…')}</p></section>
  if (error) return <section className="page-content"><p className="form-error" role="alert">{error}</p></section>
  return null
}

function TodayWorkout({ workout, guides, databaseExerciseIds, onStart, returnTo }: { workout: PlannedWorkout; guides: Record<string, ExerciseGuide>; databaseExerciseIds: Record<string, string>; onStart: () => void; returnTo: string }) {
  const { t, language } = useI18n()
  return (
    <article className="card plan-card">
      <div className="workout-card-heading">
        <div><p className="eyebrow">{t(titleCase(workout.category))} · {t(workout.isOutdoor ? 'Outdoor' : 'Indoor')}</p><h2>{t(workout.name)}</h2></div>
        <span className="duration-pill">{workout.durationMinutes} min</span>
      </div>
      <ol className="workout-preview-list">
        {workout.exercises.map((exercise, index) => <li key={`${exercise.id}-${index}`}>{localizeExerciseCopy(exercise.slug, language)?.name ?? guides[exercise.slug]?.name ?? exercise.name}{databaseExerciseIds?.[exercise.slug] && <> · <Link to={`/exercises/${databaseExerciseIds[exercise.slug]}`} state={{ returnTo }}>{t('Tutorial')}</Link></>}</li>)}
      </ol>
      <button className="button button-primary" type="button" onClick={onStart}>{t('Start workout')}</button>
    </article>
  )
}

export function TodayPage() {
  const { t, language } = useI18n()
  const { session, state, setState, loading, error, busy, setBusy } = usePlannerState()
  const navigate = useNavigate()
  const location = useLocation()
  const today = localDate()
  const workout = state?.plan.workouts.find((item) => item.date === today)
  const unscheduled = state?.plan.unscheduledSessions.find((item) => item.date === today)
  const [showChangeDialog, setShowChangeDialog] = useState(false)
  const [outdoorChoice, setOutdoorChoice] = useState<boolean | null>(null)
  const [duration, setDuration] = useState('30')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [dialogError, setDialogError] = useState<string | null>(null)
  const start = () => { if (workout) navigate(`/workout/${workout.id}`) }

  function openChangeDialog() {
    setOutdoorChoice(null)
    setDuration(String(state?.context.input.availability.durationMinutes ?? 30))
    setMuscleGroup('')
    setEquipment([])
    setDialogError(null)
    setShowChangeDialog(true)
  }

  async function createWorkout() {
    if (!session || !state || outdoorChoice === null) return
    setBusy(true)
    setDialogError(null)
    try {
      const plan = await createTodayWorkout(session.user.id, state.context, state.plan, today, {
        durationMinutes: Number(duration), outdoor: outdoorChoice,
        ...(outdoorChoice || !muscleGroup ? {} : { muscleGroup }),
        ...(outdoorChoice || !equipment.length ? {} : { equipment }),
      })
      setState({ ...state, plan })
      setShowChangeDialog(false)
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Could not create today’s workout.')
    } finally { setBusy(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error ? t(error) : null} t={t} />
  return (
    <section className="page-content planner-page" aria-labelledby="today-title">
      <p className="eyebrow">{t('YOUR DAILY PLAN')}</p>
      <div className="section-heading-row planner-heading"><div><h1 id="today-title">{t('Today')}</h1><p className="page-intro">{readableDate(today, language)}</p></div><Link className="text-button" to="/week">{t('View week')}</Link></div>
      {workout ? <>
        <TodayWorkout workout={workout} guides={state!.context.exercises} databaseExerciseIds={state!.context.databaseExerciseIds} onStart={start} returnTo={location.pathname} />
        {workout.status === 'planned' && <button className="button button-secondary planner-action" type="button" disabled={busy} onClick={openChangeDialog}>{t("Change today's workout")}</button>}
      </> : <article className="card empty-state-card"><span className="rest-icon" aria-hidden="true">↟</span><h2>{t(unscheduled ? 'No workout could be planned' : 'Rest day')}</h2><p>{unscheduled ? describeUnscheduled(unscheduled.reasons, t) : t('No workout is scheduled for today. Your next planned session is in your week.')}</p><div className="button-row"><button className="button button-primary" type="button" onClick={openChangeDialog}>{t('Create a workout for today')}</button><Link className="button button-secondary" to="/week">{t('Open your week')}</Link></div></article>}
      {showChangeDialog && <div className="dialog-backdrop" role="presentation"><section className="card today-workout-dialog" role="dialog" aria-modal="true" aria-labelledby="today-config-title"><h2 id="today-config-title">{t('Create a workout for today')}</h2>{outdoorChoice === null ? <fieldset><legend>{t('Can you exercise outdoors today?')}</legend><div className="button-row"><button className="button button-secondary" type="button" onClick={() => setOutdoorChoice(true)}>{t('Yes, outdoors')}</button><button className="button button-secondary" type="button" onClick={() => setOutdoorChoice(false)}>{t('No, indoors')}</button></div></fieldset> : <>
        {outdoorChoice && <p>{t('We’ll suggest an easy walk. Muscle and equipment choices are not needed.')}</p>}
        <label className="field-label" htmlFor="today-duration">{t('Available time')}</label><select id="today-duration" value={duration} onChange={(event) => setDuration(event.target.value)}>{Array.from({ length: 48 }, (_, index) => (index + 1) * 5).map((value) => <option key={value} value={value}>{value} {t('min')}</option>)}</select>
        {!outdoorChoice && <>
          <label className="field-label" htmlFor="today-muscle">{t('Muscle group')} <span className="optional-note">{t('(optional)')}</span></label><select id="today-muscle" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}><option value="">{t('Any muscle group')}</option>{[...new Set(catalogueExercises.flatMap((item) => item.muscleGroups))].sort().map((muscle) => <option key={muscle} value={muscle}>{t(titleCase(muscle))}</option>)}</select>
          <fieldset className="today-equipment-options"><legend>{t('Equipment')} <span className="optional-note">{t('(optional)')}</span></legend>{state?.context.input.equipment.length ? state.context.input.equipment.map((slug, index) => <label className="checkbox-row" key={slug}><input type="checkbox" checked={equipment.includes(slug)} onChange={(event) => setEquipment((current) => event.target.checked ? [...current, slug] : current.filter((item) => item !== slug))} />{localizeEquipmentName(slug, state.context.equipmentLabels[index] ?? titleCase(slug), language)}</label>) : <p>{t('No equipment is saved in your profile; bodyweight workouts are still available.')}</p>}</fieldset>
        </>}
        {dialogError && <p className="form-error" role="alert">{t(dialogError)}</p>}
        <div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void createWorkout()}>{busy ? t('Creating workout…') : t('Create workout')}</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => setShowChangeDialog(false)}>{t('Cancel')}</button></div>
      </>}</section></div>}
    </section>
  )
}

const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function WeekPage() {
  const { t, language } = useI18n()
  const { session, state, setState, loading, error, setError, busy, setBusy, refresh } = usePlannerState()
  const [notice, setNotice] = useState<string | null>(null)
  const [skipTarget, setSkipTarget] = useState<PlannedWorkout | null>(null)
  const weekStart = state?.plan.weekStart ?? currentWeekStart()
  const days = useMemo(() => weekdayLabels.map((label, index) => ({ date: dateFromWeek(weekStart, index), label })), [weekStart])

  async function changeDay(workout: PlannedWorkout) {
    if (!session || !state) return
    setBusy(true); setError(null)
    try { setState({ ...state, plan: await regenerateDay(session.user.id, state.context, state.plan, workout.date) }) }
    catch { setError('Could not change this workout.') }
    finally { setBusy(false) }
  }

  async function refreshWeek() {
    if (!session || !state) return
    const completed = state.plan.workouts.filter((workout) => workout.status === 'completed')
    const message = completed.length
      ? `${t('Regenerate this week’s plan?')} ${completed.length} ${t(completed.length === 1 ? 'completed session' : 'completed sessions')} ${t('will remain unchanged.')}`
      : t('Regenerate this week’s plan?')
    if (!window.confirm(message)) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const plan = await regenerateWeek(session.user.id, state.context, state.plan)
      setState({ ...state, plan })
      setNotice(completed.length ? `${t('The week was regenerated.')} ${completed.length} ${t(completed.length === 1 ? 'completed session' : 'completed sessions')} ${t(completed.length === 1 ? 'was left unchanged.' : 'were left unchanged.')}` : t('Your week was regenerated.'))
    } catch { setError('Could not regenerate your week.') }
    finally { setBusy(false) }
  }

  async function skipWorkout() {
    if (!session || !state || !skipTarget) return
    setBusy(true); setError(null)
    try {
      await skipPlannedWorkout(session.user.id, skipTarget)
      await refresh()
      setSkipTarget(null)
    } catch { setError('Could not skip this workout.') }
    finally { setBusy(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error ? t(error) : null} t={t} />
  return (
    <section className="page-content planner-page" aria-labelledby="week-title">
      <p className="eyebrow">{t('YOUR TRAINING SCHEDULE')}</p>
      <div className="section-heading-row planner-heading"><div><h1 id="week-title">{t('Your week')}</h1><p className="page-intro">{t('Week of')} {readableDate(weekStart, language, { month: 'long', day: 'numeric' })}</p></div><button className="button button-secondary" type="button" disabled={busy} onClick={() => void refreshWeek()}>{busy ? t('Regenerating…') : t('Regenerate week')}</button></div>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {state?.plan.unscheduledSessions.length ? <div className="form-notice" role="status"><strong>{t('Generated')} {state.plan.workouts.length} {t('of')} {state.plan.requestedSessions} {t('requested sessions.')}</strong><ul>{state.plan.unscheduledSessions.map((item) => <li key={item.date}>{readableDate(item.date, language)}: {describeUnscheduled(item.reasons, t)}</li>)}</ul></div> : null}
      <div className="week-list">
        {days.map(({ date, label }) => {
          const workout = state?.plan.workouts.find((item) => item.date === date)
          const statusLabel = workout?.status === 'completed' ? t('Completed') : workout?.status === 'skipped' ? t('Skipped') : workout ? t('Planned') : t('Rest')
          return <article className={`card week-day-card ${workout?.status === 'completed' ? 'is-completed' : ''}`} key={date}>
            <div className="week-day-date"><span>{t(label)}</span><time dateTime={date}>{readableDate(date, language, { month: 'short', day: 'numeric' })}</time></div>
            <div className="week-day-detail"><span className={`day-status status-${workout?.status ?? 'rest'}`}>{workout?.status === 'completed' ? `✓ ${t('Completed')}` : statusLabel}</span><h2>{workout ? t(workout.name) : state?.plan.unscheduledSessions.some((item) => item.date === date) ? t('Not scheduled') : t('Rest day')}</h2>{workout && <p>{workout.durationMinutes} min · {t(titleCase(workout.category))} · {t(workout.isOutdoor ? 'Outdoor' : 'Indoor')}</p>}{!workout && state?.plan.unscheduledSessions.find((item) => item.date === date) && <p>{describeUnscheduled(state.plan.unscheduledSessions.find((item) => item.date === date)!.reasons, t)}</p>}</div>
            {workout?.status !== 'skipped' && workout && <div className="button-row week-day-actions"><Link className="button button-secondary" to={`/workout/${workout.id}`}>{workout.status === 'completed' ? t('View session') : t('Open workout')}</Link>{workout.status === 'planned' && <><button className="text-button" type="button" disabled={busy} onClick={() => void changeDay(workout)}>{t('Change')}</button><button className="text-button" type="button" disabled={busy} onClick={() => setSkipTarget(workout)}>{t('Skip')}</button></>}</div>}
          </article>
        })}
      </div>
      {skipTarget && <div className="dialog-backdrop" role="presentation"><section className="card confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="skip-title"><h2 id="skip-title">{t('Skip this workout?')}</h2><p>{t(skipTarget.name)} {t('will be recorded as skipped.')}</p><div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void skipWorkout()}>{t('Confirm skip')}</button><button className="button button-secondary" type="button" onClick={() => setSkipTarget(null)}>{t('Keep workout')}</button></div></section></div>}
    </section>
  )
}

type ExerciseSession = { id: string; position: number; status: 'planned' | 'done' | 'skipped'; exercise_id: string }
type ActiveSession = { id: string; status: 'in_progress' | 'completed' | 'skipped'; started_at: string; completed_at: string | null; actual_duration_minutes: number | null; perceived_exertion: number | null; note: string | null; exercise_sessions: ExerciseSession[] }

export function WorkoutPage() {
  const { t, language } = useI18n()
  const { id } = useParams()
  const location = useLocation()
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

  useEffect(() => { void reloadSession().catch(() => setError('Could not load this workout.')) }, [reloadSession, setError])

  async function start() {
    if (!session || !state || !workout) return
    setStarting(true); setError(null)
    try {
      await startWorkout(session.user.id, workout, state.context.databaseExerciseIds)
      await reloadSession()
    } catch { setError('Could not start this workout.') }
    finally { setStarting(false) }
  }

  async function markExercise(exerciseSessionId: string, status: 'done' | 'skipped') {
    if (!session) return
    try { await setExerciseStatus(session.user.id, exerciseSessionId, status); await reloadSession() }
    catch { setError('Could not save this exercise.') }
  }

  async function finish() {
    if (!session || !active || !workout) return
    setFinishing(true); setError(null)
    try {
      const actualDurationMinutes = Math.max(0, Math.ceil((Date.now() - new Date(active.started_at).getTime()) / 60_000))
      await completeWorkout(session.user.id, active.id, workout, { actualDurationMinutes, perceivedExertion: rpe ? Number(rpe) : null, note })
      await reloadSession()
      await refresh()
    } catch { setError('Could not complete this session.') }
    finally { setFinishing(false) }
  }

  if (loading || error) return <PageStatus loading={loading} error={error ? t(error) : null} t={t} />
  if (!workout || !state) return <section className="page-content"><h1>{t('Workout unavailable')}</h1><p>{t('This workout is not part of your current weekly plan.')}</p><Link to="/week">{t('Return to your week')}</Link></section>
  const alreadyComplete = active?.status === 'completed' || workout.status === 'completed'
  const doneCount = active?.exercise_sessions.filter((item) => item.status !== 'planned').length ?? 0
  const allExercisesHandled = Boolean(active?.exercise_sessions.length) && doneCount === active?.exercise_sessions.length
  const guides = state.context.exercises

  if (alreadyComplete) return <section className="page-content planner-page" aria-labelledby="completion-title"><p className="eyebrow">{t('SESSION SAVED')}</p><h1 id="completion-title">{t('Workout complete')}</h1><article className="card form-card"><h2>{t(workout.name)}</h2><p>{t('Planned duration:')} {workout.durationMinutes} {t('min')}</p>{active?.actual_duration_minutes !== null && active?.actual_duration_minutes !== undefined && <p>{t('Actual duration:')} {active.actual_duration_minutes} {t('min')}</p>}{active?.perceived_exertion && <p>{t('Effort:')} {active.perceived_exertion} / 5</p>}{active?.note && <p>{active.note}</p>}<Link className="button button-primary" to="/week">{t('Back to your week')}</Link></article></section>

  return (
    <section className="page-content planner-page" aria-labelledby="workout-title">
      <p className="eyebrow">{readableDate(workout.date, language)}</p><h1 id="workout-title">{t(workout.name)}</h1>
      {!active ? <article className="card form-card workout-start-card"><p>{workout.durationMinutes} {t('min')} · {t(titleCase(workout.category))} · {t(workout.isOutdoor ? 'Outdoor' : 'Indoor')}</p><p>{workout.exercises.length} {t('movements. You can mark each one done or skip it; no logging is required.')}</p><button className="button button-primary" type="button" disabled={starting || workout.status !== 'planned'} onClick={() => void start()}>{starting ? t('Starting…') : t('Start workout')}</button></article> : <>
        {active.status === 'in_progress' && <p className="progress-copy" role="status">{doneCount} {t('of')} {active.exercise_sessions.length} {t('exercises done or skipped')}</p>}
        <ol className="execution-list">
          {workout.exercises.map((exercise, index) => {
            const row = active.exercise_sessions.find((item) => item.position === index + 1)
            const guide = guides[exercise.slug]
            const exerciseCopy = localizeExerciseCopy(exercise.slug, language)
            const finished = row?.status === 'done' || row?.status === 'skipped'
            return <li className={`card exercise-execution-card ${finished ? 'exercise-finished' : ''}`} key={`${exercise.id}-${index}`}>
              <div className="exercise-execution-heading"><span className="exercise-number">{index + 1}</span><div><h2>{exerciseCopy?.name ?? guide?.name ?? exercise.name}</h2><p>{prescription(exercise.prescribedSets, exercise.prescribedReps, exercise.prescribedDurationSeconds, t)}</p>{state.context.databaseExerciseIds?.[exercise.slug] && <Link to={`/exercises/${state.context.databaseExerciseIds[exercise.slug]}`} state={{ returnTo: location.pathname }}>{t('Exercise tutorial')}</Link>}</div>{row?.status === 'done' ? <span className="exercise-state">{t('Done')}</span> : row?.status === 'skipped' ? <span className="exercise-state">{t('Skipped')}</span> : null}</div>
              {exercise.restSeconds > 0 && <p className="exercise-rest">{t('Rest')} {exercise.restSeconds} {t('sec')}</p>}
              {guide?.equipment.length ? <p className="exercise-equipment">{t('Equipment:')} {guide.equipment.map((group) => group.join(` ${t('or')} `)).join(' · ')}</p> : null}
              {(exerciseCopy?.instructions ?? guide?.instructions) && <details className="exercise-instructions"><summary>{t('How to do it')}</summary><p>{exerciseCopy?.instructions ?? guide?.instructions}</p></details>}
              {active.status === 'in_progress' && row && !finished && <div className="button-row exercise-actions"><button className="button button-primary" type="button" onClick={() => void markExercise(row.id, 'done')}>{t('Done')}</button><button className="button button-secondary" type="button" onClick={() => void markExercise(row.id, 'skipped')}>{t('Skip')}</button></div>}
            </li>
          })}
        </ol>
        {active.status === 'in_progress' && allExercisesHandled && <article className="card form-card completion-form"><h2>{t('Finish session')}</h2><p>{t('Planned duration:')} {workout.durationMinutes} min</p><label className="field-label" htmlFor="perceived-exertion">{t('Perceived exertion')} <span className="optional-note">{t('(optional, 1–5)')}</span></label><select id="perceived-exertion" value={rpe} onChange={(event) => setRpe(event.target.value)}><option value="">{t('Skip')}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select><label className="field-label" htmlFor="session-note">{t('Note')} <span className="optional-note">{t('(optional)')}</span></label><textarea id="session-note" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finish()}>{finishing ? t('Saving session…') : t('Complete workout')}</button></article>}
      </>}
    </section>
  )
}

function prescription(sets: number | null, reps: string | null, duration: number | null, t: (value: string) => string) {
  const localizedReps = reps?.replace('each side', t('each side')).replace('alternating', t('alternating')) ?? null
  const parts = [sets ? `${sets} ${t('sets')}` : null, localizedReps, duration ? `${duration} ${t('sec')}` : null].filter(Boolean)
  return parts.length ? parts.join(' · ') : t('Move at a comfortable pace')
}

function describeUnscheduled(reasons: UnscheduledReason[], t: (value: string) => string) {
  const descriptions: Record<UnscheduledReason, string> = {
    'date-blocked': 'The date is blocked from scheduling.', duration: 'No available session fits the requested duration.',
    equipment: 'Available equipment does not satisfy any session.', 'excluded-exercise': 'Exercise exclusions prevent every available session.',
    'outdoor-access': 'Outdoor access is required by the available sessions.', 'inactive-exercise': 'No active catalogue session satisfies the constraints.',
    'no-candidate': 'No session satisfies the current planning constraints.',
  }
  return `${t('Could not generate this requested session:')} ${reasons.map((reason) => t(descriptions[reason])).join(' ')}`
}

