import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { hasSupabaseConfig, supabase } from '../../lib/supabase'
import { AuthContext } from './AuthContext'
import type { AuthStatus } from './AuthContext'

async function profileIsComplete(userId: string): Promise<boolean> {
  if (!supabase) return false
  const [profileResult, availabilityResult, preferencesResult] = await Promise.all([
    supabase.from('profiles').select('primary_goal, fitness_level').eq('user_id', userId).maybeSingle(),
    supabase.from('availability').select('monday, tuesday, wednesday, thursday, friday, saturday, sunday').eq('user_id', userId).maybeSingle(),
    supabase.from('preferences').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  const error = profileResult.error ?? availabilityResult.error ?? preferencesResult.error
  if (error) throw new Error(error.message)
  const hasDay = availabilityResult.data
    ? Object.values(availabilityResult.data).some(Boolean)
    : false
  return Boolean(profileResult.data?.primary_goal && profileResult.data.fitness_level && hasDay && preferencesResult.data)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(hasSupabaseConfig ? 'loading' : 'unconfigured')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const requestId = useRef(0)

  const applySession = useCallback(async (nextSession: Session | null) => {
    const request = ++requestId.current
    setSession(nextSession)
    setError(null)
    if (!nextSession) {
      setStatus('signed_out')
      return
    }
    setStatus('loading')
    try {
      const complete = await profileIsComplete(nextSession.user.id)
      if (request === requestId.current) setStatus(complete ? 'authenticated' : 'onboarding')
    } catch (cause) {
      if (request !== requestId.current) return
      setError(cause instanceof Error ? cause.message : 'Could not load your profile.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured')
      return
    }
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) window.setTimeout(() => { if (active) void applySession(nextSession) }, 0)
    })
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
        setStatus('error')
      } else {
        void applySession(data.session)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession, retryCount])

  const refreshProfile = useCallback(async () => {
    if (session) await applySession(session)
  }, [applySession, session])

  return (
    <AuthContext.Provider value={{ session, status, error, refreshProfile, retry: () => setRetryCount((value) => value + 1) }}>
      {children}
    </AuthContext.Provider>
  )
}
