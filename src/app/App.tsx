import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage'
import { LoginPage } from '../features/auth/LoginPage'
import { PublicOnly, RequireAuthenticated } from '../features/auth/RouteGuards'
import { OnboardingPage } from '../features/onboarding/OnboardingPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { TodayPage, WeekPage, WorkoutPage } from '../features/planner/PlannerPages'

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
            <Route path="/today" element={<RequireAuthenticated><TodayPage /></RequireAuthenticated>} />
            <Route path="/week" element={<RequireAuthenticated><WeekPage /></RequireAuthenticated>} />
            <Route path="/workout/:id" element={<RequireAuthenticated><WorkoutPage /></RequireAuthenticated>} />
            <Route path="/history" element={<RequireAuthenticated><PlaceholderPage title="History" description="Your completed activity will appear here." /></RequireAuthenticated>} />
            <Route path="*" element={<RequireAuthenticated><PlaceholderPage title="Page not found" description="The page you requested does not exist." /></RequireAuthenticated>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
