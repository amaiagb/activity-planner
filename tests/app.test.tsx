import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'

const supabaseMocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('../src/lib/supabase', () => ({
  hasSupabaseConfig: true,
  supabase: { auth: supabaseMocks },
}))

afterEach(cleanup)

describe('authentication foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    supabaseMocks.signInWithOtp.mockResolvedValue({ error: null })
  })

  it('sends a magic link without offering account creation', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    const email = screen.getByRole('textbox', { name: 'Email address' })
    expect(email).toHaveAttribute('type', 'email')
    fireEvent.change(email, { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send login link' }))

    await screen.findByRole('status')
    expect(supabaseMocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false },
    })
  })

  it('redirects unauthenticated users away from protected profile data', async () => {
    window.history.pushState({}, '', '/profile')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('requires authentication before profile onboarding', async () => {
    window.history.pushState({}, '', '/onboarding')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Set up your profile' })).not.toBeInTheDocument()
  })
})
