import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    let active = true

    async function completeSignIn() {
      if (!supabase) {
        if (active) setError('Authentication is not configured.')
        return
      }

      const code = new URLSearchParams(window.location.search).get('code')

      if (!code) {
        if (active) setError('The sign-in link is missing its authentication code.')
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!active) return

      if (exchangeError) {
        setError(exchangeError.message)
        return
      }

      setComplete(true)
    }

    void completeSignIn()

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <section className="page-content" aria-labelledby="callback-title">
        <p className="eyebrow">SECURE SIGN-IN</p>
        <h1 id="callback-title">Sign-in failed</h1>
        <div className="card form-card">
          <p>{error}</p>
        </div>
      </section>
    )
  }

  if (complete) {
    return <Navigate to="/today" replace />
  }

  return (
    <section className="page-content" aria-labelledby="callback-title">
      <p className="eyebrow">SECURE SIGN-IN</p>
      <h1 id="callback-title">Signing you in…</h1>
      <div className="card form-card">
        <p>Completing your sign-in…</p>
      </div>
    </section>
  )
}