import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProfileData, saveMeasurement, saveProfileData } from '../../lib/profileData'
import { emptyProfileForm, measurementFields, toProfileForm } from '../../types/profile'
import type { MeasurementKey, ProfileData, ProfileFormValues } from '../../types/profile'
import { ProfileFields } from '../profile/ProfileFields'
import { useAuth } from '../auth/useAuth'

const emptyMeasurements = (): Record<MeasurementKey, string> => ({
  weight_kg: '', height_cm: '', waist_cm: '', chest_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '',
})

export function OnboardingPage() {
  const { session, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<ProfileData | null>(null)
  const [values, setValues] = useState<ProfileFormValues>(emptyProfileForm)
  const [measurements, setMeasurements] = useState(emptyMeasurements)
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    let active = true
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
    setError(null)
    if (!session || !data) return
    if (!Object.values(values.days).some(Boolean)) {
      setError('Choose at least one day you are available.')
      return
    }
    setSaving(true)
    try {
      await saveProfileData(session.user.id, values)
      if (Object.values(measurements).some((value) => value.trim() !== '')) {
        await saveMeasurement(session.user.id, { measured_at: measurementDate, values: measurements, notes: '' })
      }
      await refreshProfile()
      navigate('/today', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <section className="page-content"><p role="status">Loading your profile options…</p></section>
  if (!data) return <section className="page-content"><p className="form-error" role="alert">{error ?? 'Profile data is unavailable.'}</p></section>

  return (
    <section className="page-content" aria-labelledby="onboarding-title">
      <p className="eyebrow">LET’S GET STARTED</p>
      <h1 id="onboarding-title">Set up your profile</h1>
      <p className="form-intro page-intro">A few details help your planner fit your routine. Your goals and measurements are profile information only.</p>
      <form className="card form-card profile-form" onSubmit={submit}>
        <ProfileFields values={values} data={data} onChange={setValues} />
        <fieldset className="form-section">
          <legend>Optional measurements</legend>
          <p className="field-help">Measurements are private tracking records and do not affect your plan. You can skip this section.</p>
          <label className="field-label" htmlFor="onboarding-measured-at">Measurement date</label>
          <input id="onboarding-measured-at" type="date" value={measurementDate} onChange={(event) => setMeasurementDate(event.target.value)} />
          <div className="field-grid measurement-grid">
            {measurementFields.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="field-label" htmlFor={`onboarding-${key}`}>{label} <span className="optional-note">({unit}, optional)</span></label>
                <input id={`onboarding-${key}`} type="number" min="0.01" step="0.01" value={measurements[key]} onChange={(event) => setMeasurements({ ...measurements, [key]: event.target.value })} />
              </div>
            ))}
          </div>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving your profile…' : 'Save and continue'}</button>
      </form>
    </section>
  )
}
