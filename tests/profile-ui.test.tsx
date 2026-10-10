import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '../src/lib/i18n'
import { ProfilePage } from '../src/features/profile/ProfilePage'
import type { ProfileData } from '../src/types/profile'

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'user-1' } },
  from: vi.fn(),
  loadProfileData: vi.fn(),
  savePersonalData: vi.fn(),
  saveTrainingData: vi.fn(),
  deleteAccount: vi.fn(),
  saveMeasurement: vi.fn(),
  deleteMeasurement: vi.fn(),
  setExerciseExcluded: vi.fn(),
}))

vi.mock('../src/features/auth/useAuth', () => ({ useAuth: () => ({ session: mocks.session }) }))
vi.mock('../src/lib/supabase', () => ({ supabase: { from: mocks.from, auth: { signOut: vi.fn() } } }))
vi.mock('../src/lib/profileData', () => ({
  loadProfileData: mocks.loadProfileData,
  savePersonalData: mocks.savePersonalData,
  saveTrainingData: mocks.saveTrainingData,
  deleteAccount: mocks.deleteAccount,
  saveMeasurement: mocks.saveMeasurement,
  deleteMeasurement: mocks.deleteMeasurement,
  setExerciseExcluded: mocks.setExerciseExcluded,
}))

const profileData: ProfileData = {
  profile: { user_id: 'user-1', display_name: 'Amaia Example', primary_goal: 'lose_weight', secondary_goal: 'improve_strength', fitness_level: 'beginner' },
  availability: { user_id: 'user-1', monday: true, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false, default_duration_minutes: 30 },
  preferences: { user_id: 'user-1', likes_strength: true, likes_cardio: false, likes_walking: false, likes_hiit: false, likes_mobility: false, can_go_outside: false, outside_is_weather_dependent: false },
  equipmentIds: ['eq-1'], excludedExerciseIds: ['ex-1'],
  equipment: [{ id: 'eq-1', slug: 'bodyweight', name: 'Bodyweight (no equipment)', category: 'basic' }],
  exercises: [{ id: 'ex-1', slug: 'bodyweight_squat', name: 'Bodyweight squat', category: 'legs' }],
  measurements: [{ id: 'm-1', user_id: 'user-1', measured_at: '2026-06-01', weight_kg: 71.5, height_cm: null, waist_cm: null, chest_cm: null, hips_cm: null, arm_cm: null, thigh_cm: null, notes: null, created_at: '2026-06-01T10:00:00Z' }],
}

function renderProfile(path = '/profile') {
  const router = createMemoryRouter([{ path: '/profile/:section?', element: <ProfilePage /> }], { initialEntries: [path] })
  return render(<I18nProvider><RouterProvider router={router} /></I18nProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.loadProfileData.mockResolvedValue(profileData)
  mocks.savePersonalData.mockResolvedValue(undefined)
  mocks.saveTrainingData.mockResolvedValue(undefined)
  mocks.setExerciseExcluded.mockResolvedValue(undefined)
  mocks.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { language: 'en', theme: 'system' }, error: null }) }) }) }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('profile redesign', () => {
  it('shows the profile summary and keeps measurement values out of the overview', async () => {
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'Amaia Example' })).toBeInTheDocument()
    expect(screen.getByText('Lose weight · Beginner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Training/ })).toHaveAttribute('href', '/profile/training')
    expect(screen.getByRole('link', { name: /Edit personal details/ })).toHaveAttribute('href', '/profile/personal')
    expect(screen.queryByRole('link', { name: /Edit your name/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Measurements/ })).toHaveAttribute('href', '/profile/measurements')
    expect(screen.queryByText('71.5')).not.toBeInTheDocument()
    expect(screen.queryByText('Secondary goal')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete account permanently' })).not.toBeInTheDocument()
  })

  it('guards unsaved personal changes and discards them only after an explicit choice', async () => {
    renderProfile('/profile/personal')
    const name = await screen.findByLabelText(/Name/)
    expect(screen.queryByLabelText('Secondary goal')).not.toBeInTheDocument()
    fireEvent.change(name, { target: { value: 'Amaia Changed' } })
    fireEvent.click(screen.getByRole('link', { name: /Back to profile/ }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }))
    expect(screen.getByLabelText(/Name/)).toHaveValue('Amaia Changed')
    fireEvent.click(screen.getByRole('link', { name: /Back to profile/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes and leave' }))
    expect(await screen.findByRole('heading', { name: 'Amaia Example' })).toBeInTheDocument()
  })

  it('opens personal details from the profile card and places account deletion at the end of that page', async () => {
    renderProfile()
    fireEvent.click(await screen.findByRole('link', { name: /Edit personal details/ }))
    expect(await screen.findByRole('heading', { name: 'Personal details' })).toBeInTheDocument()
    expect(screen.queryByText('Profile', { selector: 'p.eyebrow' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete account permanently' })).toBeInTheDocument()
  })

  it('saves personal details independently from training preferences', async () => {
    renderProfile('/profile/personal')
    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: 'Updated name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Your profile has been saved.')).toBeInTheDocument()
    expect(mocks.savePersonalData).toHaveBeenCalledOnce()
    expect(mocks.saveTrainingData).not.toHaveBeenCalled()
  })

  it('keeps personal edits and reports a translated-safe failure when saving is rejected', async () => {
    mocks.savePersonalData.mockRejectedValueOnce(new Error('database detail'))
    renderProfile('/profile/personal')
    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: 'Unsaved name' } })
    fireEvent.click(screen.getByRole('link', { name: /Back to profile/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save and leave' }))
    expect(await screen.findAllByText('Could not save your profile.')).toHaveLength(2)
    expect(screen.getByLabelText(/Name/)).toHaveValue('Unsaved name')
    expect(screen.queryByText('database detail')).not.toBeInTheDocument()
  })

  it('renders training settings and saves only that section', async () => {
    renderProfile('/profile/training')
    expect(await screen.findByRole('heading', { name: 'Training' })).toBeInTheDocument()
    expect(screen.getByLabelText('Usual workout time')).toHaveValue(30)
    expect(screen.getByLabelText('Bodyweight (no equipment)')).toBeChecked()
    expect(screen.getByText('Exclusions')).toBeInTheDocument()
    expect(screen.getByText('Excluded exercises: 1')).toBeInTheDocument()
    expect(screen.getByText('Exclusions').closest('details')).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Exclusions'))
    expect(await screen.findByRole('button', { name: 'Include' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Include' }))
    await waitFor(() => expect(mocks.setExerciseExcluded).toHaveBeenCalledWith('user-1', 'ex-1', false))
    expect(screen.getByText('Excluded exercises: 0')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Cardio'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mocks.saveTrainingData).toHaveBeenCalledOnce())
    expect(mocks.savePersonalData).not.toHaveBeenCalled()
  })

  it('keeps measurement history separate from the overview', async () => {
    renderProfile('/profile/measurements')
    expect(await screen.findByRole('heading', { name: 'Measurement history' })).toBeInTheDocument()
    expect(screen.getByText('71.5 kg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to profile/ })).toBeInTheDocument()
  })

  it('asks before leaving an unfinished measurement entry', async () => {
    renderProfile('/profile/measurements')
    fireEvent.click(await screen.findByRole('button', { name: 'Add measurement' }))
    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: '72' } })
    fireEvent.click(screen.getByRole('link', { name: /Back to profile/ }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/Weight/)).toHaveValue(72)
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }))
    expect(screen.getByLabelText(/Weight/)).toHaveValue(72)
  })

  it('translates the redesigned profile rows and preference controls', async () => {
    localStorage.setItem('activity-planner.language', 'es')
    mocks.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }))
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrenamiento/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Editar datos personales/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mediciones/ })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument()
  })
})
