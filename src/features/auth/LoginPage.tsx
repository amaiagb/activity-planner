import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SupabaseSetupHint } from './RouteGuards'
import { useI18n } from '../../lib/i18n'

type AuthMode = 'sign_in' | 'sign_up'

export function LoginPage() {
  const { t } = useI18n()
  const [mode, setMode] = useState<AuthMode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!supabase) {
      setError(t('Connect a Supabase project before signing in.'))
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'sign_in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) {
          const translatedError = t(signInError.message)
          setError(translatedError === signInError.message && signInError.message !== 'Invalid login credentials'
            ? t('Sign-in failed. Check your details and try again.')
            : translatedError)
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) setError(t('Account creation failed. Check your details and try again.'))
        else if (!data.session) setMessage(t('Account created. Check your email and confirm your address before signing in.'))
      }
    } catch {
      setError(t('Authentication failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const signingIn = mode === 'sign_in'

  return (
    <section className="page-content" aria-labelledby="login-title">
      <p className="eyebrow">{t('PERSONAL FITNESS PLANNER')}</p>
      <h1 id="login-title">{t(signingIn ? 'Welcome back' : 'Create your account')}</h1>
      <div className="card form-card">
        <p className="form-intro">{t(signingIn ? 'Sign in with your email and password.' : 'Create an account with your email and a password.')}</p>
        <SupabaseSetupHint />
        <form onSubmit={submit} className="stack-form">
          <label className="field-label" htmlFor="login-email">{t('Email address')}</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="field-label" htmlFor="login-password">{t('Password')}</label>
          <input id="login-password" name="password" type="password" autoComplete={signingIn ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="button button-primary" type="submit" disabled={submitting || !supabase}>
            {submitting ? t('Please wait…') : signingIn ? t('Sign in') : t('Create account')}
          </button>
        </form>
        <p className="form-intro">
          {t(signingIn ? 'New here? ' : 'Already have an account? ')}
          <button className="text-button" type="button" disabled={submitting} onClick={() => { setMode(signingIn ? 'sign_up' : 'sign_in'); setMessage(null); setError(null) }}>
            {t(signingIn ? 'Create an account' : 'Sign in')}
          </button>
        </p>
        {message && <p className="form-notice" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
