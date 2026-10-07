import { useState } from 'react'
import { deleteMeasurement, saveMeasurement } from '../../lib/profileData'
import { measurementFields } from '../../types/profile'
import type { MeasurementInput } from '../../lib/profileData'
import type { MeasurementKey, MeasurementRecord } from '../../types/profile'

type Props = {
  userId: string
  measurements: MeasurementRecord[]
  onChanged: () => Promise<void>
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

export function MeasurementManager({ userId, measurements, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MeasurementInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      await saveMeasurement(userId, form, editingId ?? undefined)
      setForm(null)
      setEditingId(null)
      await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this measurement.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this measurement record?')) return
    setError(null)
    try {
      await deleteMeasurement(userId, id)
      await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this measurement.')
    }
  }

  return (
    <section className="measurement-section" aria-labelledby="measurements-title">
      <div className="section-heading-row">
        <div>
          <h2 id="measurements-title">Measurement history</h2>
          <p className="field-help">Each entry is saved by date. New measurements do not replace older entries.</p>
        </div>
        {!form && <button className="button button-secondary" type="button" onClick={startNew}>Add measurement</button>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {form && (
        <form className="card form-card measurement-form" onSubmit={submit}>
          <h3>{editingId ? 'Edit measurement' : 'New measurement'}</h3>
          <label className="field-label" htmlFor="measured-at">Date</label>
          <input id="measured-at" type="date" required value={form.measured_at} onChange={(event) => setForm({ ...form, measured_at: event.target.value })} />
          <div className="field-grid measurement-grid">
            {measurementFields.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="field-label" htmlFor={`measure-${key}`}>{label} <span className="optional-note">({unit})</span></label>
                <input id={`measure-${key}`} type="number" min="0.01" step="0.01" value={form.values[key]} onChange={(event) => setForm({ ...form, values: { ...form.values, [key]: event.target.value } })} />
              </div>
            ))}
          </div>
          <label className="field-label" htmlFor="measurement-notes">Notes <span className="optional-note">(optional)</span></label>
          <textarea id="measurement-notes" maxLength={500} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save measurement'}</button>
            <button className="button button-quiet" type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      {measurements.length === 0 ? (
        <p className="empty-state">No measurements saved yet. Adding them is optional.</p>
      ) : (
        <ul className="measurement-list">
          {measurements.map((record) => (
            <li className="card measurement-record" key={record.id}>
              <div className="measurement-record-heading">
                <h3><time dateTime={record.measured_at}>{new Date(`${record.measured_at}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></h3>
                <div className="button-row compact-actions">
                  <button className="text-button" type="button" onClick={() => startEdit(record)}>Edit</button>
                  <button className="text-button danger-text" type="button" onClick={() => void remove(record.id)}>Delete</button>
                </div>
              </div>
              <dl className="measurement-values">
                {measurementFields.filter(({ key }) => record[key] !== null).map(({ key, label, unit }) => (
                  <div key={key}><dt>{label}</dt><dd>{record[key]} {unit}</dd></div>
                ))}
              </dl>
              {record.notes && <p className="measurement-notes">{record.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
