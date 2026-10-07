export const goals = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'improve_strength', label: 'Improve strength' },
  { value: 'improve_endurance', label: 'Improve endurance' },
  { value: 'stay_active', label: 'Stay active' },
  { value: 'general_health', label: 'General health' },
  { value: 'other', label: 'Other' },
] as const

export const fitnessLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const

export const weekDays = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

export const measurementFields = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'height_cm', label: 'Height', unit: 'cm' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm' },
  { key: 'arm_cm', label: 'Arm', unit: 'cm' },
  { key: 'thigh_cm', label: 'Thigh', unit: 'cm' },
] as const

export type Goal = (typeof goals)[number]['value']
export type FitnessLevel = (typeof fitnessLevels)[number]['value']
export type WeekDayKey = (typeof weekDays)[number]['key']
export type MeasurementKey = (typeof measurementFields)[number]['key']

export type ProfileRecord = {
  user_id: string
  display_name: string | null
  primary_goal: Goal | null
  secondary_goal: Goal | null
  fitness_level: FitnessLevel | null
}

export type AvailabilityRecord = Record<WeekDayKey, boolean> & {
  user_id: string
  default_duration_minutes: number
}

export type PreferencesRecord = {
  user_id: string
  likes_strength: boolean
  likes_cardio: boolean
  likes_walking: boolean
  likes_hiit: boolean
  likes_mobility: boolean
  can_go_outside: boolean
  outside_is_weather_dependent: boolean
}

export type MeasurementRecord = Record<MeasurementKey, number | null> & {
  id: string
  user_id: string
  measured_at: string
  notes: string | null
  created_at: string
}

export type ProfileData = {
  profile: ProfileRecord | null
  availability: AvailabilityRecord | null
  preferences: PreferencesRecord | null
  equipmentIds: string[]
  excludedExerciseIds: string[]
  equipment: { id: string; name: string; category: string }[]
  exercises: { id: string; name: string; category: string }[]
  measurements: MeasurementRecord[]
}

export type ProfileFormValues = {
  displayName: string
  primaryGoal: Goal | ''
  secondaryGoal: Goal | ''
  fitnessLevel: FitnessLevel | ''
  days: Record<WeekDayKey, boolean>
  duration: number
  likes: Record<'strength' | 'cardio' | 'walking' | 'hiit' | 'mobility', boolean>
  canGoOutside: boolean
  outsideWeatherDependent: boolean
  equipmentIds: string[]
  excludedExerciseIds: string[]
}

export const emptyProfileForm = (): ProfileFormValues => ({
  displayName: '',
  primaryGoal: '',
  secondaryGoal: '',
  fitnessLevel: '',
  days: {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  },
  duration: 30,
  likes: { strength: false, cardio: false, walking: false, hiit: false, mobility: false },
  canGoOutside: false,
  outsideWeatherDependent: false,
  equipmentIds: [],
  excludedExerciseIds: [],
})

export function toProfileForm(data: ProfileData): ProfileFormValues {
  const value = emptyProfileForm()
  value.displayName = data.profile?.display_name ?? ''
  value.primaryGoal = data.profile?.primary_goal ?? ''
  value.secondaryGoal = data.profile?.secondary_goal ?? ''
  value.fitnessLevel = data.profile?.fitness_level ?? ''
  if (data.availability) {
    for (const day of weekDays) value.days[day.key] = data.availability[day.key]
    value.duration = data.availability.default_duration_minutes
  }
  if (data.preferences) {
    value.likes = {
      strength: data.preferences.likes_strength,
      cardio: data.preferences.likes_cardio,
      walking: data.preferences.likes_walking,
      hiit: data.preferences.likes_hiit,
      mobility: data.preferences.likes_mobility,
    }
    value.canGoOutside = data.preferences.can_go_outside
    value.outsideWeatherDependent = data.preferences.outside_is_weather_dependent
  }
  value.equipmentIds = data.equipmentIds
  value.excludedExerciseIds = data.excludedExerciseIds
  return value
}
