import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { deleteAccount, loadProfileData, savePersonalData, saveTrainingData, setExerciseExcluded } from '../../lib/profileData'
import { emptyProfileForm, fitnessLevels, goals, toProfileForm } from '../../types/profile'
import type { ProfileData, ProfileFormValues } from '../../types/profile'
import { useAuth } from '../auth/useAuth'
import { ProfileFields } from './ProfileFields'
import { MeasurementManager } from './MeasurementManager'
import { useI18n } from '../../lib/i18n'
import { localizeExerciseCopy } from '../../lib/catalogueTranslations'

type ProfileSection = 'training' | 'personal' | 'measurements' | undefined

function selectSection(values: ProfileFormValues, section: Exclude<ProfileSection, undefined>) {
  if (section === 'personal') return { displayName: values.displayName, primaryGoal: values.primaryGoal, fitnessLevel: values.fitnessLevel }
  return {
    days: values.days, duration: values.duration, likes: values.likes, canGoOutside: values.canGoOutside,
    outsideWeatherDependent: values.outsideWeatherDependent, equipmentIds: values.equipmentIds,
  }
}

function preferenceSummary(data: ProfileData, t: (value: string) => string) {
  const goal = goals.find((item) => item.value === data.profile?.primary_goal)
  const level = fitnessLevels.find((item) => item.value === data.profile?.fitness_level)
  return [goal && t(goal.label), level && t(level.label)].filter(Boolean).join(' · ')
}

export function ProfilePage() {
  const { language, theme, setLanguage, setTheme, t } = useI18n()
  const { session } = useAuth()
  const { section: rawSection } = useParams()
  const section: ProfileSection = rawSection === 'training' || rawSection === 'personal' || rawSection === 'measurements' ? rawSection : undefined
  const [data, setData] = useState<ProfileData | null>(null)
  const [values, setValues] = useState<ProfileFormValues>(emptyProfileForm)
  const [savedValues, setSavedValues] = useState<ProfileFormValues>(emptyProfileForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [measurementDirty, setMeasurementDirty] = useState(false)
  const dirty = useMemo(() => section === 'personal' || section === 'training'
    ? JSON.stringify(selectSection(values, section)) !== JSON.stringify(selectSection(savedValues, section))
    : false, [section, values, savedValues])
  const navigationDirty = dirty || (section === 'measurements' && measurementDirty)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => navigationDirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search || currentLocation.hash !== nextLocation.hash))
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null)
  const saveAndLeaveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (section && !loading) sectionHeadingRef.current?.focus() }, [section, loading])
  useEffect(() => { if (blocker.state === 'blocked' && section !== 'measurements') saveAndLeaveRef.current?.focus() }, [blocker.state, section])

  const refresh = useCallback(async () => {
    if (!session) return
    const nextData = await loadProfileData(session.user.id)
    const nextValues = toProfileForm(nextData)
    setData(nextData)
    setValues(nextValues)
    setSavedValues(nextValues)
  }, [session])

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    void loadProfileData(session.user.id).then((profileData) => {
      if (!active) return
      const nextValues = toProfileForm(profileData)
      setData(profileData)
      setValues(nextValues)
      setSavedValues(nextValues)
    }).catch(() => {
      if (active) setError(t('Could not load your profile.'))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session, t])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [dirty])

  async function saveSection() {
    if (!session || !section || (section !== 'personal' && section !== 'training')) return false
    setError(null)
    setNotice(null)
    if (section === 'training' && !Object.values(values.days).some(Boolean)) {
      setError(t('Choose at least one day you are available.'))
      return false
    }
    setSaving(true)
    try {
      if (section === 'personal') await savePersonalData(session.user.id, values)
      else await saveTrainingData(session.user.id, values)
      setSavedValues(values)
      setNotice(t('Your profile has been saved.'))
      if (blocker.state === 'blocked') blocker.proceed()
      return true
    } catch {
      setError(t('Could not save your profile.'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(t('Could not sign out.'))
  }

  async function removeAccount() {
    if (!window.confirm(t('Permanently delete your account and all of your profile, measurement, plan, and workout data? This cannot be undone.'))) return
    setError(null)
    setDeletingAccount(true)
    try {
      await deleteAccount()
    } catch {
      setError(t('Could not delete your account.'))
    } finally {
      setDeletingAccount(false)
    }
  }

  async function includeExercise(exerciseId: string) {
    if (!session || !data) return
    setError(null)
    try {
      await setExerciseExcluded(session.user.id, exerciseId, false)
      setData({ ...data, excludedExerciseIds: data.excludedExerciseIds.filter((id) => id !== exerciseId) })
      setValues((current) => ({ ...current, excludedExerciseIds: current.excludedExerciseIds.filter((id) => id !== exerciseId) }))
      setSavedValues((current) => ({ ...current, excludedExerciseIds: current.excludedExerciseIds.filter((id) => id !== exerciseId) }))
    } catch {
      setError(t('Could not update exercise exclusions.'))
    }
  }

  if (loading) return <section className="page-content"><p role="status">{t('Loading your profile…')}</p></section>
  if (!data || !session) return <section className="page-content"><p className="form-error" role="alert">{error ?? t('Profile data is unavailable.')}</p></section>

  if (section) {
    const titles = { training: 'Training', personal: 'Personal details', measurements: 'Measurements' } as const
    return <section className="page-content profile-page" aria-labelledby="profile-section-title">
      <Link className="profile-back-link" to="/profile">← {t('Back to profile')}</Link>
      <h1 ref={sectionHeadingRef} id="profile-section-title" tabIndex={-1}>{t(titles[section])}</h1>
      {section === 'measurements' ? <MeasurementManager userId={session.user.id} measurements={data.measurements} onChanged={refresh} onDirtyChange={setMeasurementDirty} blocker={blocker} /> : <form className="card form-card profile-form" onSubmit={(event) => { event.preventDefault(); void saveSection() }}>
        <ProfileFields section={section} values={values} data={data} onChange={setValues} />
        {section === 'training' && <details className="form-section exclusion-disclosure">
          <summary>{t('Exclusions')} <span className="exclusion-count">{t('Excluded exercises: ')}{data.excludedExerciseIds.length}</span></summary>
          <p className="field-help">{t('Exclude individual exercises from their detail page in the exercise catalogue.')}</p>
          <Link className="button button-secondary exclusion-catalogue-link" to="/exercises">{t('Open exercise catalogue')}</Link>
          {data.excludedExerciseIds.length === 0 ? <p className="catalogue-empty">{t('No exercises are excluded.')}</p> : <ul className="excluded-exercise-list">{data.excludedExerciseIds.map((id) => {
            const exercise = data.exercises.find((item) => item.id === id)
            const name = exercise ? localizeExerciseCopy(exercise.slug, language)?.name ?? exercise.name : t('Exercise no longer available')
            return <li key={id}><span>{name}</span><button className="text-button" type="button" onClick={() => void includeExercise(id)}>{t('Include')}</button></li>
          })}</ul>}
        </details>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {dirty && <p className="unsaved-indicator" role="status">{t('You have unsaved changes.')}</p>}
        <button className="button button-primary" type="submit" disabled={saving || !dirty}>{saving ? t('Saving…') : t('Save changes')}</button>
      </form>}
      {section === 'personal' && <section className="account-deletion-section personal-account-deletion" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title">{t('Delete account and data')}</h2>
        <p>{t('This permanently removes your account and its saved profile, measurements, plans, and workout history.')}</p>
        <button className="text-button danger-text" type="button" disabled={deletingAccount} onClick={() => void removeAccount()}>{deletingAccount ? t('Deleting account…') : t('Delete account permanently')}</button>
      </section>}
      {blocker.state === 'blocked' && section !== 'measurements' && <div className="dialog-backdrop" role="presentation"><section className="card confirm-dialog unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')]
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
      }}>
        <h2 id="unsaved-title">{t('Unsaved changes')}</h2><p id="unsaved-description">{t('Save your changes before leaving this screen?')}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="button-row"><button ref={saveAndLeaveRef} className="button button-primary" type="button" disabled={saving} onClick={() => void saveSection()}>{t('Save and leave')}</button><button className="button button-secondary" type="button" disabled={saving} onClick={() => { setValues(savedValues); blocker.proceed() }}>{t('Discard changes and leave')}</button><button className="text-button" type="button" onClick={() => blocker.reset()}>{t('Continue editing')}</button></div>
      </section></div>}
    </section>
  }

  const displayName = data.profile?.display_name?.trim() || t('Your profile')
  const summary = preferenceSummary(data, t)
  const settingsRows = [
    { to: '/profile/training', title: 'Training', description: 'Configure your availability and activity preferences.' },
    { to: '/profile/measurements', title: 'Measurements', description: 'Optional private history, saved by date.' },
  ] as const

  return <section className="page-content profile-page" aria-labelledby="profile-title">
    <p className="eyebrow">{t('YOUR SETTINGS')}</p>
    <h1 id="profile-title">{t('Profile')}</h1>
    <Link className="card profile-user-card" to="/profile/personal" aria-label={`${t('Edit personal details')}: ${displayName}`}>
      <span className="profile-avatar" aria-hidden="true">🐻</span>
      <div><h2>{displayName}</h2>{summary && <p>{summary}</p>}</div>
      <span className="profile-settings-arrow" aria-hidden="true">›</span>
    </Link>
    <nav className="profile-settings-list" aria-label={t('Profile settings')}>
      {settingsRows.map((row) => <Link className="card profile-settings-row" to={row.to} key={row.to}>
        <span className="profile-settings-copy"><strong>{t(row.title)}</strong><span>{t(row.description)}</span></span><span className="profile-settings-arrow" aria-hidden="true">›</span>
      </Link>)}
    </nav>
    <section className="app-preferences-card profile-app-preferences" aria-labelledby="app-preferences-title">
      <h2 id="app-preferences-title">{t('App preferences')}</h2>
      <div className="preference-control-row"><span id="app-language-label">{t('Language')}</span><div className="segmented-control" role="group" aria-labelledby="app-language-label">
        {(['es', 'en'] as const).map((value) => <button type="button" key={value} aria-pressed={language === value} className={language === value ? 'is-selected' : ''} onClick={() => void setLanguage(value).catch(() => setError(t('Could not save language preference.')))}>{value.toUpperCase()}</button>)}
      </div></div>
      <div className="preference-control-row"><span id="app-theme-label">{t('Theme')}</span><div className="theme-options" role="radiogroup" aria-labelledby="app-theme-label">
        {(['system', 'light', 'dark'] as const).map((value, index, options) => <button type="button" role="radio" aria-checked={theme === value} aria-label={t(value === 'system' ? 'System theme' : value === 'light' ? 'Light' : 'Dark')} key={value} className={theme === value ? 'is-selected' : ''} onClick={() => void setTheme(value).catch(() => setError(t('Could not save theme preference.')))} onKeyDown={(event) => {
          const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
          if (offset) { event.preventDefault(); const next = (index + offset + options.length) % options.length; const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]; nextButton?.focus(); void setTheme(options[next]).catch(() => setError(t('Could not save theme preference.'))) }
          if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.key === 'Home' ? 0 : options.length - 1; const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]; nextButton?.focus(); void setTheme(options[next]).catch(() => setError(t('Could not save theme preference.'))) }
        }}><span aria-hidden="true">{value === 'system' ? '◐' : value === 'light' ? '☀' : '☾'}</span><span>{t(value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark')}</span></button>)}
      </div></div>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="profile-account-actions" aria-label={t('Account actions')}>
      <button className="button button-secondary" type="button" onClick={() => void signOut()}>{t('Sign out')}</button>
    </section>
  </section>
}
