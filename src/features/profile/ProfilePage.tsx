import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { deleteAccount, loadProfileData, saveProfileData } from '../../lib/profileData'
import { emptyProfileForm, toProfileForm } from '../../types/profile'
import type { ProfileData, ProfileFormValues } from '../../types/profile'
import { useAuth } from '../auth/useAuth'
import { ProfileFields } from './ProfileFields'
import { MeasurementManager } from './MeasurementManager'
import { useI18n } from '../../lib/i18n'

export function ProfilePage() {
  const { language, theme, setLanguage, setTheme, t } = useI18n()
  const { session } = useAuth()
  const [data, setData] = useState<ProfileData | null>(null)
  const [values, setValues] = useState<ProfileFormValues>(emptyProfileForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    const nextData = await loadProfileData(session.user.id)
    setData(nextData)
    setValues(toProfileForm(nextData))
  }, [session])

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    void loadProfileData(session.user.id).then((profileData) => {
      if (!active) return
      setData(profileData)
      setValues(toProfileForm(profileData))
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load your profile.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setError(null)
    setNotice(null)
    if (!Object.values(values.days).some(Boolean)) {
      setError(t('Choose at least one day you are available.'))
      return
    }
    setSaving(true)
    try {
      await saveProfileData(session.user.id, values)
      await refresh()
      setNotice(t('Your profile has been saved.'))
    } catch {
      setError(t('Could not save your profile.'))
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
    setNotice(null)
    setDeletingAccount(true)
    try {
      await deleteAccount()
    } catch {
      setError(t('Could not delete your account.'))
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) return <section className="page-content"><p role="status">{t('Loading your profile…')}</p></section>
  if (!data || !session) return <section className="page-content"><p className="form-error" role="alert">{error ?? t('Profile data is unavailable.')}</p></section>

  return (
    <section className="page-content" aria-labelledby="profile-title">
      <p className="eyebrow">{t('YOUR SETTINGS')}</p>
      <div className="section-heading-row profile-title-row">
        <h1 id="profile-title">{t('Profile')}</h1>
        <button className="button button-quiet" type="button" onClick={() => void signOut()}>{t('Sign out')}</button>
      </div>
      <section className="card app-preferences-card" aria-labelledby="app-preferences-title">
        <h2 id="app-preferences-title">{t('App preferences')}</h2>
        <label className="field-label" htmlFor="app-language">{t('Language')}</label>
        <select id="app-language" value={language} onChange={(event) => void setLanguage(event.target.value as 'en' | 'es').catch(() => setError(t('Could not save language preference.')))}>
          <option value="en">{t('English')}</option><option value="es">{t('Spanish')}</option>
        </select>
        <label className="field-label" htmlFor="app-theme">{t('Theme')}</label>
        <select id="app-theme" value={theme} onChange={(event) => void setTheme(event.target.value as 'system' | 'light' | 'dark').catch(() => setError(t('Could not save theme preference.')))}>
          <option value="system">{t('System')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
        </select>
      </section>
      <form className="card form-card profile-form" onSubmit={submit}>
        <ProfileFields values={values} data={data} onChange={setValues} />
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? t('Saving…') : t('Save profile')}</button>
      </form>
      <MeasurementManager userId={session.user.id} measurements={data.measurements} onChanged={refresh} />
      <section className="account-deletion-section" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title">{t('Delete account and data')}</h2>
        <p>{t('This permanently removes your account and its saved profile, measurements, plans, and workout history.')}</p>
        <button className="button button-danger" type="button" disabled={deletingAccount} onClick={() => void removeAccount()}>{deletingAccount ? t('Deleting account…') : t('Delete account permanently')}</button>
      </section>
    </section>
  )
}
