import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../src/app/App'

afterEach(cleanup)

describe('application foundation', () => {
  it.each([
    ['/login', 'Welcome back'],
    ['/onboarding', 'Set up your profile'],
    ['/today', 'Today'],
    ['/week', 'Your week'],
    ['/workout/sample-workout', 'Workout'],
    ['/history', 'History'],
    ['/profile', 'Profile'],
  ])('renders the %s route', (path, title) => {
    window.history.pushState({}, '', path)
    render(<App />)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    if (path !== '/login' && path !== '/onboarding') {
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    }
  })
})
