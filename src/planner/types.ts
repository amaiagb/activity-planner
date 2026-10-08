export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export type Weekday = (typeof weekdays)[number]
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutCategory = 'strength' | 'cardio' | 'walking' | 'mobility' | 'recovery'
export type WorkoutStatus = 'planned' | 'completed' | 'skipped'
export type ExerciseIntensity = 'low' | 'moderate' | 'high'
export type EquipmentSlug = string

export type PlannerInput = {
  availability: {
    days: Weekday[]
    durationMinutes: number
  }
  equipment: EquipmentSlug[]
  preferences: {
    strength: boolean
    cardio: boolean
    walking: boolean
    hiit: boolean
    mobility: boolean
    canGoOutside: boolean
    weatherDependent: boolean
  }
  excludedExerciseIds: string[]
  fitnessLevel: FitnessLevel
  history: WorkoutHistory[]
  /** Date-specific conflicts such as an existing non-regenerable session. */
  blockedDates?: Array<{ date: string; reason: string }>
  /** Optional ISO date (Monday) for reproducible plans. Defaults to this week's Monday. */
  weekStart?: string
}

export type WorkoutHistory = {
  date: string
  templateSlug?: string
  exerciseIds: string[]
  movementPatterns?: string[]
  muscleGroups?: string[]
  category?: WorkoutCategory
  intensity?: ExerciseIntensity
  status?: Exclude<WorkoutStatus, 'planned'>
  completed?: boolean
  skipped?: boolean
}

export type PlannedExercise = {
  id: string
  slug: string
  name: string
  prescribedSets: number | null
  prescribedReps: string | null
  prescribedDurationSeconds: number | null
  restSeconds: number
}

export type PlannedWorkout = {
  id: string
  date: string
  templateSlug: string
  name: string
  category: WorkoutCategory
  durationMinutes: number
  exercises: PlannedExercise[]
  status: WorkoutStatus
  isOutdoor: boolean
  intensity: ExerciseIntensity
  movementPatterns: string[]
  muscleGroups: string[]
}

export type WeeklyPlan = {
  weekStart: string
  requestedSessions: number
  workouts: PlannedWorkout[]
  unscheduledSessions: UnscheduledSession[]
}

export type UnscheduledReason = 'date-blocked' | 'duration' | 'equipment' | 'excluded-exercise' | 'outdoor-access' | 'inactive-exercise' | 'no-candidate'

export type UnscheduledSession = {
  date: string
  reasons: UnscheduledReason[]
  message: string
}

export type PlannerOptions = {
  seed?: number
}

export type CandidateScoreContext = {
  recentWorkouts?: Array<PlannedWorkout | WorkoutHistory>
  previousWorkout?: PlannedWorkout | WorkoutHistory
}
