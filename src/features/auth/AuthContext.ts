import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'signed_out' | 'onboarding' | 'authenticated' | 'unconfigured' | 'error'

export type AuthContextValue = {
  session: Session | null
  status: AuthStatus
  error: string | null
  refreshProfile: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
