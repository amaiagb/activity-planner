import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SupabaseSetupHint } from './RouteGuards'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!supabase) {
      setError('Connect a Supabase project before requesting a sign-in link.')
      return
    }
    setSending(true)
    const { error: requestError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // shouldCreateUser: false,
      },
    })
    setSending(false)
    if (requestError) setError(requestError.message)
    else setMessage('Check your email for a secure sign-in link. You can close this page after opening it on this device.')
  }

  return (
    <section className="page-content" aria-labelledby="login-title">
      <p className="eyebrow">PERSONAL FITNESS PLANNER</p>
      <h1 id="login-title">Welcome back</h1>
      <div className="card form-card">
        <p className="form-intro">Sign in with a one-time link sent to your email.</p>
        <SupabaseSetupHint />
        <form onSubmit={submit} className="stack-form">
          <label className="field-label" htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="button button-primary" type="submit" disabled={sending || !supabase}>
            {sending ? 'Sending…' : 'Send login link'}
          </button>
        </form>
        {message && <p className="form-notice" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
