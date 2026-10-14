import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { PlannedWorkout } from '../../planner'
import { generateTodayWorkout } from '../../planner'
import { useAuth } from '../auth/useAuth'
import {
  abandonWorkoutSession, completeWorkout, createStandaloneWorkout,
  deleteTemplate, deleteResource, loadActiveSession, loadPlannerContext, loadSavedResources, loadSavedTemplates, saveResource, setExerciseStatus, toggleResourceFavorite, toggleTemplateFavorite,
  startWorkout, loadStandaloneWorkout,
} from './plannerData'
import type { PlannerContext, SavedResource, SavedTemplate } from './plannerData'
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
  const [resources, setResources] = useState<SavedResource[]>([])
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [resourceBusy, setResourceBusy] = useState(false)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceTitle, setResourceTitle] = useState('')
  const templatesOnly = location.pathname === '/templates'
  useEffect(() => {
    if (!session) return
    void Promise.all([loadPlannerContext(session.user.id), loadSavedTemplates(session.user.id), loadSavedResources(session.user.id)])
      .then(([nextContext, nextTemplates, nextResources]) => { setContext(nextContext); setTemplates(nextTemplates); setResources(nextResources) })
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

  async function addResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setResourceBusy(true); setResourceError(null)
    try {
      const resource = await saveResource(session.user.id, { url: resourceUrl, title: resourceTitle })
      setResources((items) => [resource, ...items]); setResourceUrl(''); setResourceTitle(''); setResourceModalOpen(false)
    } catch (cause) { setResourceError(cause instanceof Error ? cause.message : 'Could not save the resource.') }
    finally { setResourceBusy(false) }
  }

  async function removeResource(resource: SavedResource) {
    if (!session || !window.confirm(t('Delete this resource?'))) return
    try { await deleteResource(session.user.id, resource.id); setResources((items) => items.filter((item) => item.id !== resource.id)) }
    catch { setError('Could not delete the resource.') }
  }

  async function favoriteTemplate(template: SavedTemplate) {
    if (!session) return
    const next = !template.is_favorite
    try { await toggleTemplateFavorite(session.user.id, template.id, next); setTemplates((items) => items.map((item) => item.id === template.id ? { ...item, is_favorite: next } : item)) }
    catch { setError('Could not update favorite.') }
  }

  async function favoriteResource(resource: SavedResource) {
    if (!session) return
    const next = !resource.is_favorite
    try { await toggleResourceFavorite(session.user.id, resource.id, next); setResources((items) => items.map((item) => item.id === resource.id ? { ...item, is_favorite: next } : item)) }
    catch { setError('Could not update favorite.') }
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
    {templatesOnly && <>
      <section className="templates-section"><div className="section-heading-row"><h2>{t('My templates')}</h2><div className="collection-actions"><button className="button button-secondary" type="button" onClick={() => navigate('/templates/new')}>＋ {t('New template')}</button><button className="text-button" type="button" onClick={() => navigate('/templates/collection')}>{t('View all templates')} →</button></div></div>
        {templates.filter((item) => item.is_favorite).length ? <div className="template-card-grid">{templates.filter((item) => item.is_favorite).slice(0, 4).map((template) => <TemplateCard key={template.id} template={template} onOpen={() => navigate(`/templates/${template.id}`)} onFavorite={() => void favoriteTemplate(template)} onDelete={() => void removeTemplate(template)} t={t} />)}</div> : <p className="collection-hint">{t('Mark templates as favorites to keep them here.')}</p>}
      </section>
      <section className="resources-section" aria-labelledby="resources-title"><div className="section-heading-row"><div><h2 id="resources-title">{t('Resources')}</h2><p className="page-intro">{t('Save tutorial videos to keep them close to your routines.')}</p></div><div className="collection-actions"><button className="button button-secondary" type="button" onClick={() => { setResourceError(null); setResourceModalOpen(true) }}>＋ {t('Add resource')}</button><button className="text-button" type="button" onClick={() => navigate('/resources/collection')}>{t('View all resources')} →</button></div></div>
        {resources.filter((item) => item.is_favorite).length ? <div className="resource-card-grid">{resources.filter((item) => item.is_favorite).slice(0, 4).map((resource) => <ResourceCard key={resource.id} resource={resource} onOpen={() => navigate(`/resources/${resource.id}`)} onFavorite={() => void favoriteResource(resource)} onDelete={() => void removeResource(resource)} t={t} />)}</div> : <p className="collection-hint">{t('Mark resources as favorites to keep them here.')}</p>}
      </section>
    </>}
    {resourceModalOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourceModalOpen(false) }}><form className="card resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" onSubmit={(event) => void addResource(event)}><div className="section-heading-row"><h2 id="resource-dialog-title">{t('Add resource')}</h2><button className="icon-button" type="button" aria-label={t('Close')} onClick={() => setResourceModalOpen(false)}>×</button></div><label className="field-label" htmlFor="resource-url">{t('Video URL')}</label><input id="resource-url" type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://" required /><label className="field-label" htmlFor="resource-title">{t('Title')} <span className="optional-note">{t('(optional)')}</span></label><input id="resource-title" value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} maxLength={160} placeholder={t('Add a title to find it later')} />{resourceError && <p className="form-error" role="alert">{t(resourceError)}</p>}<div className="button-row"><button className="button button-primary" type="submit" disabled={resourceBusy}>{resourceBusy ? t('Saving…') : t('Save resource')}</button><button className="button button-secondary" type="button" onClick={() => setResourceModalOpen(false)}>{t('Cancel')}</button></div></form></div>}
  </section>
}

function TemplateCard({ template, onOpen, onFavorite, onDelete, t }: { template: SavedTemplate; onOpen: () => void; onFavorite: () => void; onDelete: () => void; t: (value: string) => string }) {
  return <article className="card template-card collection-card" onClick={onOpen}><div className="template-card-heading"><h3>{template.name}</h3><div className="card-actions"><button className="favorite-button" type="button" aria-label={t(template.is_favorite ? 'Remove favorite' : 'Add favorite')} aria-pressed={template.is_favorite} onClick={(event) => { event.stopPropagation(); onFavorite() }}>{template.is_favorite ? '★' : '☆'}</button><button className="resource-menu-button" type="button" aria-label={t('Delete')} onClick={(event) => { event.stopPropagation(); onDelete() }}>⋮</button></div></div><p className="template-exercise-preview">{template.exercises.slice(0, 2).map((exercise) => exercise.name).join(', ')}{template.exercises.length > 2 ? ', …' : ''}</p><span className="template-meta">{template.duration_minutes} {t('min')} · {template.exercises.length} {t('exercises')}</span></article>
}

function ResourceCard({ resource, onOpen, onFavorite, onDelete, t }: { resource: SavedResource; onOpen: () => void; onFavorite: () => void; onDelete: () => void; t: (value: string) => string }) {
  return <article className="card resource-card" onClick={onOpen}>{resource.thumbnail_url ? <img className="resource-thumbnail" src={resource.thumbnail_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <div className={`resource-thumbnail resource-thumbnail-placeholder resource-provider-${resource.provider}`} aria-hidden="true">▶</div>}<div className="resource-card-heading"><PlatformIcon provider={resource.provider} /><h3>{resource.title || resource.source_title || `${resource.provider} ${t('video')}`}</h3><button className="favorite-button" type="button" aria-label={t(resource.is_favorite ? 'Remove favorite' : 'Add favorite')} aria-pressed={resource.is_favorite} onClick={(event) => { event.stopPropagation(); onFavorite() }}>{resource.is_favorite ? '★' : '☆'}</button></div><button className="resource-menu-button" type="button" aria-label={t('Delete')} onClick={(event) => { event.stopPropagation(); onDelete() }}>⋮</button></article>
}

function PlatformIcon({ provider }: { provider: SavedResource['provider'] }) {
  const common = { className: `platform-icon platform-icon-${provider}`, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  if (provider === 'youtube') return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="4" /><path className="platform-icon-cutout" d="m10 9 6 3-6 3z" /></svg>
  if (provider === 'instagram') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="17.5" cy="6.5" r="1.2" /></svg>
  return <svg {...common}><path d="M14 3v11.2a4.8 4.8 0 1 1-3-4.46v3.23a1.8 1.8 0 1 0 0 1.23V3h3c.2 2.4 1.6 4 4 4.5v3.1A9 9 0 0 1 14 8.8V3z" /></svg>
}

function CollectionToolbar({ search, onSearch, searchLabel, placeholder, sort, ascending, onSort, favoritesOnly, onFavorites, extra, t }: { search: string; onSearch: (value: string) => void; searchLabel: string; placeholder: string; sort: 'recent' | 'name'; ascending: boolean; onSort: (sort: 'recent' | 'name') => void; favoritesOnly: boolean; onFavorites: () => void; extra?: ReactNode; t: (value: string) => string }) {
  return <div className="collection-filters"><input aria-label={searchLabel} type="search" placeholder={placeholder} value={search} onChange={(event) => onSearch(event.target.value)} />{extra}<div className="collection-icon-actions"><button className={`collection-icon-button${sort === 'recent' ? ' is-active' : ''}`} type="button" aria-label={t('Sort by date')} aria-pressed={sort === 'recent'} title={t('Sort by date')} onClick={() => onSort('recent')}><span aria-hidden="true">▣{sort === 'recent' ? (ascending ? '↑' : '↓') : ''}</span></button><button className={`collection-icon-button${sort === 'name' ? ' is-active' : ''}`} type="button" aria-label={t('Sort alphabetically')} aria-pressed={sort === 'name'} title={t('Sort alphabetically')} onClick={() => onSort('name')}><span aria-hidden="true">AZ{sort === 'name' ? (ascending ? '↑' : '↓') : ''}</span></button><button className={`collection-icon-button${favoritesOnly ? ' is-active' : ''}`} type="button" aria-label={t('Favorites only')} aria-pressed={favoritesOnly} title={t('Favorites only')} onClick={onFavorites}><span aria-hidden="true">★</span></button></div></div>
}

export function TemplateCollectionPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [ascending, setAscending] = useState(false)
  useEffect(() => { if (!session) return; void loadSavedTemplates(session.user.id).then(setTemplates).finally(() => setLoading(false)) }, [session])
  const visible = templates.filter((item) => (!favoritesOnly || item.is_favorite) && `${item.name} ${item.description ?? ''} ${item.exercises.map((exercise) => exercise.name).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => { const result = sort === 'name' ? a.name.localeCompare(b.name) : a.created_at.localeCompare(b.created_at); return ascending ? result : -result })
  async function favorite(template: SavedTemplate) { if (!session) return; const next = !template.is_favorite; try { await toggleTemplateFavorite(session.user.id, template.id, next); setTemplates((items) => items.map((item) => item.id === template.id ? { ...item, is_favorite: next } : item)) } catch { /* keep collection usable; a later refresh restores server state */ } }
  async function remove(template: SavedTemplate) { if (!session || !window.confirm(t('Delete this template?'))) return; try { await deleteTemplate(session.user.id, template.id); setTemplates((items) => items.filter((item) => item.id !== template.id)) } catch { /* retain the item when the delete fails */ } }
  return <section className="page-content planner-page collection-page"><Link className="profile-back-link" to="/templates">← {t('Templates')}</Link><div className="section-heading-row"><div><p className="eyebrow">{t('YOUR ROUTINES')}</p><h1>{t('All templates')}</h1></div><button className="button button-primary" type="button" onClick={() => navigate('/templates/new')}>＋ {t('New template')}</button></div><CollectionToolbar search={search} onSearch={setSearch} searchLabel={t('Search templates')} placeholder={t('Search by name or exercise')} sort={sort} ascending={ascending} onSort={(next) => { if (sort === next) setAscending((value) => !value); else { setSort(next); setAscending(next === 'name') } }} favoritesOnly={favoritesOnly} onFavorites={() => setFavoritesOnly((value) => !value)} t={t} />{loading ? <p role="status">{t('Loading your templates…')}</p> : visible.length ? <div className="template-card-grid">{visible.map((item) => <TemplateCard key={item.id} template={item} onOpen={() => navigate(`/templates/${item.id}`)} onFavorite={() => void favorite(item)} onDelete={() => void remove(item)} t={t} />)}</div> : <article className="card empty-state-card"><h2>{t('No matching templates')}</h2><p>{t('Try changing your search or filters.')}</p></article>}</section>
}

export function ResourceCollectionPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [resources, setResources] = useState<SavedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('all')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [ascending, setAscending] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  useEffect(() => { if (!session) return; void loadSavedResources(session.user.id).then(setResources).finally(() => setLoading(false)) }, [session])
  const visible = resources.filter((item) => (!favoritesOnly || item.is_favorite) && (provider === 'all' || item.provider === provider) && `${item.title ?? ''} ${item.source_title ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => { const result = sort === 'name' ? (a.title || a.source_title || a.provider).localeCompare(b.title || b.source_title || b.provider) : a.created_at.localeCompare(b.created_at); return ascending ? result : -result })
  async function favorite(resource: SavedResource) { if (!session) return; const next = !resource.is_favorite; try { await toggleResourceFavorite(session.user.id, resource.id, next); setResources((items) => items.map((item) => item.id === resource.id ? { ...item, is_favorite: next } : item)) } catch { /* keep collection usable; a later refresh restores server state */ } }
  async function remove(resource: SavedResource) { if (!session || !window.confirm(t('Delete this resource?'))) return; try { await deleteResource(session.user.id, resource.id); setResources((items) => items.filter((item) => item.id !== resource.id)) } catch { /* retain the item when the delete fails */ } }
  return <section className="page-content planner-page collection-page resource-collection-page"><Link className="profile-back-link" to="/templates">← {t('Templates')}</Link><div className="section-heading-row"><div><p className="eyebrow">{t('Resources')}</p><h1>{t('All resources')}</h1></div></div><CollectionToolbar search={search} onSearch={setSearch} searchLabel={t('Search resources')} placeholder={t('Search by title')} sort={sort} ascending={ascending} onSort={(next) => { if (sort === next) setAscending((value) => !value); else { setSort(next); setAscending(next === 'name') } }} favoritesOnly={favoritesOnly} onFavorites={() => setFavoritesOnly((value) => !value)} t={t} extra={<select aria-label={t('Filter by platform')} value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">{t('All platforms')}</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select>} />{loading ? <p role="status">{t('Loading resources…')}</p> : visible.length ? <div className="resource-card-grid">{visible.map((item) => <ResourceCard key={item.id} resource={item} onOpen={() => navigate(`/resources/${item.id}`)} onFavorite={() => void favorite(item)} onDelete={() => void remove(item)} t={t} />)}</div> : <article className="card empty-state-card"><h2>{t('No matching resources')}</h2><p>{t('Try changing your search or filters.')}</p></article>}</section>
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

export function ResourceDetailPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const { resourceId = '' } = useParams()
  const navigate = useNavigate()
  const [resource, setResource] = useState<SavedResource | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!session) return
    void loadSavedResources(session.user.id).then((items) => setResource(items.find((item) => item.id === resourceId) ?? null)).finally(() => setLoading(false))
  }, [session, resourceId])
  if (loading) return <section className="page-content"><p role="status">{t('Loading resource…')}</p></section>
  if (!resource) return <section className="page-content"><h1>{t('Resource unavailable')}</h1><button className="button button-secondary" type="button" onClick={() => navigate('/templates')}>{t('Back to templates')}</button></section>
  const embedUrl = resource.provider === 'youtube' && resource.provider_video_id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(resource.provider_video_id)}` : resource.provider === 'instagram' && resource.provider_video_id ? `https://www.instagram.com/${resource.original_url.includes('/reel/') ? 'reel' : 'p'}/${encodeURIComponent(resource.provider_video_id)}/embed` : resource.provider === 'tiktok' && resource.provider_video_id ? `https://www.tiktok.com/player/v1/${encodeURIComponent(resource.provider_video_id)}?description=1` : null
  return <section className="page-content planner-page resource-detail-page" aria-labelledby="resource-detail-title"><button className="profile-back-link resource-back-button" type="button" onClick={() => navigate('/templates')}>← {t('Back to templates')}</button><p className="eyebrow">{resource.provider}</p><h1 id="resource-detail-title">{resource.title || resource.source_title || `${resource.provider} ${t('video')}`}</h1><article className="card resource-player-card">{embedUrl ? <iframe className="resource-player" src={embedUrl} title={resource.title || t('Tutorial video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /> : <p>{t('This resource cannot be embedded.')}</p>}<a className="button button-secondary resource-open-link" href={resource.original_url} target="_blank" rel="noreferrer">{t('Open on platform')}</a></article></section>
}

// Compatibility exports for existing consumers while the weekly view is retired.
export const TodayPage = TrainingPage
export const WeekPage = TrainingPage
