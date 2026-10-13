import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { PlannedWorkout } from '../../planner'
import { generateTodayWorkout } from '../../planner'
import { useAuth } from '../auth/useAuth'
import {
  abandonWorkoutSession, completeWorkout, createStandaloneWorkout,
  deleteTemplate, loadActiveSession, loadPlannerContext, loadSavedTemplates, setExerciseStatus,
  startWorkout, loadStandaloneWorkout,
} from './plannerData'
import type { PlannerContext, SavedTemplate } from './plannerData'
import { useI18n } from '../../lib/i18n'
import { localizeExerciseCopy } from '../../lib/catalogueTranslations'

function localToday() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function titleCase(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) }

export function TrainingPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [context, setContext] = useState<PlannerContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState('30')
  const [outdoor, setOutdoor] = useState(false)
  const [equipment, setEquipment] = useState<string[]>([])
  const [muscleGroup, setMuscleGroup] = useState('')
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const templatesOnly = location.pathname === '/templates'
  useEffect(() => {
    if (!session) return
    void Promise.all([loadPlannerContext(session.user.id), loadSavedTemplates(session.user.id)])
      .then(([nextContext, nextTemplates]) => { setContext(nextContext); setTemplates(nextTemplates) })
      .catch(() => setError('Could not load your templates.')).finally(() => setLoading(false))
  }, [session])

  async function createGenerated() {
    if (!session || !context) return
    setBusy(true); setError(null)
    try {
      const workout = generateTodayWorkout(localToday(), context.input, { durationMinutes: Number(duration), outdoor, ...(outdoor ? {} : { equipment, muscleGroup }) })
      if (!workout) throw new Error(outdoor ? 'Easy walk is unavailable.' : 'No workout matches these choices.')
      const savedWorkout = await createStandaloneWorkout(session.user.id, workout)
      navigate(`/workout/${savedWorkout.id}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create your workout.') }
    finally { setBusy(false) }
  }

  async function removeTemplate(template: SavedTemplate) {
    if (!session || !window.confirm(t('Delete this template?'))) return
    try { await deleteTemplate(session.user.id, template.id); setTemplates((items) => items.filter((item) => item.id !== template.id)) }
    catch { setError('Could not delete the template.') }
  }

  if (loading) return <section className="page-content"><p role="status">{t('Loading your templates…')}</p></section>
  return <section className={`page-content planner-page ${templatesOnly ? 'templates-page' : 'training-page'}`} aria-labelledby="training-title">
    <p className="eyebrow">{t(templatesOnly ? 'YOUR ROUTINES' : 'DAILY MOVEMENT')}</p>
    <div className="section-heading-row planner-heading"><div><h1 id="training-title">{t(templatesOnly ? 'Routines' : 'Train')}</h1><p className="page-intro">{t(templatesOnly ? 'Choose a saved routine to repeat.' : 'Choose how you want to move today.')}</p></div></div>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    {!templatesOnly && <div className="training-quick-actions"><button className="button button-primary" type="button" onClick={() => setShowGenerator((value) => !value)}>{t('Create workout')}</button><button className="button button-secondary" type="button" onClick={() => navigate('/templates')}>{t('Use a template')}</button></div>}
    {showGenerator && context && <section className="card form-card generator-panel"><h2>{t('Create workout')}</h2><label className="field-label" htmlFor="training-duration">{t('Available time')}</label><select id="training-duration" value={duration} onChange={(event) => setDuration(event.target.value)}>{Array.from({ length: 48 }, (_, index) => (index + 1) * 5).map((value) => <option key={value} value={value}>{value} {t('min')}</option>)}</select><label className="check-option full-option"><input type="checkbox" checked={outdoor} onChange={(event) => setOutdoor(event.target.checked)} /><span>{t('Outdoor walk')}</span></label>{!outdoor && <><label className="field-label" htmlFor="training-muscle">{t('Muscle group')} <span className="optional-note">{t('(optional)')}</span></label><select id="training-muscle" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}><option value="">{t('Any muscle group')}</option>{['legs', 'push', 'pull', 'core', 'cardio', 'mobility'].map((muscle) => <option key={muscle} value={muscle}>{t(titleCase(muscle))}</option>)}</select><fieldset className="today-equipment-options"><legend>{t('Equipment')}</legend>{context.input.equipment.length ? context.input.equipment.map((item, index) => <label className="checkbox-row" key={item}><input type="checkbox" checked={equipment.includes(item)} onChange={(event) => setEquipment((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{context.equipmentLabels[index] ?? item}</label>) : <p>{t('No equipment is saved in your profile; bodyweight workouts are still available.')}</p>}</fieldset></>}
      <div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void createGenerated()}>{busy ? t('Creating workout…') : t('Create workout')}</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => setShowGenerator(false)}>{t('Cancel')}</button></div>
    </section>}
    {templatesOnly && <section className="templates-section"><div className="section-heading-row"><h2>{t('My routines')}</h2><button className="button button-secondary" type="button" onClick={() => navigate('/templates/new')}>＋ {t('New')}</button></div>
      {templates.length === 0 ? <article className="card empty-state-card"><h3>{t('No templates yet')}</h3><p>{t('Save a group of exercises to repeat it whenever you want.')}</p></article> : <div className="template-card-grid">{templates.map((template) => <article className="card template-card" key={template.id} role="button" tabIndex={0} onClick={() => navigate(`/templates/${template.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(`/templates/${template.id}`) }}><div className="template-card-heading"><h3>{template.name}</h3><div className="template-menu-wrap"><button className="template-menu-button" type="button" aria-label={t('More options')} onClick={(event) => { event.stopPropagation(); setOpenMenuId((current) => current === template.id ? null : template.id) }}>⋮</button>{openMenuId === template.id && <div className="template-menu" role="menu"><button type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); void removeTemplate(template); setOpenMenuId(null) }}>{t('Delete')}</button></div>}</div></div><p className="template-exercise-preview">{template.exercises.slice(0, 2).map((exercise) => exercise.name).join(', ')}{template.exercises.length > 2 ? ', …' : ''}</p><span className="template-meta">{template.duration_minutes} {t('min')} · {template.exercises.length} {t('exercises')}</span></article>)}</div>}
    </section>}
  </section>
}

type ExerciseSession = { id: string; position: number; status: 'planned' | 'done' | 'skipped'; exercise_id: string }
type ActiveSession = { id: string; status: 'in_progress' | 'completed' | 'skipped'; started_at: string; completed_at: string | null; actual_duration_minutes: number | null; perceived_exertion: number | null; note: string | null; exercise_sessions: ExerciseSession[] }

export function WorkoutPage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [context, setContext] = useState<PlannerContext | null>(null)
  const [workout, setWorkout] = useState<PlannedWorkout | null>(null)
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [rpe, setRpe] = useState('')
  const [note, setNote] = useState('')

  const reload = useCallback(async () => {
    if (!session || !id) return
    const [nextContext, nextWorkout, nextSession] = await Promise.all([loadPlannerContext(session.user.id), loadStandaloneWorkout(session.user.id, id), loadActiveSession(session.user.id, id)])
    setContext(nextContext); setWorkout(nextWorkout); setActive(nextSession as unknown as ActiveSession | null)
  }, [session, id])
  useEffect(() => { let alive = true; void reload().catch(() => { if (alive) setError('Could not load this workout.') }).finally(() => { if (alive) setLoading(false) }); return () => { alive = false } }, [reload])

  async function start() {
    if (!session || !workout || !context) return
    setStarting(true); setError(null)
    try { await startWorkout(session.user.id, workout, context.databaseExerciseIds); await reload() }
    catch { setError('Could not start this workout.') }
    finally { setStarting(false) }
  }
  async function markExercise(exerciseSessionId: string, status: 'done' | 'skipped') {
    if (!session) return
    try { await setExerciseStatus(session.user.id, exerciseSessionId, status); await reload() }
    catch { setError('Could not save this exercise.') }
  }
  const doneCount = active?.exercise_sessions.filter((item) => item.status === 'done').length ?? 0
  const handledCount = active?.exercise_sessions.filter((item) => item.status !== 'planned').length ?? 0
  const allExercisesHandled = Boolean(active?.exercise_sessions.length) && handledCount === active?.exercise_sessions.length
  async function finish() {
    if (!session || !active || !workout) return
    setFinishing(true); setError(null)
    try { const minutes = Math.max(0, Math.ceil((Date.now() - new Date(active.started_at).getTime()) / 60_000)); await completeWorkout(session.user.id, active.id, workout, { actualDurationMinutes: minutes, perceivedExertion: rpe ? Number(rpe) : null, note }); await reload() }
    catch { setError('Could not complete this session.') }
    finally { setFinishing(false) }
  }
  async function endSkipped() {
    if (!session || !active || !workout || !window.confirm(t('End this session without completing an exercise?'))) return
    setFinishing(true)
    try { await abandonWorkoutSession(session.user.id, active.id, workout); await reload(); navigate('/today') }
    catch { setError('Could not save this session as skipped.') }
    finally { setFinishing(false) }
  }

  if (loading) return <section className="page-content"><p role="status">{t('Loading your plan…')}</p></section>
  if (!workout || !context) return <section className="page-content"><h1>{t('Workout unavailable')}</h1><p>{t('This workout could not be found.')}</p><Link to="/today">{t('Train')}</Link></section>
  const alreadyComplete = active?.status === 'completed' || workout.status === 'completed'
  const guides = context.exercises
  if (error) return <section className="page-content"><p className="form-error" role="alert">{t(error)}</p><Link to="/today">{t('Train')}</Link></section>
  if (alreadyComplete) return <section className="page-content planner-page"><p className="eyebrow">{t('SESSION SAVED')}</p><h1>{t('Workout complete')}</h1><article className="card form-card"><h2>{t(workout.name)}</h2><p>{t('Planned duration:')} {workout.durationMinutes} {t('min')}</p>{active?.actual_duration_minutes != null && <p>{t('Actual duration:')} {active.actual_duration_minutes} {t('min')}</p>}{active?.note && <p>{active.note}</p>}<Link className="button button-primary" to="/today">{t('Train')}</Link></article></section>

  return <section className="page-content planner-page" aria-labelledby="workout-title"><p className="eyebrow">{new Intl.DateTimeFormat(language, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${workout.date}T12:00:00`))}</p><h1 id="workout-title">{t(workout.name)}</h1>
    {!active ? <article className="card form-card workout-start-card"><p>{workout.durationMinutes} {t('min')} · {t(titleCase(workout.category))} · {t(workout.isOutdoor ? 'Outdoor' : 'Indoor')}</p><p>{workout.exercises.length} {t('movements. You can mark each one done or skip it; no logging is required.')}</p><button className="button button-primary" type="button" disabled={starting} onClick={() => void start()}>{starting ? t('Starting…') : t('Start workout')}</button></article> : <>
      {active.status === 'in_progress' && <p className="progress-copy" role="status">{handledCount} {t('of')} {active.exercise_sessions.length} {t('exercises done or skipped')}</p>}
      <ol className="execution-list">{workout.exercises.map((exercise, index) => { const row = active.exercise_sessions.find((item) => item.position === index + 1); const guide = guides[exercise.slug]; const copy = localizeExerciseCopy(exercise.slug, language); const finished = row?.status === 'done' || row?.status === 'skipped'; return <li className={`card exercise-execution-card ${finished ? 'exercise-finished' : ''}`} key={`${exercise.id}-${index}`}><div className="exercise-execution-heading"><span className="exercise-number">{index + 1}</span><div><h2>{copy?.name ?? guide?.name ?? exercise.name}</h2><p>{prescription(exercise.prescribedSets, exercise.prescribedReps, exercise.prescribedDurationSeconds, t)}</p>{context.databaseExerciseIds[exercise.slug] && <Link to={`/exercises/${context.databaseExerciseIds[exercise.slug]}`} state={{ returnTo: location.pathname }}>{t('Exercise tutorial')}</Link>}</div>{row?.status === 'done' ? <span className="exercise-state">{t('Done')}</span> : row?.status === 'skipped' ? <span className="exercise-state">{t('Skipped')}</span> : null}</div>{exercise.restSeconds > 0 && <p className="exercise-rest">{t('Rest')} {exercise.restSeconds} {t('sec')}</p>}{guide?.equipment.length ? <p className="exercise-equipment">{t('Equipment:')} {guide.equipment.map((group) => group.join(` ${t('or')} `)).join(' · ')}</p> : null}{(copy?.instructions ?? guide?.instructions) && <details className="exercise-instructions"><summary>{t('How to do it')}</summary><p>{copy?.instructions ?? guide?.instructions}</p></details>}{active.status === 'in_progress' && row && (!finished || row.status === 'skipped') && <div className="button-row exercise-actions">{row.status === 'skipped' ? <button className="button button-primary" type="button" onClick={() => void markExercise(row.id, 'done')}>{t('Mark as done')}</button> : <><button className="button button-primary" type="button" onClick={() => void markExercise(row.id, 'done')}>{t('Done')}</button><button className="button button-secondary" type="button" onClick={() => void markExercise(row.id, 'skipped')}>{t('Skip')}</button></>}</div>}</li> })}</ol>
      {active.status === 'in_progress' && allExercisesHandled && doneCount === 0 && <article className="card form-card completion-form"><h2>{t('No exercise completed')}</h2><p>{t('Mark at least one exercise as done to complete a training activity.')}</p><button className="button button-secondary" type="button" disabled={finishing} onClick={() => void endSkipped()}>{t('End session as skipped')}</button></article>}
      {active.status === 'in_progress' && allExercisesHandled && doneCount > 0 && <article className="card form-card completion-form"><h2>{t('Finish session')}</h2><p>{t('Planned duration:')} {workout.durationMinutes} min</p><label className="field-label" htmlFor="perceived-exertion">{t('Perceived exertion')} <span className="optional-note">{t('(optional, 1–5)')}</span></label><select id="perceived-exertion" value={rpe} onChange={(event) => setRpe(event.target.value)}><option value="">{t('Skip')}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select><label className="field-label" htmlFor="session-note">{t('Note')} <span className="optional-note">{t('(optional)')}</span></label><textarea id="session-note" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finish()}>{finishing ? t('Saving session…') : t('Complete workout')}</button></article>}
    </>}
  </section>
}

function prescription(sets: number | null, reps: string | null, duration: number | null, t: (value: string) => string) {
  const parts = [sets ? `${sets} ${t('sets')}` : null, reps, duration ? `${duration} ${t('sec')}` : null].filter(Boolean)
  return parts.length ? parts.join(' · ') : t('Move at a comfortable pace')
}

// Compatibility exports for existing consumers while the weekly view is retired.
export const TodayPage = TrainingPage
export const WeekPage = TrainingPage
