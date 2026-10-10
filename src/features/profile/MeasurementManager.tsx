import { useEffect, useRef, useState } from 'react'
import type { Blocker } from 'react-router-dom'
import { deleteMeasurement, saveMeasurement } from '../../lib/profileData'
import { useI18n } from '../../lib/i18n'
import { measurementFields } from '../../types/profile'
import type { MeasurementInput } from '../../lib/profileData'
import type { MeasurementKey, MeasurementRecord } from '../../types/profile'

type Props = {
  userId: string
  measurements: MeasurementRecord[]
  onChanged: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  blocker: Blocker
}

function newMeasurement(): MeasurementInput {
  return {
    measured_at: new Date().toISOString().slice(0, 10),
    values: { weight_kg: '', height_cm: '', waist_cm: '', chest_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '' },
    notes: '',
  }
}

function fromRecord(record: MeasurementRecord): MeasurementInput {
  return {
    measured_at: record.measured_at,
    values: Object.fromEntries(measurementFields.map(({ key }) => [key, record[key]?.toString() ?? ''])) as Record<MeasurementKey, string>,
    notes: record.notes ?? '',
  }
}

export function MeasurementManager({ userId, measurements, onChanged, onDirtyChange, blocker }: Props) {
  const { t, language } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MeasurementInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveAndLeaveRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (blocker.state === 'blocked') saveAndLeaveRef.current?.focus() }, [blocker.state])
  useEffect(() => { onDirtyChange(form !== null) }, [form, onDirtyChange])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
    }
  }, [form])

  function startNew() {
    setError(null)
    setEditingId(null)
    setForm(newMeasurement())
  }

  function startEdit(record: MeasurementRecord) {
    setError(null)
    setEditingId(record.id)
    setForm(fromRecord(record))
  }

  async function saveCurrentForm() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      await saveMeasurement(userId, form, editingId ?? undefined)
      setForm(null)
      setEditingId(null)
    } catch {
      setError(t('Could not save this measurement.'))
      return
    } finally {
      setSaving(false)
    }
    if (blocker.state === 'blocked') blocker.proceed()
    else {
      try { await onChanged() }
      catch { setError(t('Could not refresh measurements.')) }
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveCurrentForm()
  }

  async function remove(id: string) {
    if (!window.confirm(t('Delete this measurement record?'))) return
    setError(null)
    try {
      await deleteMeasurement(userId, id)
      await onChanged()
    } catch {
      setError(t('Could not delete this measurement.'))
    }
  }

  return (
    <section className="measurement-section" aria-labelledby="measurements-title">
      <div className="section-heading-row">
        <div>
          <h2 id="measurements-title">{t('Measurement history')}</h2>
          <p className="field-help">{t('Each entry is saved by date. New measurements do not replace older entries.')}</p>
        </div>
        {!form && <button className="button button-secondary" type="button" onClick={startNew}>{t('Add measurement')}</button>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {form && (
        <form className="card form-card measurement-form" onSubmit={submit}>
          <h3>{editingId ? t('Edit measurement') : t('New measurement')}</h3>
          <label className="field-label" htmlFor="measured-at">{t('Date')}</label>
          <input id="measured-at" type="date" required value={form.measured_at} onChange={(event) => setForm({ ...form, measured_at: event.target.value })} />
          <div className="field-grid measurement-grid">
            {measurementFields.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="field-label" htmlFor={`measure-${key}`}>{t(label)} <span className="optional-note">({unit})</span></label>
                <input id={`measure-${key}`} type="number" min="0.01" step="0.01" value={form.values[key]} onChange={(event) => setForm({ ...form, values: { ...form.values, [key]: event.target.value } })} />
              </div>
            ))}
          </div>
          <label className="field-label" htmlFor="measurement-notes">{t('Notes')} <span className="optional-note">{t('(optional)')}</span></label>
          <textarea id="measurement-notes" maxLength={500} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? t('Saving…') : t('Save measurement')}</button>
            <button className="button button-quiet" type="button" onClick={() => setForm(null)}>{t('Cancel')}</button>
          </div>
        </form>
      )}
      {measurements.length === 0 ? (
        <p className="empty-state">{t('No measurements saved yet. Adding them is optional.')}</p>
      ) : (
        <ul className="measurement-list">
          {measurements.map((record) => (
            <li className="card measurement-record" key={record.id}>
              <div className="measurement-record-heading">
                <h3><time dateTime={record.measured_at}>{new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${record.measured_at}T12:00:00`))}</time></h3>
                <div className="button-row compact-actions">
                  <button className="text-button" type="button" onClick={() => startEdit(record)}>{t('Edit')}</button>
                  <button className="text-button danger-text" type="button" onClick={() => void remove(record.id)}>{t('Delete')}</button>
                </div>
              </div>
              <dl className="measurement-values">
                {measurementFields.filter(({ key }) => record[key] !== null).map(({ key, label, unit }) => (
                  <div key={key}><dt>{t(label)}</dt><dd>{record[key]} {unit}</dd></div>
                ))}
              </dl>
              {record.notes && <p className="measurement-notes">{record.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      {blocker.state === 'blocked' && <div className="dialog-backdrop" role="presentation"><section className="card confirm-dialog unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="measurement-unsaved-title" aria-describedby="measurement-unsaved-description" onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')]
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
      }}>
        <h2 id="measurement-unsaved-title">{t('Unsaved changes')}</h2><p id="measurement-unsaved-description">{t('Save your changes before leaving this screen?')}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="button-row"><button ref={saveAndLeaveRef} className="button button-primary" type="button" disabled={saving} onClick={() => void saveCurrentForm()}>{t('Save and leave')}</button><button className="button button-secondary" type="button" disabled={saving} onClick={() => { setForm(null); setEditingId(null); blocker.proceed() }}>{t('Discard changes and leave')}</button><button className="text-button" type="button" onClick={() => blocker.reset()}>{t('Continue editing')}</button></div>
      </section></div>}
    </section>
  )
}
