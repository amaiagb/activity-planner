import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { useMemo } from 'react'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { PublicOnly, RequireAuthenticated } from '../features/auth/RouteGuards'
import { OnboardingPage } from '../features/onboarding/OnboardingPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { TodayPage, WeekPage, WorkoutPage } from '../features/planner/PlannerPages'
import { HistoryPage } from '../features/history/HistoryPage'
import { ExerciseDetailPage, ExercisesPage } from '../features/exercises/ExercisePages'
import { I18nProvider } from '../lib/i18n'

export function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    </AuthProvider>
  )
}

function AppRoutes() {
  const router = useMemo(() => createBrowserRouter(createRoutesFromElements(
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/onboarding" element={<RequireAuthenticated onboardingOnly><OnboardingPage /></RequireAuthenticated>} />
            <Route path="/profile/:section?" element={<RequireAuthenticated><ProfilePage /></RequireAuthenticated>} />
            <Route path="/today" element={<RequireAuthenticated><TodayPage /></RequireAuthenticated>} />
            <Route path="/week" element={<RequireAuthenticated><WeekPage /></RequireAuthenticated>} />
            <Route path="/workout/:id" element={<RequireAuthenticated><WorkoutPage /></RequireAuthenticated>} />
            <Route path="/history" element={<RequireAuthenticated><HistoryPage /></RequireAuthenticated>} />
            <Route path="/exercises" element={<RequireAuthenticated><ExercisesPage /></RequireAuthenticated>}>
              <Route index element={null} />
              <Route path=":exerciseId" element={<ExerciseDetailPage />} />
            </Route>
            <Route path="*" element={<RequireAuthenticated><PlaceholderPage title="Page not found" description="The page you requested does not exist." /></RequireAuthenticated>} />
          </Route>
  )), [])
  return <RouterProvider router={router} />
}
