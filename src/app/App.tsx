import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'

const pages = [
  { path: '/login', title: 'Welcome back', description: 'Sign in to continue to your personal fitness planner.' },
  { path: '/onboarding', title: 'Set up your profile', description: 'Your profile setup will live here.' },
  { path: '/today', title: 'Today', description: 'Your daily recommendation will appear here.' },
  { path: '/week', title: 'Your week', description: 'Your weekly plan will appear here.' },
  { path: '/workout/:id', title: 'Workout', description: 'Your workout details will appear here.' },
  { path: '/history', title: 'History', description: 'Your completed activity will appear here.' },
  { path: '/profile', title: 'Profile', description: 'Your personal fitness settings will appear here.' },
]

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/today" replace />} />
          {pages.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={<PlaceholderPage title={page.title} description={page.description} />}
            />
          ))}
          <Route path="*" element={<PlaceholderPage title="Page not found" description="The page you requested does not exist." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
