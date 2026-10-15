import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/features/auth/AuthContext'
import { TodayPage } from '../src/features/planner/PlannerPages'

const plannerMocks = vi.hoisted(() => ({ loadPlannerContext: vi.fn(), loadSavedTemplates: vi.fn(), loadSavedResources: vi.fn() }))

vi.mock('../src/features/planner/plannerData', () => ({
  completeWorkout: vi.fn(), createStandaloneWorkout: vi.fn(), deleteResource: vi.fn(), deleteTemplate: vi.fn(), loadActiveSession: vi.fn(), loadPlannerContext: plannerMocks.loadPlannerContext,
  loadSavedResources: plannerMocks.loadSavedResources, loadSavedTemplates: plannerMocks.loadSavedTemplates, saveResource: vi.fn(), setExerciseStatus: vi.fn(), startWorkout: vi.fn(), toggleResourceFavorite: vi.fn(), toggleTemplateFavorite: vi.fn(),
}))

function renderPage(path: '/today' | '/templates') {
  const session = { user: { id: 'authenticated-user' } }
  return render(<AuthContext.Provider value={{ session: session as never, status: 'authenticated', error: null, refreshProfile: vi.fn(), retry: vi.fn() }}><MemoryRouter initialEntries={[path]}><Routes><Route path="/today" element={<TodayPage />} /><Route path="/templates" element={<TodayPage />} /></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('planner pages', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    plannerMocks.loadPlannerContext.mockResolvedValue({ exercises: {}, input: { equipment: [] }, equipmentLabels: [], databaseExerciseIds: {} })
    plannerMocks.loadSavedTemplates.mockResolvedValue([])
    plannerMocks.loadSavedResources.mockResolvedValue([])
  })
  it('renders the two daily training actions', async () => {
    renderPage('/today')
    expect(await screen.findByRole('heading', { name: 'Train' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create workout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use a template' })).toBeInTheDocument()
    expect(plannerMocks.loadPlannerContext).toHaveBeenCalledWith('authenticated-user')
  })
  it('renders the template and resource collection entry points', async () => {
    renderPage('/templates')
    expect(await screen.findByRole('heading', { name: 'Routines' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New template/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add resource/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View all templates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View all resources/i })).toBeInTheDocument()
  })
})
