import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { filterExercises, displayTerm, groupExercisesByLetter, instructionSteps } from './exerciseCatalogueLogic'
import { loadExerciseCatalogue, loadExerciseDetail } from './exerciseData'
import type { CatalogueExercise, ExerciseMedia } from './exerciseData'

function PlaceholderMedia({ name, size }: { name: string; size: 'thumbnail' | 'detail' }) {
  return (
    <div className={`exercise-placeholder exercise-placeholder-${size}`} role="img" aria-label={`Illustration not yet available for ${name}`}>
      <span aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase()}</span>
      {size === 'detail' && <small>Illustration coming soon</small>}
    </div>
  )
}

function ExerciseThumbnail({ exercise }: { exercise: CatalogueExercise }) {
  const [failed, setFailed] = useState(false)
  const image = exercise.media.find((item) => item.thumbnail_url)
  if (!image || failed) return <PlaceholderMedia name={exercise.name} size="thumbnail" />
  return <img className="exercise-thumbnail" src={image.thumbnail_url ?? undefined} alt={image.alt_text} loading="lazy" width="72" height="72" onError={() => setFailed(true)} />
}

function equipmentSummary(items: CatalogueExercise['equipment']) {
  const groups = new Map<number, string[]>()
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item.name])
  return [...groups.values()].map((group) => group.join(' or ')).join(' + ')
}

function ExerciseRow({ exercise, onOpen }: { exercise: CatalogueExercise; onOpen: (element: HTMLAnchorElement) => void }) {
  const bodyPart = exercise.muscles.length ? exercise.muscles.map(displayTerm).join(', ') : displayTerm(exercise.category)
  const equipment = equipmentSummary(exercise.equipment)
  return (
    <Link className="exercise-row" to={`/exercises/${exercise.id}`} aria-label={`View ${exercise.name}`} onClick={(event) => onOpen(event.currentTarget)}>
      <ExerciseThumbnail exercise={exercise} />
      <span className="exercise-row-copy"><strong>{exercise.name}</strong><span>{bodyPart}{equipment ? ` · ${equipment}` : ''}</span></span>
      <span className="exercise-row-arrow" aria-hidden="true">›</span>
    </Link>
  )
}

function jumpToLetter(letter: string) {
  document.getElementById(`exercise-group-${letter}`)?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

export function ExercisesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
  const [exercises, setExercises] = useState<CatalogueExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [equipment, setEquipment] = useState('')
  const lastOpenedRow = useRef<HTMLAnchorElement>(null)
  const detailRoute = useParams().exerciseId !== undefined

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setExercises(await loadExerciseCatalogue()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the exercise catalogue.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => { if (!detailRoute) lastOpenedRow.current?.focus() }, [detailRoute])

  const bodyParts = useMemo(() => [...new Set(exercises.flatMap((item) => item.muscles))].sort(), [exercises])
  const equipmentOptions = useMemo(() => [...new Map(exercises.flatMap((item) => item.equipment).map((item) => [item.slug, item.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [exercises])
  const groups = useMemo(() => groupExercisesByLetter(filterExercises(exercises, search, bodyPart, equipment)), [exercises, search, bodyPart, equipment])
  const letters = groups.map(([letter]) => letter)
  const hasFilters = Boolean(search || bodyPart || equipment)

  function clearFilters() {
    setSearch('')
    setBodyPart('')
    setEquipment('')
  }

  return (
    <>
      <div className="exercise-catalogue-content" inert={detailRoute ? true : undefined} aria-hidden={detailRoute}>
        <section className="page-content exercise-catalogue" aria-labelledby="exercises-title">
          <p className="eyebrow">MOVEMENT LIBRARY</p>
          <h1 id="exercises-title">Exercises</h1>
          <label className="field-label" htmlFor="exercise-search">Search exercises</label>
          <input id="exercise-search" className="exercise-search" type="search" placeholder="Name, muscle, equipment…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="exercise-filters">
            <label><span className="sr-only">Filter by body part</span><select aria-label="Filter by body part" value={bodyPart} onChange={(event) => setBodyPart(event.target.value)}><option value="">Any body part</option>{bodyParts.map((part) => <option key={part} value={part}>{displayTerm(part)}</option>)}</select></label>
            <label><span className="sr-only">Filter by equipment</span><select aria-label="Filter by equipment" value={equipment} onChange={(event) => setEquipment(event.target.value)}><option value="">Any equipment</option>{equipmentOptions.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></label>
          </div>
          {hasFilters && <button className="text-button exercise-clear-filters" type="button" onClick={clearFilters}>Clear search and filters</button>}
          {loading ? <p className="exercise-state-message" role="status">Loading exercises…</p> : error ? <div className="exercise-state-message"><p className="form-error" role="alert">{error}</p><button className="button button-secondary" type="button" onClick={() => void reload()}>Try again</button></div> : groups.length === 0 ? <div className="card exercise-empty"><h2>{hasFilters ? 'No exercises found' : 'No active exercises'}</h2><p>{hasFilters ? 'No exercises match these filters.' : 'The exercise catalogue is empty.'}</p>{hasFilters && <button className="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>}</div> : <>
            <p className="exercise-result-count" role="status">{groups.reduce((total, [, entries]) => total + entries.length, 0)} exercises</p>
            <div className="exercise-groups">
              {groups.map(([letter, entries]) => <section className="exercise-group" key={letter} id={`exercise-group-${letter}`} aria-labelledby={`exercise-letter-${letter}`}><h2 id={`exercise-letter-${letter}`} tabIndex={-1}>{letter}</h2><ul>{entries.map((exercise) => <li key={exercise.id}><ExerciseRow exercise={exercise} onOpen={(element) => { lastOpenedRow.current = element }} /></li>)}</ul></section>)}
            </div>
            <nav className="exercise-index" aria-label="Jump to exercise name letter">{letters.map((letter) => <button key={letter} type="button" aria-label={`Jump to ${letter}`} aria-controls={`exercise-group-${letter}`} onClick={() => jumpToLetter(letter)}>{letter}</button>)}</nav>
          </>}
        </section>
      </div>
      {detailRoute && <div className="exercise-detail-overlay" onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          navigate(returnTo ?? '/exercises')
        } else if (event.key === 'Tab') {
          const dialog = event.currentTarget.querySelector<HTMLElement>('.exercise-detail-dialog')
          const focusable = [...(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])') ?? [])]
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
      }}><section className="exercise-detail-dialog" role="dialog" aria-modal="true" aria-label="Exercise tutorial"><Outlet /></section></div>}
    </>
  )
}

function TutorialMedia({ exercise, media }: { exercise: CatalogueExercise; media: ExerciseMedia[] }) {
  const [failed, setFailed] = useState<string[]>([])
  const visual = media.find((item) => item.media_url && !failed.includes(item.id))
  if (!visual) return <PlaceholderMedia name={exercise.name} size="detail" />
  if (visual.media_kind === 'video' || visual.media_kind === 'animation') {
    const videoType = visual.storage_path.toLocaleLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'
    return <div className="exercise-tutorial-video"><video controls playsInline preload="metadata" poster={visual.thumbnail_url ?? undefined} aria-label={visual.alt_text} onError={() => setFailed((current) => [...current, visual.id])}><source src={visual.media_url ?? undefined} type={videoType} />{visual.captions_url && <track kind="captions" src={visual.captions_url} srcLang="en" label="English captions" default />}Your browser cannot play this instructional video.</video>{visual.caption && <p>{visual.caption}</p>}</div>
  }
  return <img className="exercise-detail-image" src={visual.media_url ?? undefined} alt={visual.alt_text} onError={() => setFailed((current) => [...current, visual.id])} />
}

export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [exercise, setExercise] = useState<CatalogueExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const backButton = useRef<HTMLButtonElement>(null)
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo

  function closeDetail() {
    navigate(returnTo ?? '/exercises')
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setExercise(null)
    void loadExerciseDetail(exerciseId).then((result) => { if (active) setExercise(result) }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load this exercise.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [exerciseId, retryCount])

  useEffect(() => { backButton.current?.focus() }, [exerciseId])

  return <>
    <header className="exercise-detail-header"><button ref={backButton} className="button button-secondary" type="button" aria-label={returnTo ? 'Back to workout' : 'Back to exercises'} onClick={closeDetail}>← <span>{returnTo ? 'Back to workout' : 'Exercises'}</span></button>{exercise && <p className="eyebrow">{displayTerm(exercise.category)}</p>}</header>
    {loading ? <p role="status">Loading exercise…</p> : error ? <div><p className="form-error" role="alert">{error}</p><button className="button button-secondary" type="button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></div> : !exercise ? <section><h1>Exercise unavailable</h1><p>This exercise is inactive or no longer exists.</p></section> : <article className="exercise-detail-content">
      <h1>{exercise.name}</h1>
      <div className="exercise-hero-media"><TutorialMedia key={exercise.id} exercise={exercise} media={exercise.media} /></div>
      {exercise.description && <p className="exercise-description">{exercise.description}</p>}
      <section className="exercise-instructions-section" aria-labelledby="exercise-instructions-title"><h2 id="exercise-instructions-title">Instructions</h2>{instructionSteps(exercise.instructions).length ? <ol>{instructionSteps(exercise.instructions).map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol> : <p>Written instructions are not available yet.</p>}</section>
      <section className="exercise-detail-facts" aria-label="Exercise details">
        {exercise.muscles.length > 0 && <div><h2>Muscles worked</h2><p>{exercise.muscles.map(displayTerm).join(', ')}</p></div>}
        {exercise.equipment.length > 0 && <div><h2>Equipment</h2><p>{equipmentSummary(exercise.equipment)}</p></div>}
        <div><h2>Movement details</h2><p>{[exercise.movement_pattern && displayTerm(exercise.movement_pattern), exercise.difficulty && `${displayTerm(exercise.difficulty)} level`, exercise.impact_level && `${displayTerm(exercise.impact_level)} impact`, exercise.is_outdoor ? 'Outdoor' : 'Indoor'].filter(Boolean).join(' · ')}</p></div>
      </section>
      {exercise.media.map((media) => <section className="exercise-media-attribution" key={media.id}><p>{media.description ?? media.alt_text}</p><p>Source: {media.source_url ? <a href={media.source_url} target="_blank" rel="noreferrer">{media.source_name}</a> : media.source_name} · License: {media.license_url ? <a href={media.license_url} target="_blank" rel="noreferrer">{media.license_name}</a> : media.license_name}</p>{media.transcript && <details><summary>Video transcript</summary><p>{media.transcript}</p></details>}</section>)}
    </article>}
  </>
}
