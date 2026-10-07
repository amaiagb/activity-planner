import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNavigation } from '../components/BottomNavigation'

export function AppShell() {
  const { pathname } = useLocation()
  const isSetupRoute = pathname === '/login' || pathname === '/onboarding' || pathname === '/auth/callback'

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/today" aria-label="Personal Fitness Planner home">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span>Fitness Planner</span>
        </Link>
        <span className="topbar-note">A little movement, every day</span>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      {!isSetupRoute && <BottomNavigation />}
    </div>
  )
}
