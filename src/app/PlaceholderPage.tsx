type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="page-content" aria-labelledby="page-title">
      <p className="eyebrow">PERSONAL FITNESS PLANNER</p>
      <h1 id="page-title">{title}</h1>
      <div className="card placeholder-card">
        <div className="placeholder-icon" aria-hidden="true">✳</div>
        <p>{description}</p>
        <span className="status-chip">Foundation</span>
      </div>
    </section>
  )
}
