export type PersistedExerciseStatus = 'planned' | 'done' | 'skipped'

export type SeriesExercise = {
  id: string
  position: number
  status: PersistedExerciseStatus
}

export type WorkoutSeriesState = {
  completedSets: number
  plannedSets: number
  visibleSeriesCount: number
  finalized: boolean
  persisted: Record<string, PersistedExerciseStatus>
  current: Record<string, PersistedExerciseStatus>
  seriesStartStatus: Record<string, PersistedExerciseStatus>
  notice: { type: 'series'; completed: number; next: number } | { type: 'workout'; completed: number; planned: number } | null
}

export type SeriesPersistenceOperation =
  | { type: 'exercise_status'; exerciseSessionId: string; status: PersistedExerciseStatus }
  | { type: 'completed_sets'; value: number }

export type SeriesAction =
  | { type: 'done'; exerciseSessionId: string }
  | { type: 'skipped'; exerciseSessionId: string }
  | { type: 'undo'; exerciseSessionId: string }
  | { type: 'add_series' }

export function plannedSetsFromExercises(exercises: Array<{ prescribedSets: number | null }>) {
  const plannedSets = Math.max(...exercises.flatMap((exercise) => exercise.prescribedSets ? [exercise.prescribedSets] : []), 0)
  return plannedSets || 3
}

export function hydrateWorkoutSeries(completedSets: number, plannedSets: number, exercises: SeriesExercise[]): WorkoutSeriesState {
  const persisted = Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.status]))
  const finalized = completedSets >= plannedSets
  const current = Object.fromEntries(exercises.map((exercise) => [exercise.id, completedSets > 0 && !finalized ? 'planned' : exercise.status])) as Record<string, PersistedExerciseStatus>
  return { completedSets, plannedSets, visibleSeriesCount: Math.max(plannedSets, completedSets), finalized, persisted, current, seriesStartStatus: { ...persisted }, notice: null }
}

export function resolvedCount(state: WorkoutSeriesState) {
  return Object.values(state.current).filter((status) => status !== 'planned').length
}

export function canFinishWorkout(state: WorkoutSeriesState) {
  return Object.values(state.persisted).some((status) => status === 'done')
    || Object.values(state.current).some((status) => status === 'done')
}

function withPersisted(state: WorkoutSeriesState, exerciseSessionId: string, status: PersistedExerciseStatus) {
  return { ...state, persisted: { ...state.persisted, [exerciseSessionId]: status } }
}

export function applySeriesAction(state: WorkoutSeriesState, action: SeriesAction, exercises: SeriesExercise[]): { state: WorkoutSeriesState; operations: SeriesPersistenceOperation[] } {
  if (action.type === 'add_series') {
    return {
      state: {
        ...state,
        visibleSeriesCount: state.visibleSeriesCount + 1,
        finalized: false,
        current: Object.fromEntries(exercises.map((exercise) => [exercise.id, 'planned'])) as Record<string, PersistedExerciseStatus>,
        seriesStartStatus: { ...state.persisted },
        notice: null,
      },
      operations: [] as SeriesPersistenceOperation[],
    }
  }
  if (state.finalized) return { state, operations: [] as SeriesPersistenceOperation[] }
  const operations: SeriesPersistenceOperation[] = []
  let next: WorkoutSeriesState = { ...state, current: { ...state.current }, notice: null }

  if (action.type === 'done') {
    next.current[action.exerciseSessionId] = 'done'
    if (next.persisted[action.exerciseSessionId] !== 'done') {
      operations.push({ type: 'exercise_status', exerciseSessionId: action.exerciseSessionId, status: 'done' })
      next = withPersisted(next, action.exerciseSessionId, 'done')
    }
  } else if (action.type === 'skipped') {
    next.current[action.exerciseSessionId] = 'skipped'
    if (next.persisted[action.exerciseSessionId] === 'planned') {
      operations.push({ type: 'exercise_status', exerciseSessionId: action.exerciseSessionId, status: 'skipped' })
      next = withPersisted(next, action.exerciseSessionId, 'skipped')
    }
  } else {
    const initialStatus = next.seriesStartStatus[action.exerciseSessionId] ?? 'planned'
    next.current[action.exerciseSessionId] = initialStatus
    if (next.persisted[action.exerciseSessionId] !== initialStatus) {
      operations.push({ type: 'exercise_status', exerciseSessionId: action.exerciseSessionId, status: initialStatus })
      next = withPersisted(next, action.exerciseSessionId, initialStatus)
    }
  }

  const hasPending = exercises.some((exercise) => next.current[exercise.id] === 'planned')
  const hasDone = Object.values(next.current).some((status) => status === 'done')
  if (!hasPending && hasDone) {
    const completedSets = next.completedSets + 1
    next = {
      ...next,
      completedSets,
      seriesStartStatus: { ...next.persisted },
      finalized: completedSets >= next.visibleSeriesCount,
      notice: completedSets >= next.visibleSeriesCount
        ? { type: 'workout', completed: completedSets, planned: next.plannedSets }
        : { type: 'series', completed: completedSets, next: completedSets + 1 },
    }
    if (!next.finalized) next.current = Object.fromEntries(exercises.map((exercise) => [exercise.id, 'planned'])) as Record<string, PersistedExerciseStatus>
    if (!next.finalized) next.seriesStartStatus = { ...next.persisted }
    operations.push({ type: 'completed_sets', value: completedSets })
  }

  return { state: next, operations }
}

