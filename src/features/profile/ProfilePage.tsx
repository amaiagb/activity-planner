import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadProfileData, saveProfileData } from '../../lib/profileData'
import { emptyProfileForm, toProfileForm } from '../../types/profile'
import type { ProfileData, ProfileFormValues } from '../../types/profile'
import { useAuth } from '../auth/useAuth'
import { ProfileFields } from './ProfileFields'
import { MeasurementManager } from './MeasurementManager'

export function ProfilePage() {
  const { session } = useAuth()
  const [data, setData] = useState<ProfileData | null>(null)
  const [values, setValues] = useState<ProfileFormValues>(emptyProfileForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      setError('Choose at least one day you are available.')
      return
    }
    setSaving(true)
    try {
      await saveProfileData(session.user.id, values)
      await refresh()
      setNotice('Your profile has been saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  if (loading) return <section className="page-content"><p role="status">Loading your profile…</p></section>
  if (!data || !session) return <section className="page-content"><p className="form-error" role="alert">{error ?? 'Profile data is unavailable.'}</p></section>

  return (
    <section className="page-content" aria-labelledby="profile-title">
      <p className="eyebrow">YOUR SETTINGS</p>
      <div className="section-heading-row profile-title-row">
        <h1 id="profile-title">Profile</h1>
        <button className="button button-quiet" type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
      <form className="card form-card profile-form" onSubmit={submit}>
        <ProfileFields values={values} data={data} onChange={setValues} />
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>
      <MeasurementManager userId={session.user.id} measurements={data.measurements} onChanged={refresh} />
    </section>
  )
}
