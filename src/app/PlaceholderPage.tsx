type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const { t } = useI18n()
  return (
    <section className="page-content" aria-labelledby="page-title">
      <p className="eyebrow">{t('PERSONAL FITNESS PLANNER')}</p>
      <h1 id="page-title">{t(title)}</h1>
      <div className="card placeholder-card">
        <div className="placeholder-icon" aria-hidden="true">✳</div>
        <p>{t(description)}</p>
        <span className="status-chip">{t('Foundation')}</span>
      </div>
    </section>
  )
}
import { useI18n } from '../lib/i18n'
