import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExerciseDetailPage, ExercisesPage } from '../src/features/exercises/ExercisePages'
import { filterExercises, groupExercisesByLetter, instructionSteps } from '../src/features/exercises/exerciseCatalogueLogic'
import type { CatalogueExercise } from '../src/features/exercises/exerciseData'

const exerciseDataMocks = vi.hoisted(() => ({ loadExerciseCatalogue: vi.fn(), loadExerciseDetail: vi.fn() }))
vi.mock('../src/features/exercises/exerciseData', () => exerciseDataMocks)

const exercises: CatalogueExercise[] = [
  { id: 'squat', slug: 'bodyweight_squat', name: 'Bodyweight squat', description: 'A leg strength move.', instructions: 'Stand tall. Sit your hips back, then stand.', category: 'legs', movement_pattern: 'squat', difficulty: 'beginner', impact_level: 'low', is_outdoor: false, muscles: ['glutes', 'quadriceps'], equipment: [{ group: 1, slug: 'bodyweight', name: 'Bodyweight' }], media: [] },
  { id: 'bridge', slug: 'glute_bridge', name: 'Glute bridge', description: 'A floor exercise.', instructions: 'Lie down. Lift your hips.', category: 'legs', movement_pattern: 'hip_extension', difficulty: 'beginner', impact_level: 'low', is_outdoor: false, muscles: ['glutes'], equipment: [{ group: 1, slug: 'bodyweight', name: 'Bodyweight' }], media: [] },
  { id: 'press', slug: 'dumbbell_press', name: 'Dumbbell press', description: 'A shoulder movement.', instructions: 'Hold the weights. Press overhead.', category: 'push', movement_pattern: 'vertical_push', difficulty: 'beginner', impact_level: 'low', is_outdoor: false, muscles: ['shoulders'], equipment: [{ group: 1, slug: 'dumbbells', name: 'Dumbbells' }, { group: 2, slug: 'bench', name: 'Bench' }], media: [] },
]

function renderCatalogue() {
  return render(<MemoryRouter initialEntries={['/exercises']}><Routes><Route path="/exercises" element={<ExercisesPage />}><Route index element={null} /><Route path=":exerciseId" element={<ExerciseDetailPage />} /></Route></Routes></MemoryRouter>)
}

afterEach(cleanup)

describe('exercise catalogue', () => {
  afterEach(() => vi.clearAllMocks())

  it('combines search and relation-derived filters and groups results alphabetically', async () => {
    exerciseDataMocks.loadExerciseCatalogue.mockResolvedValue(exercises)
    renderCatalogue()

    expect(await screen.findByRole('link', { name: 'View Bodyweight squat' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'B', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'D', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'G', level: 2 })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Illustration not yet available/ })).toHaveLength(3)
    const scrollIntoView = vi.fn()
    Object.defineProperty(document.getElementById('exercise-group-G'), 'scrollIntoView', { value: scrollIntoView, configurable: true })
    fireEvent.click(screen.getByRole('button', { name: 'Jump to G' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search exercises' }), { target: { value: 'shoulder' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by body part' }), { target: { value: 'shoulders' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by equipment' }), { target: { value: 'dumbbells' } })
    expect(screen.getByRole('link', { name: 'View Dumbbell press' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View Bodyweight squat' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByRole('link', { name: 'View Bodyweight squat' })).toBeInTheDocument()
  })

  it('keeps list state when opening and closing a deep-linked tutorial', async () => {
    exerciseDataMocks.loadExerciseCatalogue.mockResolvedValue(exercises)
    exerciseDataMocks.loadExerciseDetail.mockResolvedValue(exercises[0])
    renderCatalogue()

    expect(await screen.findByRole('link', { name: 'View Bodyweight squat' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search exercises' }), { target: { value: 'squat' } })
    fireEvent.click(screen.getByRole('link', { name: 'View Bodyweight squat' }))
    expect(await screen.findByRole('heading', { name: 'Bodyweight squat', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustration not yet available for Bodyweight squat' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Instructions' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Back to exercises' }))
    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('squat'))
    expect(screen.getByRole('link', { name: 'View Bodyweight squat' })).toBeInTheDocument()
  })

  it('uses approved media and keeps the written tutorial available if that media fails', async () => {
    exerciseDataMocks.loadExerciseCatalogue.mockResolvedValue(exercises)
    exerciseDataMocks.loadExerciseDetail.mockResolvedValue({
      ...exercises[2],
      media: [{
        id: 'approved-press-illustration', media_kind: 'image', storage_path: 'press/guide.webp', thumbnail_path: 'press/thumb.webp', captions_path: null,
        alt_text: 'Press illustration showing the starting position', description: 'Starting position for the press', caption: null, transcript: null,
        source_name: 'Studio', source_url: null, license_name: 'CC BY 4.0', license_url: null, position: 1,
        thumbnail_url: '/signed-thumb.webp', media_url: '/signed-guide.webp',
      }],
    })
    render(<MemoryRouter initialEntries={['/exercises/press']}><Routes><Route path="/exercises" element={<ExercisesPage />}><Route path=":exerciseId" element={<ExerciseDetailPage />} /></Route></Routes></MemoryRouter>)

    const illustration = await screen.findByRole('img', { name: 'Press illustration showing the starting position' })
    expect(illustration).toHaveAttribute('src', '/signed-guide.webp')
    fireEvent.error(illustration)

    expect(await screen.findByRole('img', { name: 'Illustration not yet available for Dumbbell press' })).toBeInTheDocument()
    expect(screen.getByText('Hold the weights.')).toBeInTheDocument()
    expect(screen.getByText('Dumbbells and Bench')).toBeInTheDocument()
  })
})

describe('exercise catalogue helpers', () => {
  it('combines alternative and required equipment against the joined catalogue values', () => {
    expect(filterExercises(exercises, '', 'shoulders', 'bench').map((item) => item.name)).toEqual(['Dumbbell press'])
    expect(groupExercisesByLetter(exercises).map(([letter]) => letter)).toEqual(['B', 'D', 'G'])
    expect(instructionSteps('Stand tall. Sit your hips back, then stand.')).toEqual(['Stand tall.', 'Sit your hips back, then stand.'])
  })
})
