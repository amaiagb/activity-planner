import { Outlet, useLocation } from 'react-router-dom'
import { BottomNavigation } from '../components/BottomNavigation'

export function AppShell() {
  const { pathname } = useLocation()
  const isSetupRoute = pathname === '/login' || pathname === '/onboarding'
  const isExerciseDetail = /^\/exercises\/[^/]+/.test(pathname)

  return (
    <div className="app-shell">
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      {!isSetupRoute && <BottomNavigation inert={isExerciseDetail} />}
    </div>
  )
}
