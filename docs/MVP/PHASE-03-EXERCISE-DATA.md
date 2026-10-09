# Phase 03 — Exercise and Workout Catalogue

## Objective

Create the initial exercise library and workout templates.

The planner depends on this phase.

## Exercise philosophy

The catalogue should be small but useful.

Target:

- 40–60 exercises;
- multiple equipment options;
- bodyweight fallback;
- low/medium/high impact;
- beginner-friendly instructions.

## Equipment seed

Include at least:

```text
bodyweight
mat
dumbbells
resistance_band
kettlebell
bench
chair
stationary_bike
jump_rope
```

## Exercise seed

### Legs

```text
bodyweight_squat
goblet_squat
split_squat
reverse_lunge
forward_lunge
romanian_deadlift
single_leg_rdl
glute_bridge
hip_thrust
calf_raise
step_up
wall_sit
```

### Push

```text
push_up
incline_push_up
knee_push_up
dumbbell_floor_press
dumbbell_chest_press
dumbbell_shoulder_press
dumbbell_lateral_raise
```

### Pull

```text
dumbbell_row
one_arm_dumbbell_row
band_row
band_pull_apart
dumbbell_reverse_fly
```

### Core

```text
plank
side_plank
dead_bug
bird_dog
mountain_climber
```

### Cardio

```text
march_in_place
high_knee_march
jumping_jack
low_impact_jack
shadow_boxing
step_up_cardio
stationary_bike
```

### Mobility

```text
cat_cow
thoracic_rotation
hip_90_90
world_greatest_stretch
hamstring_stretch
hip_flexor_stretch
child_pose
shoulder_mobility
```

### Outdoor

```text
walk_easy
walk_brisk
walk_interval
```

## Each exercise needs

- slug;
- display name;
- short description;
- instructions;
- category;
- movement pattern;
- difficulty;
- impact;
- equipment relationships;
- muscle relationships;
- default sets/reps/duration where appropriate;
- outdoor flag.

## Workout templates

Seed:

```text
strength_full_body_a
strength_full_body_b
strength_upper
strength_lower
cardio_low_impact
cardio_mixed
walking_20
walking_30
walking_45
mobility_15
mobility_30
recovery_15
```

## Important

Do not build planner logic here.

Do not make goals affect exercises.

Do not add AI.

## Acceptance criteria

- Seed migration runs successfully.
- All exercises have valid data.
- A bodyweight-only user has valid exercises available.
- Equipment relationships are correct.
- Excluded exercises can later be referenced.
- Templates exist and have ordered blocks.
