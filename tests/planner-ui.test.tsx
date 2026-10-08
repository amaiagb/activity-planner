import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/features/auth/AuthContext'
import type { PlannerContext } from '../src/features/planner/plannerData'
import { TodayPage, WeekPage } from '../src/features/planner/PlannerPages'
import type { PlannedWorkout, WeeklyPlan } from '../src/planner'

const plannerMocks = vi.hoisted(() => ({
  currentWeekStart: vi.fn(),
  loadPlannerContext: vi.fn(),
  getOrCreateWeeklyPlan: vi.fn(),
}))

vi.mock('../src/features/planner/plannerData', () => ({
  completeWorkout: vi.fn(),
  currentWeekStart: plannerMocks.currentWeekStart,
  getOrCreateWeeklyPlan: plannerMocks.getOrCreateWeeklyPlan,
  loadActiveSession: vi.fn(),
  loadPlannerContext: plannerMocks.loadPlannerContext,
  regenerateDay: vi.fn(),
  regenerateWeek: vi.fn(),
  setExerciseStatus: vi.fn(),
  skipPlannedWorkout: vi.fn(),
  startWorkout: vi.fn(),
}))

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function monday(value: string) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fixturePlan(): WeeklyPlan {
  const date = localToday()
  const workout: PlannedWorkout = {
    id: 'saved-workout-id', date, templateSlug: 'strength_full_body_a', name: 'Full-body strength A', category: 'strength',
    durationMinutes: 30, exercises: [{ id: 'exercise-id', slug: 'bodyweight_squat', name: 'Bodyweight squat', prescribedSets: 3, prescribedReps: '8–12', prescribedDurationSeconds: null, restSeconds: 60 }],
    status: 'planned', isOutdoor: false, intensity: 'high', movementPatterns: ['squat'], muscleGroups: ['quadriceps'],
  }
  return { weekStart: monday(date), requestedSessions: 1, workouts: [workout], unscheduledSessions: [] }
}

function renderPage(path: '/today' | '/week') {
  const session = { user: { id: 'authenticated-user' } }
  return render(
    <AuthContext.Provider value={{ session: session as never, status: 'authenticated', error: null, refreshProfile: vi.fn(), retry: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/week" element={<WeekPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('planner pages', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    const plan = fixturePlan()
    plannerMocks.currentWeekStart.mockReturnValue(plan.weekStart)
    plannerMocks.loadPlannerContext.mockResolvedValue({ exercises: {} } as PlannerContext)
    plannerMocks.getOrCreateWeeklyPlan.mockResolvedValue(plan)
  })

  it('renders today after loading or creating the authenticated user weekly plan', async () => {
    renderPage('/today')

    expect(await screen.findByRole('heading', { name: 'Full-body strength A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start workout' })).toBeInTheDocument()
    expect(plannerMocks.loadPlannerContext).toHaveBeenCalledWith('authenticated-user')
    expect(plannerMocks.getOrCreateWeeklyPlan).toHaveBeenCalledWith('authenticated-user', expect.any(Object), expect.any(String))
  })

  it("renders the week's days and its persisted workout", async () => {
    renderPage('/week')

    expect(await screen.findByRole('heading', { name: 'Your week' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Full-body strength A' })).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
    expect(screen.getAllByText('Rest day')).toHaveLength(6)
  })
})
