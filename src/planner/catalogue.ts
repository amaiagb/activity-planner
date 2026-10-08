import type { EquipmentSlug, ExerciseIntensity, WorkoutCategory } from './types'

export type ExerciseDefinition = {
  id: string
  slug: string
  name: string
  category: string
  movementPattern: string
  muscleGroups: string[]
  /** Each inner list is an OR group; every group must have one available option. */
  equipmentGroups: EquipmentSlug[][]
  isOutdoor: boolean
  active: boolean
  intensity: ExerciseIntensity
}

export type TemplateBlock = {
  slug: string
  prescribedSets: number | null
  prescribedReps: string | null
  prescribedDurationSeconds: number | null
  restSeconds: number
}

export type WorkoutTemplate = {
  slug: string
  name: string
  category: WorkoutCategory
  /** Estimate used for rep-based templates whose execution pace is not encoded in blocks. */
  durationMinutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  intensity: ExerciseIntensity
  blocks: TemplateBlock[]
}

const exerciseRows: Array<Omit<ExerciseDefinition, 'id' | 'active'>> = [
  { slug: 'bodyweight_squat', name: 'Bodyweight squat', category: 'legs', movementPattern: 'squat', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'goblet_squat', name: 'Goblet squat', category: 'legs', movementPattern: 'squat', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['dumbbells', 'kettlebell']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'split_squat', name: 'Split squat', category: 'legs', movementPattern: 'single_leg_squat', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight', 'dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'reverse_lunge', name: 'Reverse lunge', category: 'legs', movementPattern: 'lunge', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight', 'dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'forward_lunge', name: 'Forward lunge', category: 'legs', movementPattern: 'lunge', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight', 'dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'romanian_deadlift', name: 'Romanian deadlift', category: 'legs', movementPattern: 'hip_hinge', muscleGroups: ['hamstrings', 'glutes'], equipmentGroups: [['dumbbells', 'kettlebell']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'single_leg_rdl', name: 'Single-leg Romanian deadlift', category: 'legs', movementPattern: 'single_leg_hip_hinge', muscleGroups: ['hamstrings', 'glutes'], equipmentGroups: [['bodyweight', 'dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'glute_bridge', name: 'Glute bridge', category: 'legs', movementPattern: 'hip_extension', muscleGroups: ['glutes', 'hamstrings'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'hip_thrust', name: 'Hip thrust', category: 'legs', movementPattern: 'hip_extension', muscleGroups: ['glutes', 'hamstrings'], equipmentGroups: [['bodyweight', 'bench']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'calf_raise', name: 'Calf raise', category: 'legs', movementPattern: 'plantar_flexion', muscleGroups: ['calves'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'step_up', name: 'Step-up', category: 'legs', movementPattern: 'step_up', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight', 'chair']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'wall_sit', name: 'Wall sit', category: 'legs', movementPattern: 'isometric_squat', muscleGroups: ['quadriceps'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'push_up', name: 'Push-up', category: 'push', movementPattern: 'horizontal_push', muscleGroups: ['chest', 'triceps', 'shoulders'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'incline_push_up', name: 'Incline push-up', category: 'push', movementPattern: 'horizontal_push', muscleGroups: ['chest', 'triceps'], equipmentGroups: [['bodyweight', 'chair']], isOutdoor: false, intensity: 'low' },
  { slug: 'knee_push_up', name: 'Knee push-up', category: 'push', movementPattern: 'horizontal_push', muscleGroups: ['chest', 'triceps'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'dumbbell_floor_press', name: 'Dumbbell floor press', category: 'push', movementPattern: 'horizontal_push', muscleGroups: ['chest', 'triceps'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'dumbbell_chest_press', name: 'Dumbbell chest press', category: 'push', movementPattern: 'horizontal_push', muscleGroups: ['chest', 'triceps'], equipmentGroups: [['dumbbells'], ['bench']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'dumbbell_shoulder_press', name: 'Dumbbell shoulder press', category: 'push', movementPattern: 'vertical_push', muscleGroups: ['shoulders', 'triceps'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'dumbbell_lateral_raise', name: 'Dumbbell lateral raise', category: 'push', movementPattern: 'shoulder_abduction', muscleGroups: ['shoulders'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'low' },
  { slug: 'dumbbell_row', name: 'Dumbbell row', category: 'pull', movementPattern: 'horizontal_pull', muscleGroups: ['upper_back', 'biceps'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'one_arm_dumbbell_row', name: 'One-arm dumbbell row', category: 'pull', movementPattern: 'horizontal_pull', muscleGroups: ['upper_back', 'biceps'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'band_row', name: 'Resistance band row', category: 'pull', movementPattern: 'horizontal_pull', muscleGroups: ['upper_back', 'biceps'], equipmentGroups: [['resistance_band']], isOutdoor: false, intensity: 'low' },
  { slug: 'band_pull_apart', name: 'Band pull-apart', category: 'pull', movementPattern: 'horizontal_pull', muscleGroups: ['upper_back', 'shoulders'], equipmentGroups: [['resistance_band']], isOutdoor: false, intensity: 'low' },
  { slug: 'dumbbell_reverse_fly', name: 'Dumbbell reverse fly', category: 'pull', movementPattern: 'horizontal_abduction', muscleGroups: ['upper_back', 'shoulders'], equipmentGroups: [['dumbbells']], isOutdoor: false, intensity: 'low' },
  { slug: 'plank', name: 'Plank', category: 'core', movementPattern: 'anti_extension', muscleGroups: ['core'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'side_plank', name: 'Side plank', category: 'core', movementPattern: 'lateral_stability', muscleGroups: ['core'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'dead_bug', name: 'Dead bug', category: 'core', movementPattern: 'anti_extension', muscleGroups: ['core'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'bird_dog', name: 'Bird dog', category: 'core', movementPattern: 'anti_rotation', muscleGroups: ['core', 'glutes'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'mountain_climber', name: 'Mountain climber', category: 'core', movementPattern: 'dynamic_anti_extension', muscleGroups: ['core', 'shoulders'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'march_in_place', name: 'March in place', category: 'cardio', movementPattern: 'locomotion', muscleGroups: ['quadriceps', 'calves'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'high_knee_march', name: 'High-knee march', category: 'cardio', movementPattern: 'locomotion', muscleGroups: ['quadriceps', 'core'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'jumping_jack', name: 'Jumping jack', category: 'cardio', movementPattern: 'lateral_locomotion', muscleGroups: ['calves', 'shoulders'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'high' },
  { slug: 'low_impact_jack', name: 'Low-impact jack', category: 'cardio', movementPattern: 'lateral_locomotion', muscleGroups: ['calves'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'shadow_boxing', name: 'Shadow boxing', category: 'cardio', movementPattern: 'upper_body_locomotion', muscleGroups: ['shoulders', 'core'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'step_up_cardio', name: 'Step-up cardio', category: 'cardio', movementPattern: 'step_up', muscleGroups: ['quadriceps', 'glutes'], equipmentGroups: [['bodyweight', 'chair']], isOutdoor: false, intensity: 'moderate' },
  { slug: 'stationary_bike', name: 'Stationary bike', category: 'cardio', movementPattern: 'cycling', muscleGroups: ['quadriceps', 'hamstrings'], equipmentGroups: [['stationary_bike']], isOutdoor: false, intensity: 'low' },
  { slug: 'cat_cow', name: 'Cat-cow', category: 'mobility', movementPattern: 'spinal_flexion_extension', muscleGroups: ['back'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'thoracic_rotation', name: 'Thoracic rotation', category: 'mobility', movementPattern: 'thoracic_rotation', muscleGroups: ['upper_back'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'hip_90_90', name: '90/90 hip switch', category: 'mobility', movementPattern: 'hip_rotation', muscleGroups: ['hips'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'world_greatest_stretch', name: 'World’s greatest stretch', category: 'mobility', movementPattern: 'multi_joint_mobility', muscleGroups: ['hips', 'upper_back'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'hamstring_stretch', name: 'Hamstring stretch', category: 'mobility', movementPattern: 'hamstring_mobility', muscleGroups: ['hamstrings'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'hip_flexor_stretch', name: 'Hip flexor stretch', category: 'mobility', movementPattern: 'hip_extension_mobility', muscleGroups: ['hip_flexors'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'child_pose', name: 'Child’s pose', category: 'mobility', movementPattern: 'rest_position', muscleGroups: ['back'], equipmentGroups: [['bodyweight', 'mat']], isOutdoor: false, intensity: 'low' },
  { slug: 'shoulder_mobility', name: 'Shoulder mobility reach', category: 'mobility', movementPattern: 'shoulder_flexion', muscleGroups: ['shoulders'], equipmentGroups: [['bodyweight']], isOutdoor: false, intensity: 'low' },
  { slug: 'walk_easy', name: 'Easy walk', category: 'outdoor', movementPattern: 'walking', muscleGroups: ['quadriceps', 'calves'], equipmentGroups: [['bodyweight']], isOutdoor: true, intensity: 'low' },
  { slug: 'walk_brisk', name: 'Brisk walk', category: 'outdoor', movementPattern: 'walking', muscleGroups: ['quadriceps', 'calves'], equipmentGroups: [['bodyweight']], isOutdoor: true, intensity: 'moderate' },
  { slug: 'walk_interval', name: 'Walk intervals', category: 'outdoor', movementPattern: 'walking_intervals', muscleGroups: ['quadriceps', 'calves'], equipmentGroups: [['bodyweight']], isOutdoor: true, intensity: 'moderate' },
]

export const exercises: ExerciseDefinition[] = exerciseRows.map((exercise, index) => ({
  ...exercise,
  id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  active: true,
}))

export const exerciseBySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]))
export const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

function block(slug: string, sets: number | null = null, reps: string | null = null, duration: number | null = null, rest = 0): TemplateBlock {
  if (!exerciseBySlug.has(slug)) throw new Error(`Unknown catalogue exercise: ${slug}`)
  return { slug, prescribedSets: sets, prescribedReps: reps, prescribedDurationSeconds: duration, restSeconds: rest }
}

export const workoutTemplates: WorkoutTemplate[] = [
  { slug: 'strength_full_body_a', name: 'Full-body strength A', category: 'strength', durationMinutes: 30, difficulty: 'beginner', intensity: 'high', blocks: [block('bodyweight_squat', 3, '8–12', null, 60), block('incline_push_up', 3, '8–12', null, 60), block('glute_bridge', 3, '10–15', null, 45), block('bird_dog', 2, '6 each side', null, 30), block('calf_raise', 2, '12–15', null, 30)] },
  { slug: 'strength_full_body_b', name: 'Full-body strength B', category: 'strength', durationMinutes: 30, difficulty: 'beginner', intensity: 'high', blocks: [block('reverse_lunge', 3, '8 each side', null, 60), block('knee_push_up', 3, '6–12', null, 60), block('single_leg_rdl', 3, '6 each side', null, 45), block('dead_bug', 2, '8 each side', null, 30), block('wall_sit', 2, null, 30, 45)] },
  { slug: 'strength_upper', name: 'Upper-body strength', category: 'strength', durationMinutes: 25, difficulty: 'beginner', intensity: 'high', blocks: [block('push_up', 3, '6–12', null, 60), block('band_row', 3, '10–15', null, 45), block('dumbbell_shoulder_press', 3, '8–12', null, 45), block('band_pull_apart', 2, '12–15', null, 30), block('plank', 2, null, 20, 30)] },
  { slug: 'strength_lower', name: 'Lower-body strength', category: 'strength', durationMinutes: 25, difficulty: 'beginner', intensity: 'high', blocks: [block('bodyweight_squat', 3, '8–12', null, 60), block('romanian_deadlift', 3, '8–12', null, 60), block('step_up', 3, '8 each side', null, 45), block('glute_bridge', 3, '10–15', null, 45), block('calf_raise', 2, '12–15', null, 30)] },
  { slug: 'cardio_low_impact', name: 'Low-impact cardio', category: 'cardio', durationMinutes: 20, difficulty: 'beginner', intensity: 'low', blocks: [block('march_in_place', null, null, 270, 30), block('low_impact_jack', null, null, 270, 30), block('shadow_boxing', null, null, 240, 30), block('march_in_place', null, null, 240)] },
  { slug: 'cardio_mixed', name: 'Mixed cardio', category: 'cardio', durationMinutes: 20, difficulty: 'beginner', intensity: 'moderate', blocks: [block('march_in_place', null, null, 270, 30), block('high_knee_march', null, null, 180, 30), block('low_impact_jack', null, null, 270, 30), block('shadow_boxing', null, null, 300)] },
  { slug: 'walking_20', name: 'Easy walk · 20 min', category: 'walking', durationMinutes: 20, difficulty: 'beginner', intensity: 'low', blocks: [block('walk_easy', null, null, 1200)] },
  { slug: 'walking_30', name: 'Brisk walk · 30 min', category: 'walking', durationMinutes: 30, difficulty: 'beginner', intensity: 'moderate', blocks: [block('walk_easy', null, null, 300), block('walk_brisk', null, null, 1200), block('walk_easy', null, null, 300)] },
  { slug: 'walking_45', name: 'Walk intervals · 45 min', category: 'walking', durationMinutes: 45, difficulty: 'beginner', intensity: 'moderate', blocks: [block('walk_easy', null, null, 300), block('walk_brisk', null, null, 600), block('walk_easy', null, null, 300), block('walk_brisk', null, null, 900), block('walk_easy', null, null, 600)] },
  { slug: 'mobility_15', name: 'Mobility · 15 min', category: 'mobility', durationMinutes: 15, difficulty: 'beginner', intensity: 'low', blocks: [block('cat_cow', null, null, 90), block('thoracic_rotation', null, null, 120), block('hip_90_90', null, null, 120), block('hamstring_stretch', null, null, 120), block('hip_flexor_stretch', null, null, 120), block('child_pose', null, null, 90)] },
  { slug: 'mobility_30', name: 'Mobility · 30 min', category: 'mobility', durationMinutes: 30, difficulty: 'beginner', intensity: 'low', blocks: [block('cat_cow', null, null, 120), block('thoracic_rotation', null, null, 180), block('hip_90_90', null, null, 180), block('world_greatest_stretch', null, null, 180), block('hamstring_stretch', null, null, 180), block('hip_flexor_stretch', null, null, 180), block('child_pose', null, null, 180), block('shoulder_mobility', null, null, 180)] },
  { slug: 'recovery_15', name: 'Recovery · 15 min', category: 'recovery', durationMinutes: 15, difficulty: 'beginner', intensity: 'low', blocks: [block('walk_easy', null, null, 300), block('cat_cow', null, null, 120), block('hip_90_90', null, null, 180), block('child_pose', null, null, 120)] },
]

/** Uses timed-block seconds plus stated rests and a 30-second transition between blocks.
 * Rep-based templates keep their authored estimate because cadence is not recorded.
 */
export function estimateWorkoutDurationMinutes(template: WorkoutTemplate): number {
  if (template.blocks.length === 0 || template.blocks.some((item) => item.prescribedDurationSeconds === null)) return template.durationMinutes
  const activeSeconds = template.blocks.reduce((total, item) => total + (item.prescribedDurationSeconds ?? 0), 0)
  const restSeconds = template.blocks.slice(0, -1).reduce((total, item) => total + item.restSeconds, 0)
  const transitionSeconds = Math.max(0, template.blocks.length - 1) * 30
  return Math.round((activeSeconds + restSeconds + transitionSeconds) / 60)
}

export function hasRequiredEquipment(exercise: ExerciseDefinition, availableEquipment: EquipmentSlug[]): boolean {
  const available = new Set([...availableEquipment, 'bodyweight'])
  return exercise.equipmentGroups.every((group) => group.some((equipment) => available.has(equipment)))
}
