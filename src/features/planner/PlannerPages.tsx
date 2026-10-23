import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { Language } from '../../lib/i18n'
import { localizeExerciseCopy } from '../../lib/catalogueTranslations'
import { displayTerm } from '../exercises/exerciseCatalogueLogic'
import { loadWorkoutHistory } from '../../lib/historyData'
import type { WorkoutHistoryData } from '../../lib/historyData'
import { UiIcon } from '../../components/UiIcon'
import { loadExerciseDetail } from '../exercises/exerciseData'
import type { CatalogueExercise } from '../exercises/exerciseData'

function localToday() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function titleCase(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) }
function addDays(value: string, amount: number) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
function displayToday(value: string, language: string, timeZone?: string) { return new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'short', timeZone }).format(new Date(`${value}T12:00:00Z`)) }

export function TrainingPage() {
  const { t, language } = useI18n()
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
  const [history, setHistory] = useState<WorkoutHistoryData | null>(null)
  const [historyError, setHistoryError] = useState(false)
  const templatesOnly = location.pathname === '/templates'
  useEffect(() => {
    if (!session) return
    void Promise.all([loadPlannerContext(session.user.id), loadSavedTemplates(session.user.id), loadSavedResources(session.user.id)])
      .then(([nextContext, nextTemplates, nextResources]) => { setContext(nextContext); setTemplates(nextTemplates); setResources(nextResources) })
      .catch(() => setError('Could not load your templates.')).finally(() => setLoading(false))
    if (!templatesOnly) void loadWorkoutHistory(session.user.id).then(setHistory).catch(() => setHistoryError(true))
  }, [session, templatesOnly])

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

  if (loading) return <section className="page-content"><p role="status">{t(templatesOnly ? 'Loading your templates…' : 'Loading your plan…')}</p></section>
  const today = history?.today ?? localToday()
  const activityDates = new Set(history?.activityDates ?? [])
  const streakClaim = history?.currentStreak ? (activityDates.has(today) ? 'Streak on fire' : 'Don’t lose your streak!') : 'Start a streak today'
  const streakBars = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6))
  const favoriteTemplates = templates.filter((item) => item.is_favorite)
  const favoriteResources = resources.filter((item) => item.is_favorite)
  if (!templatesOnly) return <section className="page-content planner-page today-page" aria-labelledby="today-title">
    <p className="today-date">{displayToday(today, language, history?.timeZone)}</p>
    <div className="today-streak-line" aria-live="polite">
      <span className="streak-flame" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" /></svg></span>
      <span>{historyError || !history ? t('Streak unavailable') : `${history.currentStreak} ${t(history.currentStreak === 1 ? 'day' : 'days')} · ${t(streakClaim)}`}</span>
      <span className="streak-bars" aria-label={t('Last seven activity days')}>{streakBars.map((date) => <span key={date} className={`streak-bar${activityDates.has(date) ? ' is-active' : ''}${date === today && !activityDates.has(date) ? ' is-today' : ''}`} aria-hidden="true" />)}</span>
    </div>
    <section className="today-hero" aria-labelledby="today-title">
      <h1 id="today-title">{t('Time to move')}</h1>
      <p>{t('Create a workout and get started. Two taps.')}</p>
      <button className="button button-primary" type="button" onClick={() => setShowGenerator((value) => !value)}><UiIcon name="play" />{t('Create workout')}</button>
    </section>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    {showGenerator && context && <section className="card form-card generator-panel"><h2>{t('Create workout')}</h2><label className="field-label" htmlFor="training-duration">{t('Available time')}</label><select id="training-duration" value={duration} onChange={(event) => setDuration(event.target.value)}>{Array.from({ length: 48 }, (_, index) => (index + 1) * 5).map((value) => <option key={value} value={value}>{value} {t('min')}</option>)}</select><label className="check-option full-option"><input type="checkbox" checked={outdoor} onChange={(event) => setOutdoor(event.target.checked)} /><span>{t('Outdoor walk')}</span></label>{!outdoor && <><label className="field-label" htmlFor="training-muscle">{t('Muscle group')} <span className="optional-note">{t('(optional)')}</span></label><select id="training-muscle" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}><option value="">{t('Any muscle group')}</option>{['legs', 'push', 'pull', 'core', 'cardio', 'mobility'].map((muscle) => <option key={muscle} value={muscle}>{t(titleCase(muscle))}</option>)}</select><fieldset className="today-equipment-options"><legend>{t('Equipment')}</legend>{context.input.equipment.length ? context.input.equipment.map((item, index) => <label className="checkbox-row" key={item}><input type="checkbox" checked={equipment.includes(item)} onChange={(event) => setEquipment((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{context.equipmentLabels[index] ?? item}</label>) : <p>{t('No equipment is saved in your profile; bodyweight workouts are still available.')}</p>}</fieldset></>}
      <div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void createGenerated()}>{busy ? t('Creating workout…') : t('Create workout')}</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => setShowGenerator(false)}>{t('Cancel')}</button></div>
    </section>}
    <section className="today-shortcuts" aria-labelledby="shortcuts-title"><h2 id="shortcuts-title">{t('Shortcuts')}</h2><div className="shortcut-list"><Link className="shortcut-row" to="/templates"><span className="shortcut-tile shortcut-tile-blue"><UiIcon name="star" /></span><span><strong>{t('Favorite routines')}</strong><small>{favoriteTemplates.length ? `${favoriteTemplates.length} ${t('saved')}` : t('Open your routines')}</small></span><UiIcon name="chevron-right" /></Link><Link className="shortcut-row" to="/resources/collection"><span className="shortcut-tile shortcut-tile-yellow"><UiIcon name="resource" /></span><span><strong>{t('Saved resources')}</strong><small>{favoriteResources.length ? `${favoriteResources.length} ${t('videos')}` : t('Open your saved resources')}</small></span><UiIcon name="chevron-right" /></Link></div></section>
  </section>
  return <section className={`page-content planner-page ${templatesOnly ? 'templates-page' : 'training-page'}`} aria-labelledby="training-title">
    {templatesOnly ? <div className="templates-main-bar"><div><p className="eyebrow">{t('YOUR PLANS')}</p><h1 id="training-title">{t('Routines')}</h1></div></div> : <><p className="eyebrow">{t('DAILY MOVEMENT')}</p><div className="section-heading-row planner-heading"><div><h1 id="training-title">{t('Train')}</h1><p className="page-intro">{t('Choose how you want to move today.')}</p></div></div></>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    {templatesOnly ? <button className="button button-primary templates-create-cta" type="button" onClick={() => setShowGenerator((value) => !value)}>{t('Create workout')}</button> : <div className="training-quick-actions"><button className="button button-primary" type="button" onClick={() => setShowGenerator((value) => !value)}>{t('Create workout')}</button><button className="button button-secondary" type="button" onClick={() => navigate('/templates')}>{t('Use a template')}</button></div>}
    {showGenerator && context && <section className="card form-card generator-panel"><h2>{t('Create workout')}</h2><label className="field-label" htmlFor="training-duration">{t('Available time')}</label><select id="training-duration" value={duration} onChange={(event) => setDuration(event.target.value)}>{Array.from({ length: 48 }, (_, index) => (index + 1) * 5).map((value) => <option key={value} value={value}>{value} {t('min')}</option>)}</select><label className="check-option full-option"><input type="checkbox" checked={outdoor} onChange={(event) => setOutdoor(event.target.checked)} /><span>{t('Outdoor walk')}</span></label>{!outdoor && <><label className="field-label" htmlFor="training-muscle">{t('Muscle group')} <span className="optional-note">{t('(optional)')}</span></label><select id="training-muscle" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}><option value="">{t('Any muscle group')}</option>{['legs', 'push', 'pull', 'core', 'cardio', 'mobility'].map((muscle) => <option key={muscle} value={muscle}>{t(titleCase(muscle))}</option>)}</select><fieldset className="today-equipment-options"><legend>{t('Equipment')}</legend>{context.input.equipment.length ? context.input.equipment.map((item, index) => <label className="checkbox-row" key={item}><input type="checkbox" checked={equipment.includes(item)} onChange={(event) => setEquipment((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{context.equipmentLabels[index] ?? item}</label>) : <p>{t('No equipment is saved in your profile; bodyweight workouts are still available.')}</p>}</fieldset></>}
      <div className="button-row"><button className="button button-primary" type="button" disabled={busy} onClick={() => void createGenerated()}>{busy ? t('Creating workout…') : t('Create workout')}</button><button className="button button-secondary" type="button" disabled={busy} onClick={() => setShowGenerator(false)}>{t('Cancel')}</button></div>
    </section>}
    {templatesOnly && <>
      <section className="templates-section"><div className="section-heading-row"><h2>{t('Templates')}</h2><button className="text-button" type="button" onClick={() => navigate('/templates/collection')}>{t('View all')} <UiIcon name="chevron-right" /></button></div>
        {favoriteTemplates.length ? <div className="routine-list">{favoriteTemplates.slice(0, 4).map((template) => <button className="routine-row" key={template.id} type="button" onClick={() => navigate(`/templates/${template.id}`)}><span className="routine-tile routine-tile-blue" aria-hidden="true"><UiIcon name="star" /></span><span className="routine-row-copy"><strong>{template.name}</strong><small>{template.exercises.length} {t('exercises')} · {template.duration_minutes} {t('min')}</small></span><span className="routine-row-star" onClick={(event) => { event.stopPropagation(); void favoriteTemplate(template) }} aria-label={t('Remove favorite')}><UiIcon name="star" filled /></span><span className="routine-row-delete" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); void removeTemplate(template) }} aria-label={t('Delete')}><UiIcon name="more" /></span></button>)}</div> : <p className="collection-hint">{t('Mark templates as favorites to keep them here.')}</p>}
      </section>
      <section className="resources-section" aria-labelledby="resources-title"><div className="section-heading-row"><h2 id="resources-title">{t('Resources')}</h2><div className="collection-actions"><button className="text-button" type="button" onClick={() => navigate('/resources/collection')}>{t('View all')} <UiIcon name="chevron-right" /></button></div></div>
        {favoriteResources.length ? <div className="routine-list resource-list">{favoriteResources.slice(0, 4).map((resource) => <button className="routine-row" key={resource.id} type="button" onClick={() => navigate(`/resources/${resource.id}`)}><ResourceThumbnail resource={resource} t={t} /><span className="routine-row-copy"><strong>{resource.title || resource.source_title || `${resource.provider} ${t('video')}`}</strong><small>{resource.provider}</small></span><span className="routine-row-star" onClick={(event) => { event.stopPropagation(); void favoriteResource(resource) }} aria-label={t('Remove favorite')}><UiIcon name="star" filled /></span><span className="routine-row-delete" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); void removeResource(resource) }} aria-label={t('Delete')}><UiIcon name="more" /></span></button>)}</div> : <p className="collection-hint">{t('Mark resources as favorites to keep them here.')}</p>}
      </section>
    </>}
    {resourceModalOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourceModalOpen(false) }}><form className="card resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" onSubmit={(event) => void addResource(event)}><div className="section-heading-row"><h2 id="resource-dialog-title">{t('Add resource')}</h2><button className="icon-button" type="button" aria-label={t('Close')} onClick={() => setResourceModalOpen(false)}><UiIcon name="close" /></button></div><label className="field-label" htmlFor="resource-url">{t('Video URL')}</label><input id="resource-url" type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://" required /><label className="field-label" htmlFor="resource-title">{t('Title')} <span className="optional-note">{t('(optional)')}</span></label><input id="resource-title" value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} maxLength={160} placeholder={t('Add a title to find it later')} />{resourceError && <p className="form-error" role="alert">{t(resourceError)}</p>}<div className="button-row"><button className="button button-primary" type="submit" disabled={resourceBusy}>{resourceBusy ? t('Saving…') : t('Save resource')}</button><button className="button button-secondary" type="button" onClick={() => setResourceModalOpen(false)}>{t('Cancel')}</button></div></form></div>}
  </section>
}

function TemplateCard({ template, onOpen, onFavorite, onDelete, t }: { template: SavedTemplate; onOpen: () => void; onFavorite: () => void; onDelete: () => void; t: (value: string) => string }) {
  return <article className="card template-card collection-card collection-list-row" onClick={onOpen}><span className="routine-tile routine-tile-blue" aria-hidden="true"><UiIcon name="star" /></span><div className="routine-row-copy"><h3>{template.name}</h3><span className="template-meta">{template.exercises.length} {t('exercises')} · {template.duration_minutes} {t('min')}</span></div><div className="card-actions"><button className="favorite-button" type="button" aria-label={t(template.is_favorite ? 'Remove favorite' : 'Add favorite')} aria-pressed={template.is_favorite} onClick={(event) => { event.stopPropagation(); onFavorite() }}><UiIcon name="star" filled={template.is_favorite} /></button><button className="resource-menu-button" type="button" aria-label={t('Delete')} onClick={(event) => { event.stopPropagation(); onDelete() }}><UiIcon name="more" /></button></div></article>
}

function ResourceCard({ resource, onOpen, onFavorite, onDelete, t }: { resource: SavedResource; onOpen: () => void; onFavorite: () => void; onDelete: () => void; t: (value: string) => string }) {
  return <article className="card resource-card collection-list-row" onClick={onOpen}><ResourceThumbnail resource={resource} t={t} /><div className="routine-row-copy"><h3>{resource.title || resource.source_title || `${resource.provider} ${t('video')}`}</h3><span className="template-meta">{resource.provider}</span></div><div className="card-actions"><button className="favorite-button" type="button" aria-label={t(resource.is_favorite ? 'Remove favorite' : 'Add favorite')} aria-pressed={resource.is_favorite} onClick={(event) => { event.stopPropagation(); onFavorite() }}><UiIcon name="star" filled={resource.is_favorite} /></button><button className="resource-menu-button" type="button" aria-label={t('Delete')} onClick={(event) => { event.stopPropagation(); onDelete() }}><UiIcon name="more" /></button></div></article>
}

function ResourceThumbnail({ resource, t }: { resource: SavedResource; t: (value: string) => string }) {
  const [failed, setFailed] = useState(false)
  const label = resource.title || resource.source_title || `${resource.provider} ${t('video')}`
  const badge = <span className={`resource-platform-badge resource-platform-badge-${resource.provider}`} aria-hidden="true"><PlatformIcon provider={resource.provider} /></span>
  if (!resource.thumbnail_url || failed) return <span className={`resource-thumbnail-wrap resource-thumbnail-fallback resource-thumbnail-${resource.provider}`} role="img" aria-label={label}><span className="resource-thumbnail-fallback-art"><PlatformIcon provider={resource.provider} /><small>{resource.provider}</small></span>{badge}</span>
  return <span className="resource-thumbnail-wrap"><img className="resource-thumbnail" src={resource.thumbnail_url} alt="" loading="lazy" width="78" height="78" onError={() => setFailed(true)} />{badge}</span>
}

function PlatformIcon({ provider }: { provider: SavedResource['provider'] }) {
  const common = { className: `platform-icon platform-icon-${provider}`, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  if (provider === 'youtube') return <svg {...common}><path d="m8 5 10 7-10 7z" /></svg>
  if (provider === 'instagram') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="17.5" cy="6.5" r="1.2" /></svg>
  return <svg {...common}><path d="M14 3v11.2a4.8 4.8 0 1 1-3-4.46v3.23a1.8 1.8 0 1 0 0 1.23V3h3c.2 2.4 1.6 4 4 4.5v3.1A9 9 0 0 1 14 8.8V3z" /></svg>
}

function CollectionToolbar({ search, onSearch, searchLabel, placeholder, sort, ascending, onSort, favoritesOnly, onFavorites, extra, t }: { search: string; onSearch: (value: string) => void; searchLabel: string; placeholder: string; sort: 'recent' | 'name'; ascending: boolean; onSort: (sort: 'recent' | 'name') => void; favoritesOnly: boolean; onFavorites: () => void; extra?: ReactNode; t: (value: string) => string }) {
  return <div className="collection-filters"><label className="collection-search-field"><UiIcon name="search" /><input aria-label={searchLabel} type="search" placeholder={placeholder} value={search} onChange={(event) => onSearch(event.target.value)} /></label><div className="collection-icon-actions"><button className={`collection-icon-button${favoritesOnly ? ' is-active' : ''}`} type="button" aria-label={t('Favorites only')} aria-pressed={favoritesOnly} title={t('Favorites only')} onClick={onFavorites}><UiIcon name="star" filled={favoritesOnly} /></button><button className={`collection-icon-button${sort === 'name' ? ' is-active' : ''}`} type="button" aria-label={t('Sort alphabetically')} aria-pressed={sort === 'name'} title={t('Sort alphabetically')} onClick={() => onSort('name')}><UiIcon name="alphabetical" className={`ui-icon${sort === 'name' && ascending ? ' is-ascending' : ''}`} /></button><button className={`collection-icon-button${sort === 'recent' ? ' is-active' : ''}`} type="button" aria-label={t('Sort by date')} aria-pressed={sort === 'recent'} title={t('Sort by date')} onClick={() => onSort('recent')}><UiIcon name="calendar" className={`ui-icon${sort === 'recent' && ascending ? ' is-ascending' : ''}`} /></button>{extra}</div></div>
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
  return <section className="page-content planner-page collection-page"><Link className="profile-back-link" to="/templates"><UiIcon name="chevron-left" /> {t('Templates')}</Link><div className="section-heading-row"><div><p className="eyebrow">{t('YOUR ROUTINES')}</p><h1>{t('All templates')}</h1></div><button className="button button-primary" type="button" onClick={() => navigate('/templates/new')}><UiIcon name="plus" /> {t('New template')}</button></div><CollectionToolbar search={search} onSearch={setSearch} searchLabel={t('Search templates')} placeholder={t('Search by name or exercise')} sort={sort} ascending={ascending} onSort={(next) => { if (sort === next) setAscending((value) => !value); else { setSort(next); setAscending(next === 'name') } }} favoritesOnly={favoritesOnly} onFavorites={() => setFavoritesOnly((value) => !value)} t={t} />{loading ? <p role="status">{t('Loading your templates…')}</p> : visible.length ? <div className="collection-list">{visible.map((item) => <TemplateCard key={item.id} template={item} onOpen={() => navigate(`/templates/${item.id}`)} onFavorite={() => void favorite(item)} onDelete={() => void remove(item)} t={t} />)}</div> : <article className="card empty-state-card"><h2>{t('No matching templates')}</h2><p>{t('Try changing your search or filters.')}</p></article>}</section>
}

export function ResourceCollectionPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [resources, setResources] = useState<SavedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [providers, setProviders] = useState<SavedResource['provider'][]>(['youtube', 'instagram', 'tiktok'])
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [ascending, setAscending] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [resourceBusy, setResourceBusy] = useState(false)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceTitle, setResourceTitle] = useState('')
  useEffect(() => { if (!session) return; void loadSavedResources(session.user.id).then(setResources).finally(() => setLoading(false)) }, [session])
  const visible = resources.filter((item) => (!favoritesOnly || item.is_favorite) && providers.includes(item.provider) && `${item.title ?? ''} ${item.source_title ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => { const result = sort === 'name' ? (a.title || a.source_title || a.provider).localeCompare(b.title || b.source_title || b.provider) : a.created_at.localeCompare(b.created_at); return ascending ? result : -result })
  async function favorite(resource: SavedResource) { if (!session) return; const next = !resource.is_favorite; try { await toggleResourceFavorite(session.user.id, resource.id, next); setResources((items) => items.map((item) => item.id === resource.id ? { ...item, is_favorite: next } : item)) } catch { /* keep collection usable; a later refresh restores server state */ } }
  async function remove(resource: SavedResource) { if (!session || !window.confirm(t('Delete this resource?'))) return; try { await deleteResource(session.user.id, resource.id); setResources((items) => items.filter((item) => item.id !== resource.id)) } catch { /* retain the item when the delete fails */ } }
  async function addResource(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!session) return; setResourceBusy(true); setResourceError(null); try { const resource = await saveResource(session.user.id, { url: resourceUrl, title: resourceTitle }); setResources((items) => [resource, ...items]); setResourceUrl(''); setResourceTitle(''); setResourceModalOpen(false) } catch (cause) { setResourceError(cause instanceof Error ? cause.message : 'Could not save the resource.') } finally { setResourceBusy(false) } }
  return <section className="page-content planner-page collection-page resource-collection-page"><div className="resource-collection-heading"><h1>{t('Resources')}</h1><button className="text-button resource-collection-add" type="button" onClick={() => { setResourceError(null); setResourceModalOpen(true) }}><UiIcon name="plus" /> {t('Add resource')}</button></div><CollectionToolbar search={search} onSearch={setSearch} searchLabel={t('Search resources')} placeholder={t('Search by title')} sort={sort} ascending={ascending} onSort={(next) => { if (sort === next) setAscending((value) => !value); else { setSort(next); setAscending(next === 'name') } }} favoritesOnly={favoritesOnly} onFavorites={() => setFavoritesOnly((value) => !value)} t={t} extra={<div className="resource-platform-filters" aria-label={t('Filter by platform')}>{(['youtube', 'instagram', 'tiktok'] as const).map((value) => <button className={`collection-icon-button resource-platform-filter${providers.includes(value) ? ' is-active' : ''}`} key={value} type="button" aria-label={value} aria-pressed={providers.includes(value)} title={value} onClick={() => setProviders((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}><PlatformIcon provider={value} /></button>)}</div>} />{loading ? <p role="status">{t('Loading resources…')}</p> : visible.length ? <div className="collection-list">{visible.map((item) => <ResourceCard key={item.id} resource={item} onOpen={() => navigate(`/resources/${item.id}`)} onFavorite={() => void favorite(item)} onDelete={() => void remove(item)} t={t} />)}</div> : <article className="card empty-state-card"><h2>{t('No matching resources')}</h2><p>{t('Try changing your search or filters.')}</p></article>}{resourceModalOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourceModalOpen(false) }}><form className="card resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-collection-dialog-title" onSubmit={(event) => void addResource(event)}><div className="section-heading-row"><h2 id="resource-collection-dialog-title">{t('Add resource')}</h2><button className="icon-button" type="button" aria-label={t('Close')} onClick={() => setResourceModalOpen(false)}><UiIcon name="close" /></button></div><label className="field-label" htmlFor="resource-collection-url">{t('Video URL')}</label><input id="resource-collection-url" type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://" required /><label className="field-label" htmlFor="resource-collection-title">{t('Title')} <span className="optional-note">{t('(optional)')}</span></label><input id="resource-collection-title" value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} maxLength={160} placeholder={t('Add a title to find it later')} />{resourceError && <p className="form-error" role="alert">{t(resourceError)}</p>}<div className="button-row"><button className="button button-primary" type="submit" disabled={resourceBusy}>{resourceBusy ? t('Saving…') : t('Save resource')}</button><button className="button button-secondary" type="button" onClick={() => setResourceModalOpen(false)}>{t('Cancel')}</button></div></form></div>}</section>
}

type ExerciseSession = { id: string; position: number; status: 'planned' | 'done' | 'skipped'; exercise_id: string }
type ActiveSession = { id: string; status: 'in_progress' | 'completed' | 'skipped'; started_at: string; completed_at: string | null; actual_duration_minutes: number | null; perceived_exertion: number | null; note: string | null; exercise_sessions: ExerciseSession[] }

export function WorkoutPage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [context, setContext] = useState<PlannerContext | null>(null)
  const [workout, setWorkout] = useState<PlannedWorkout | null>(null)
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [exerciseModal, setExerciseModal] = useState<{ id: string; name: string } | null>(null)
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
    try { const minutes = Math.max(0, Math.ceil((Date.now() - new Date(active.started_at).getTime()) / 60_000)); await completeWorkout(session.user.id, active.id, workout, { actualDurationMinutes: minutes, perceivedExertion: rpe ? Number(rpe) : null, note }); setFinishOpen(false); await reload() }
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

  const progressTotal = active?.exercise_sessions.length ?? workout.exercises.length
  return <section className="page-content planner-page workout-page" aria-labelledby="workout-title">
    <Link className="workout-back-link" to="/today"><UiIcon name="chevron-left" /> {t('Today')}</Link>
    <h1 id="workout-title">{t('Workout title')}</h1>
    <div className="workout-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progressTotal} aria-valuenow={handledCount} aria-label={t('Workout progress')}><span style={{ width: `${progressTotal ? (handledCount / progressTotal) * 100 : 0}%` }} /></div>
    <p className="progress-copy" role="status">{handledCount} {t('of')} {progressTotal}</p>
    {!active ? <article className="card form-card workout-start-card"><p>{workout.durationMinutes} {t('min')} · {t(titleCase(workout.category))} · {t(workout.isOutdoor ? 'Outdoor' : 'Indoor')}</p><p>{workout.exercises.length} {t('movements. You can mark each one done or skip it; no logging is required.')}</p><button className="button button-primary" type="button" disabled={starting} onClick={() => void start()}>{starting ? t('Starting…') : t('Start workout')}</button></article> : <>
      <ol className="execution-list">{workout.exercises.map((exercise, index) => {
        const row = active.exercise_sessions.find((item) => item.position === index + 1); const guide = guides[exercise.slug]; const copy = localizeExerciseCopy(exercise.slug, language); const displayName = copy?.name ?? guide?.name ?? exercise.name; const finished = row?.status === 'done' || row?.status === 'skipped'; const isNow = !finished && index === active.exercise_sessions.findIndex((item) => item.status === 'planned'); return <li className={`exercise-execution-row ${finished ? 'exercise-finished' : ''}`} key={`${exercise.id}-${index}`}>
          <div className="exercise-row-controls">{row && <button className={`exercise-status-button${row.status === 'done' ? ' is-done' : ''}`} type="button" aria-pressed={row.status === 'done'} aria-label={`${t('Done')}: ${displayName}`} onClick={() => void markExercise(row.id, row.status === 'done' ? 'skipped' : 'done')}>{row.status === 'done' ? <UiIcon name="check" /> : null}</button>}{row && <button className={`exercise-skip-button${row.status === 'skipped' ? ' is-skipped' : ''}`} type="button" aria-pressed={row.status === 'skipped'} aria-label={`${t('Skip')}: ${displayName}`} onClick={() => void markExercise(row.id, row.status === 'skipped' ? 'done' : 'skipped')}><UiIcon name="skip" /></button>}</div>
          <div className="exercise-row-main"><button className="exercise-name-button" type="button" onClick={() => setExerciseModal(context.databaseExerciseIds[exercise.slug] ? { id: context.databaseExerciseIds[exercise.slug], name: displayName } : null)}><strong>{displayName}</strong><span>{prescription(exercise.prescribedSets, exercise.prescribedReps, exercise.prescribedDurationSeconds, t)}{isNow && <em>{t('Now')}</em>}</span></button>{context.databaseExerciseIds[exercise.slug] ? <button className="text-button exercise-view-link" type="button" onClick={() => setExerciseModal({ id: context.databaseExerciseIds[exercise.slug], name: displayName })}>{t('View exercise')}</button> : (copy?.instructions ?? guide?.instructions) && <p className="exercise-inline-instructions">{copy?.instructions ?? guide?.instructions}</p>}</div>
          {row?.status === 'skipped' && <span className="exercise-state">{t('Skipped')}</span>}
        </li>
      })}</ol>
      {active.status === 'in_progress' && <button className="button button-primary workout-finish-button" type="button" disabled={!allExercisesHandled} onClick={() => setFinishOpen(true)}>{t('Complete workout')}</button>}
      {active.status === 'in_progress' && allExercisesHandled && doneCount === 0 && <p className="form-error" role="alert">{t('Mark at least one exercise as done to complete a training activity.')}</p>}
    </>}
    {finishOpen && <div className="dialog-backdrop workout-finish-overlay" role="presentation"><section className="card form-card workout-finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-workout-title"><div className="section-heading-row"><h2 id="finish-workout-title">{t('Finish session')}</h2><button className="icon-button" type="button" aria-label={t('Close')} onClick={() => setFinishOpen(false)}><UiIcon name="close" /></button></div><p>{t('Planned duration:')} {workout.durationMinutes} {t('min')}</p><label className="field-label" htmlFor="perceived-exertion">{t('Perceived exertion')} <span className="optional-note">{t('(optional, 1–5)')}</span></label><select id="perceived-exertion" value={rpe} onChange={(event) => setRpe(event.target.value)}><option value="">{t('Skip')}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select><label className="field-label" htmlFor="session-note">{t('Note')} <span className="optional-note">{t('(optional)')}</span></label><textarea id="session-note" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finish()}>{finishing ? t('Saving session…') : t('Complete workout')}</button><button className="text-button" type="button" disabled={finishing} onClick={() => void endSkipped()}>{t('End session as skipped')}</button></section></div>}
    {exerciseModal && <WorkoutExerciseModal exerciseId={exerciseModal.id} fallbackName={exerciseModal.name} language={language} onClose={() => setExerciseModal(null)} />}
  </section>
}

function WorkoutExerciseModal({ exerciseId, fallbackName, language, onClose }: { exerciseId: string; fallbackName: string; language: Language; onClose: () => void }) {
  const { t } = useI18n()
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const [exercise, setExercise] = useState<CatalogueExercise | null>(null)
  const [error, setError] = useState(false)
  const [paused] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [frame, setFrame] = useState(0)
  useEffect(() => { let active = true; void loadExerciseDetail(exerciseId, language).then((result) => { if (active) setExercise(result) }).catch(() => { if (active) setError(true) }); return () => { active = false } }, [exerciseId, language])
  useEffect(() => { if (paused || !exercise || exercise.media.length < 2) return; const timer = window.setInterval(() => setFrame((current) => (current + 1) % exercise.media.length), 800); return () => window.clearInterval(timer) }, [exercise, paused])
  useEffect(() => { closeRef.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [onClose])
  useEffect(() => { const next = exercise?.media[1]?.media_url; if (!next) return; const image = new Image(); image.src = next }, [exercise])
  return <div className="dialog-backdrop workout-exercise-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="card workout-exercise-dialog" role="dialog" aria-modal="true" aria-labelledby="workout-exercise-title"><div className="section-heading-row"><button ref={closeRef} className="icon-button" type="button" aria-label={t('Close')} onClick={onClose}><UiIcon name="close" /></button></div>{error ? <p className="form-error" role="alert">{t('Could not load this exercise.')}</p> : !exercise ? <p role="status">{t('Loading exercise…')}</p> : <><div className="workout-exercise-media">{exercise.media.length ? <img src={exercise.media[frame]?.media_url ?? exercise.media[frame]?.thumbnail_url ?? undefined} alt={exercise.media[frame]?.alt_text ?? exercise.name} /> : <div className="exercise-placeholder exercise-placeholder-detail" role="img" aria-label={exercise.name}><span>{exercise.name.charAt(0)}</span></div>}</div><p className="eyebrow">{t('Exercise tutorial')}</p><h2 id="workout-exercise-title">{exercise.name || fallbackName}</h2><div className="workout-exercise-tags">{exercise.muscles.map((muscle) => <span className="workout-tag workout-tag-accent" key={muscle}>{t(displayTerm(muscle))}</span>)}{exercise.equipment.flatMap((group) => group).map((item) => <span className="workout-tag" key={item.slug}>{item.name}</span>)}</div><h3>{t('Instructions')}</h3><ol className="workout-instructions">{instructionStepsForWorkout(exercise.instructions).map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></>}</section></div>
}

function instructionStepsForWorkout(value: string | null) { return value ? value.split(/\n+/).map((step) => step.trim()).filter(Boolean) : [] }

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
  return <section className="page-content planner-page resource-detail-page" aria-labelledby="resource-detail-title"><button className="profile-back-link resource-back-button" type="button" onClick={() => navigate('/templates')}><UiIcon name="chevron-left" /> {t('Back to templates')}</button><p className="eyebrow">{resource.provider}</p><h1 id="resource-detail-title">{resource.title || resource.source_title || `${resource.provider} ${t('video')}`}</h1><article className="card resource-player-card">{embedUrl ? <iframe className="resource-player" src={embedUrl} title={resource.title || t('Tutorial video')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /> : <p>{t('This resource cannot be embedded.')}</p>}<a className="button button-secondary resource-open-link" href={resource.original_url} target="_blank" rel="noreferrer">{t('Open on platform')}</a></article></section>
}

// Compatibility exports for existing consumers while the weekly view is retired.
export const TodayPage = TrainingPage
export const WeekPage = TrainingPage
