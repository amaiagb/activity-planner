import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'

const supabaseMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
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
    supabaseMocks.signInWithPassword.mockResolvedValue({ error: null })
    supabaseMocks.signUp.mockResolvedValue({ data: { session: { user: { id: 'new-user' } } }, error: null })
  })

  it('signs in with email and password', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    const email = screen.getByRole('textbox', { name: 'Email address' })
    expect(email).toHaveAttribute('type', 'email')
    fireEvent.change(email, { target: { value: 'person@example.com' } })
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.change(password, { target: { value: 'safe-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(supabaseMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'safe-password',
    }))
  })

  it('creates an account and explains when email confirmation is required', async () => {
    supabaseMocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'safe-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('confirm your address')
    expect(supabaseMocks.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'safe-password' })
  })

  it('shows authentication errors clearly', async () => {
    supabaseMocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('redirects unauthenticated users away from protected profile data', async () => {
    window.history.pushState({}, '', '/profile')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users away from protected history data', async () => {
    window.history.pushState({}, '', '/history')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users away from the exercise catalogue', async () => {
    window.history.pushState({}, '', '/exercises')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Exercises' })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users away from exercise tutorials', async () => {
    window.history.pushState({}, '', '/exercises/exercise-id')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Exercises' })).not.toBeInTheDocument()
  })

  it('requires authentication before profile onboarding', async () => {
    window.history.pushState({}, '', '/onboarding')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Set up your profile' })).not.toBeInTheDocument()
  })
})
