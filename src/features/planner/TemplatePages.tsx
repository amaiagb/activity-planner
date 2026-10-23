import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { displayTerm, filterExercises } from '../exercises/exerciseCatalogueLogic'
import { ExerciseThumbnail } from '../exercises/ExercisePages'
import { loadExerciseCatalogue } from '../exercises/exerciseData'
import type { CatalogueExercise } from '../exercises/exerciseData'
import { useI18n } from '../../lib/i18n'
import { UiIcon } from '../../components/UiIcon'
import { createWorkoutFromTemplate, loadSavedTemplates, saveTemplate } from './plannerData'
import type { SavedTemplate } from './plannerData'

export function NewTemplatePage() {
  const { t, language } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  const [catalogue, setCatalogue] = useState<CatalogueExercise[]>([])
  const [selected, setSelected] = useState<CatalogueExercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void loadExerciseCatalogue(language).then((items) => { if (alive) setCatalogue(items) }).catch(() => { if (alive) setError('Could not load the exercise catalogue.') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [language])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !selected.length) { setError('Choose at least one exercise for your template.'); return }
    setSaving(true); setError(null)
    try {
      await saveTemplate(session.user.id, { name, description, durationMinutes: duration, exercises: selected.map((exercise) => ({ exerciseId: exercise.id, sets: 3, reps: '8–12', durationSeconds: null })) })
      navigate('/templates', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the template.') }
    finally { setSaving(false) }
  }

  const validSelected = useMemo(() => selected.filter((exercise) => !exercise.id.startsWith('repdb:')), [selected])
  return <section className="page-content planner-page" aria-labelledby="new-template-title">
    <Link className="profile-back-link" to="/templates"><UiIcon name="chevron-left" /> {t('Templates')}</Link>
    <p className="eyebrow">{t('YOUR TEMPLATES')}</p>
    <h1 id="new-template-title">{t('New template')}</h1>
    <p className="page-intro">{t('Create a reusable workout from your favourite exercises.')}</p>
    <form className="card form-card profile-form template-form" onSubmit={(event) => void submit(event)}>
      <label className="field-label" htmlFor="template-name">{t('Name')}</label>
      <input id="template-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      <label className="field-label" htmlFor="template-description">{t('Description')} <span className="optional-note">{t('(optional)')}</span></label>
      <textarea id="template-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} />
      <label className="field-label" htmlFor="template-duration">{t('Estimated duration')}</label>
      <div className="input-with-suffix"><input id="template-duration" type="number" min={5} max={240} step={5} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /><span>{t('minutes')}</span></div>
      <div className="template-selected-heading"><div><h2>{t('Exercises')}</h2><p className="field-help">{selected.length} {t('selected')}</p></div><button className="button button-secondary" type="button" onClick={() => setPickerOpen(true)}>{t('Select exercises')}</button></div>
      {selected.length ? <ol className="template-selected-list">{selected.map((exercise, index) => <li className="template-selected-row" key={exercise.id}><span className="template-order">{index + 1}</span><ExerciseThumbnail exercise={exercise} /><span className="exercise-row-copy"><strong>{exercise.name}</strong><span>{exercise.muscles.map((muscle) => t(displayTerm(muscle))).join(', ') || t(displayTerm(exercise.category))}</span></span><button className="text-button danger-text" type="button" aria-label={`${t('Remove')} ${exercise.name}`} onClick={() => setSelected((items) => items.filter((item) => item.id !== exercise.id))}><UiIcon name="close" /></button></li>)}</ol> : <button className="template-empty-picker" type="button" onClick={() => setPickerOpen(true)}><UiIcon name="plus" /><strong>{t('Select exercises')}</strong><span>{t('Add the movements you want to include in this template.')}</span></button>}
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      <div className="button-row"><button className="button button-primary" type="submit" disabled={saving || loading || !name.trim() || validSelected.length === 0}>{saving ? t('Saving…') : t('Save template')}</button><button className="button button-secondary" type="button" onClick={() => navigate('/templates')}>{t('Cancel')}</button></div>
    </form>
    {pickerOpen && <ExercisePickerModal exercises={catalogue} loading={loading} selectedIds={selected.map((item) => item.id)} onToggle={(exercise) => setSelected((items) => items.some((item) => item.id === exercise.id) ? items.filter((item) => item.id !== exercise.id) : [...items, exercise])} onClose={() => setPickerOpen(false)} />}
  </section>
}

export function TemplateDetailPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  const navigate = useNavigate()
  const templateId = window.location.pathname.split('/').pop() ?? ''
  const [template, setTemplate] = useState<SavedTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  useEffect(() => { if (!session) return; void loadSavedTemplates(session.user.id).then((items) => setTemplate(items.find((item) => item.id === templateId) ?? null)).finally(() => setLoading(false)) }, [session, templateId])
  async function train() {
    if (!session || !template) return
    setStarting(true)
    try { const workout = await createWorkoutFromTemplate(session.user.id, template, new Date().toISOString().slice(0, 10)); navigate(`/workout/${workout.id}`) }
    finally { setStarting(false) }
  }
  if (loading) return <section className="page-content"><p role="status">{t('Loading template…')}</p></section>
  if (!template) return <section className="page-content"><h1>{t('Template unavailable')}</h1><Link to="/templates"><UiIcon name="chevron-left" /> {t('Templates')}</Link></section>
  return <section className="page-content planner-page template-detail-page" aria-labelledby="template-detail-title"><Link className="profile-back-link" to="/templates"><UiIcon name="chevron-left" /> {t('Templates')}</Link><div className="template-detail-heading"><div><p className="eyebrow">{t('YOUR ROUTINE')}</p><h1 id="template-detail-title">{template.name}</h1>{template.description && <p className="page-intro">{template.description}</p>}</div><span className="template-detail-duration">{template.duration_minutes} {t('min')}</span></div><article className="card template-detail-card"><div className="template-detail-card-heading"><h2>{t('Exercises')}</h2><span>{template.exercises.length}</span></div><ol className="template-detail-exercise-list">{template.exercises.map((exercise, index) => <li key={exercise.exercise_id}><span className="template-order">{index + 1}</span><img className="exercise-thumbnail" src={`/images/flat/${exercise.slug.replaceAll('_', '-')}-start.webp`} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className="exercise-row-copy"><strong>{exercise.name}</strong><span>{exercise.prescribed_sets ? `${exercise.prescribed_sets} ${t('sets')}` : ''}{exercise.prescribed_reps ? ` · ${exercise.prescribed_reps}` : ''}</span></span></li>)}</ol><button className="button button-primary template-train-button" type="button" disabled={starting} onClick={() => void train()}>{starting ? t('Starting…') : t('Train')}</button></article></section>
}

function ExercisePickerModal({ exercises, loading, selectedIds, onToggle, onClose }: { exercises: CatalogueExercise[]; loading: boolean; selectedIds: string[]; onToggle: (exercise: CatalogueExercise) => void; onClose: () => void }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [equipment, setEquipment] = useState('')
  const parts = useMemo(() => [...new Set(exercises.flatMap((item) => item.muscles))].sort(), [exercises])
  const equipmentOptions = useMemo(() => [...new Map(exercises.flatMap((item) => item.equipment).map((item) => [item.slug, item.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [exercises])
  const filtered = useMemo(() => filterExercises(exercises, search, bodyPart, equipment), [exercises, search, bodyPart, equipment])
  return <div className="dialog-backdrop exercise-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="card exercise-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-picker-title">
    <header className="exercise-picker-header"><div><h2 id="exercise-picker-title">{t('Select exercises')}</h2><p>{selectedIds.length} {t('selected')}</p></div><button className="icon-button" type="button" aria-label={t('Close')} onClick={onClose}><UiIcon name="close" /></button></header>
    <label className="sr-only" htmlFor="template-exercise-search">{t('Search exercises')}</label><label className="exercise-search-field"><UiIcon name="search" /><input id="template-exercise-search" className="exercise-search" type="search" placeholder={t('Name, muscle, equipment…')} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <div className="exercise-filters"><label><span className="sr-only">{t('Filter by body part')}</span><select value={bodyPart} onChange={(event) => setBodyPart(event.target.value)}><option value="">{t('Any body part')}</option>{parts.map((part) => <option key={part} value={part}>{t(displayTerm(part))}</option>)}</select></label><label><span className="sr-only">{t('Filter by equipment')}</span><select value={equipment} onChange={(event) => setEquipment(event.target.value)}><option value="">{t('Any equipment')}</option>{equipmentOptions.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}</select></label></div>
    <div className="exercise-picker-list">{loading ? <p role="status">{t('Loading exercises…')}</p> : filtered.map((exercise) => <label className={`exercise-picker-row${selectedIds.includes(exercise.id) ? ' is-selected' : ''}`} key={exercise.id}><input type="checkbox" checked={selectedIds.includes(exercise.id)} onChange={() => onToggle(exercise)} /><ExerciseThumbnail exercise={exercise} /><span className="exercise-row-copy"><strong>{exercise.name}</strong><span>{exercise.muscles.map((muscle) => t(displayTerm(muscle))).join(', ') || t(displayTerm(exercise.category))}{exercise.equipment.length ? ` · ${exercise.equipment.map((item) => item.name).join(', ')}` : ''}</span></span></label>)}</div>
    <footer className="exercise-picker-footer"><span>{selectedIds.length} {t('selected')}</span><button className="button button-primary" type="button" onClick={onClose}>{t('Add selected')}</button></footer>
  </section></div>
}
