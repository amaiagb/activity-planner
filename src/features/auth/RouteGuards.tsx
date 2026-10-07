import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hasSupabaseConfig } from '../../lib/supabase'
import { useAuth } from './useAuth'

function AuthMessage({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <section className="page-content" aria-labelledby="auth-message-title">
      <p className="eyebrow">PERSONAL FITNESS PLANNER</p>
      <h1 id="auth-message-title">{title}</h1>
      <div className="card form-card">
        <p>{message}</p>
        {action}
      </div>
    </section>
  )
}

export function RequireAuthenticated({ children, onboardingOnly = false }: { children: ReactNode; onboardingOnly?: boolean }) {
  const { status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthMessage title="Loading your account" message="Checking your saved profile…" />
  if (status === 'unconfigured') {
    return <AuthMessage title="Setup required" message="Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your local .env file, then restart the app." />
  }
  if (status === 'error') return <AuthMessage title="Could not load your account" message={error ?? 'Please try again.'} action={<button className="button button-secondary" onClick={retry}>Try again</button>} />
  if (status === 'signed_out') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (onboardingOnly && status === 'authenticated') return <Navigate to="/today" replace />
  if (!onboardingOnly && status === 'onboarding') return <Navigate to="/onboarding" replace />
  return children
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <AuthMessage title="Loading your account" message="Checking your sign-in link…" />
  if (status === 'onboarding') return <Navigate to="/onboarding" replace />
  if (status === 'authenticated') return <Navigate to="/today" replace />
  return children
}

export function SupabaseSetupHint() {
  return hasSupabaseConfig ? null : (
    <p className="form-notice" role="status">
      Authentication is not configured yet. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code>.
    </p>
  )
}
