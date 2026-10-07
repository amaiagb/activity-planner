import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage'
import { LoginPage } from '../features/auth/LoginPage'
import { PublicOnly, RequireAuthenticated } from '../features/auth/RouteGuards'
import { OnboardingPage } from '../features/onboarding/OnboardingPage'
import { ProfilePage } from '../features/profile/ProfilePage'

const pages = [
  { path: '/today', title: 'Today', description: 'Your daily recommendation will appear here.' },
  { path: '/week', title: 'Your week', description: 'Your weekly plan will appear here.' },
  { path: '/workout/:id', title: 'Workout', description: 'Your workout details will appear here.' },
  { path: '/history', title: 'History', description: 'Your completed activity will appear here.' },
]

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/onboarding" element={<RequireAuthenticated onboardingOnly><OnboardingPage /></RequireAuthenticated>} />
            <Route path="/auth/callback" element={<RequireAuthenticated><AuthCallbackPage /></RequireAuthenticated>} />
            <Route path="/profile" element={<RequireAuthenticated><ProfilePage /></RequireAuthenticated>} />
            {pages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={<RequireAuthenticated><PlaceholderPage title={page.title} description={page.description} /></RequireAuthenticated>}
              />
            ))}
            <Route path="*" element={<RequireAuthenticated><PlaceholderPage title="Page not found" description="The page you requested does not exist." /></RequireAuthenticated>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
