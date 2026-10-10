import type { ChangeEvent } from 'react'
import { fitnessLevels, goals, weekDays } from '../../types/profile'
import type { ProfileData, ProfileFormValues } from '../../types/profile'
import { useI18n } from '../../lib/i18n'
import { localizeEquipmentName } from '../../lib/catalogueTranslations'

type Props = {
  values: ProfileFormValues
  data: ProfileData
  onChange: (values: ProfileFormValues) => void
  section?: 'personal' | 'training' | 'all'
}

const preferenceOptions = [
  { key: 'strength', label: 'Strength' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'walking', label: 'Walking' },
  { key: 'hiit', label: 'HIIT' },
  { key: 'mobility', label: 'Mobility' },
] as const

export function ProfileFields({ values, data, onChange, section = 'all' }: Props) {
  const { t, language } = useI18n()
  function setText(key: 'displayName' | 'primaryGoal' | 'secondaryGoal' | 'fitnessLevel', event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    onChange({ ...values, [key]: event.target.value })
  }

  return (
    <>
      {section !== 'training' ? <fieldset className="form-section">
        <legend className={section === 'personal' ? 'sr-only' : undefined}>{t(section === 'all' ? 'About you' : 'Personal details')}</legend>
        <label className="field-label" htmlFor="display-name">{t('Name')} <span className="optional-note">{t('(optional)')}</span></label>
        <input id="display-name" autoComplete="name" maxLength={80} value={values.displayName} onChange={(event) => setText('displayName', event)} />
        <label className="field-label" htmlFor="primary-goal">{t('Primary goal')}</label>
        <select id="primary-goal" required value={values.primaryGoal} onChange={(event) => setText('primaryGoal', event)}>
          <option value="">{t('Choose a goal')}</option>
          {goals.map((goal) => <option key={goal.value} value={goal.value}>{t(goal.label)}</option>)}
        </select>
        {section === 'all' && <><label className="field-label" htmlFor="secondary-goal">{t('Secondary goal')} <span className="optional-note">{t('(optional)')}</span></label><select id="secondary-goal" value={values.secondaryGoal} onChange={(event) => setText('secondaryGoal', event)}><option value="">{t('None')}</option>{goals.map((goal) => <option key={goal.value} value={goal.value}>{t(goal.label)}</option>)}</select></>}
        <label className="field-label" htmlFor="fitness-level">{t('Fitness level')}</label>
        <select id="fitness-level" required value={values.fitnessLevel} onChange={(event) => setText('fitnessLevel', event)}>
          <option value="">{t('Choose your level')}</option>
          {fitnessLevels.map((level) => <option key={level.value} value={level.value}>{t(level.label)}</option>)}
        </select>
      </fieldset> : null}
      {section !== 'personal' && <>

      <fieldset className="form-section">
        <legend>{t('When you’re available')}</legend>
        <p className="field-help">{t('Choose at least one day.')}</p>
        <div className="option-grid day-grid">
          {weekDays.map(({ key, label }) => (
            <label className="check-option" key={key}>
              <input type="checkbox" checked={values.days[key]} onChange={(event) => onChange({ ...values, days: { ...values.days, [key]: event.target.checked } })} />
              <span>{t(label).slice(0, 3)}</span>
            </label>
          ))}
        </div>
        <label className="field-label" htmlFor="duration">{t('Usual workout time')}</label>
        <div className="input-with-suffix">
          <input id="duration" type="number" min={5} max={240} step={5} required value={values.duration} onChange={(event) => onChange({ ...values, duration: Number(event.target.value) })} />
          <span>{t('minutes')}</span>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>{t('Training preferences')}</legend>
        <p className="field-help">{t('Choose any activities you tend to like.')}</p>
        <div className="option-grid">
          {preferenceOptions.map(({ key, label }) => (
            <label className="check-option" key={key}>
              <input type="checkbox" checked={values.likes[key]} onChange={(event) => onChange({ ...values, likes: { ...values.likes, [key]: event.target.checked } })} />
            <span>{t(label)}</span>
            </label>
          ))}
        </div>
        <label className="check-option full-option">
          <input type="checkbox" checked={values.canGoOutside} onChange={(event) => onChange({ ...values, canGoOutside: event.target.checked })} />
          <span>{t('I can exercise outdoors')}</span>
        </label>
        {values.canGoOutside && (
          <label className="check-option full-option nested-option">
            <input type="checkbox" checked={values.outsideWeatherDependent} onChange={(event) => onChange({ ...values, outsideWeatherDependent: event.target.checked })} />
            <span>{t('Outdoor exercise depends on the weather')}</span>
          </label>
        )}
      </fieldset>

      <fieldset className="form-section">
        <legend>{t('Equipment')}</legend>
        <p className="field-help">{t('Choose the equipment you can use. No equipment is a valid option.')}</p>
        <div className="option-grid">
          {data.equipment.map((item) => (
            <label className="check-option" key={item.id}>
              <input type="checkbox" checked={values.equipmentIds.includes(item.id)} onChange={(event) => {
                const equipmentIds = event.target.checked
                  ? [...values.equipmentIds, item.id]
                  : values.equipmentIds.filter((id) => id !== item.id)
                onChange({ ...values, equipmentIds })
              }} />
              <span>{localizeEquipmentName(item.slug, item.name, language)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      </>}
    </>
  )
}
