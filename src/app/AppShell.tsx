import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNavigation } from '../components/BottomNavigation'
import { useI18n } from '../lib/i18n'

export function AppShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const isSetupRoute = pathname === '/login' || pathname === '/onboarding'
  const isExerciseDetail = /^\/exercises\/[^/]+/.test(pathname)

  return (
    <div className="app-shell">
      <header className="topbar" inert={isExerciseDetail || undefined} aria-hidden={isExerciseDetail || undefined}>
        <Link className="brand" to="/today" aria-label={t('Personal Fitness Planner home')}>
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>Fitness Planner</span>
        </Link>
        <span className="topbar-note">{t('A little movement, every day')}</span>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      {!isSetupRoute && <BottomNavigation inert={isExerciseDetail} />}
    </div>
  )
}
