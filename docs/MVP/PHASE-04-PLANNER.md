# Phase 04 — Weekly Planner Engine

## Objective

Implement the core planning algorithm as pure TypeScript.

This is the most important logic phase.

## Critical rule

Goals are NOT planner inputs in this MVP.

A user's selected goal must be stored in their profile, but:

```text
primary_goal
secondary_goal
```

must not affect planning.

The planner must use:

- available days;
- duration;
- equipment;
- outdoor capability;
- preferences;
- exclusions;
- fitness level;
- recent workout history;
- recovery;
- variety.

## Planner API

Implement:

```ts
generateWeeklyPlan(input: PlannerInput): WeeklyPlan
```

Also:

```ts
generateWorkout(...)
scoreWorkoutCandidate(...)
validateWeeklyPlan(...)
regenerateWorkout(...)
```

The planner must not access Supabase directly.

## Input

Conceptually:

```ts
type PlannerInput = {
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
}
```

No goal field.

## Output

```ts
type WeeklyPlan = {
  weekStart: string
  workouts: PlannedWorkout[]
}
```

## Number of sessions

Rules:

```text
1–2 available days -> 1–2 sessions
3 available days   -> 3 sessions
4 available days   -> 4 sessions
5+ available days  -> maximum 5 sessions
```

Do not automatically fill every available day with a hard workout.

## Candidate scoring

Initial weights:

```text
preferenceScore    × 25
equipmentScore     × 20
varietyScore       × 20
recoveryScore      × 15
durationScore      × 10
fitnessLevelScore  × 10
```

Do not include goalScore.

## Hard constraints

A candidate is invalid if:

- it requires unavailable equipment;
- it is excluded;
- it is inactive;
- it is outdoor when outdoor exercise is unavailable;
- it cannot fit approximately within requested duration.

## Variety

Look at recent history.

Penalize:

```text
same template recently       -25
same exercise recently       -10
same movement consecutively  -15
same intense muscle demand   -15
```

Avoid consecutive hard lower-body sessions.

Avoid identical sessions on consecutive days.

## Preferences

Preferences affect scores.

Examples:

- likes strength -> strength receives bonus;
- likes walking -> walking receives bonus;
- dislikes/excludes are respected;
- mobility can be used as a recovery day.

## Outdoor

If:

```text
canGoOutside = false
```

never generate an outdoor workout.

If:

```text
canGoOutside = true
```

outdoor workouts are allowed.

Do not integrate weather yet.

## Duration

Approximate targets:

```text
15 -> 10–15 min
20 -> 15–20 min
30 -> 25–35 min
45 -> 40–50 min
60 -> 50–65 min
```

Do not fail because a session differs by a few minutes.

## Suggested weekly patterns

These are defaults, not hard rules.

3 sessions:

```text
strength
cardio/walking
strength
```

4 sessions:

```text
strength
cardio/walking
strength
cardio/walking/mobility
```

5 sessions:

```text
strength
cardio
strength
mobility/cardio
strength/cardio
```

The actual selection must still use scoring and history.

## Recovery

Avoid:

```text
hard lower
hard lower
```

and similar repeated demands.

The planner should use mobility, walking, low-impact cardio or rest when useful.

## Regeneration

`regenerateWorkout(date, currentPlan, history, input)` must:

- preserve completed workouts;
- preserve skipped/completed history;
- generate a different suitable candidate where possible.

`generateWeeklyPlan` must be able to regenerate future days after a skipped workout.

## Fallback

If constraints make the preferred plan impossible:

1. bodyweight strength;
2. walking if available;
3. mobility/recovery.

Never return an invalid plan merely to satisfy variety.

## Deterministic testing

Support an optional random seed in planner internals so tests can be deterministic.

Production may use randomness between similarly scored candidates.

## Tests

At minimum:

- available-day constraint;
- equipment constraint;
- exclusion constraint;
- outdoor constraint;
- duration;
- variety;
- recovery;
- preferences;
- skipped workout;
- regeneration;
- bodyweight fallback;
- impossible constraint handling;
- deterministic seed.

## Acceptance criteria

The planner can generate valid weekly plans entirely without Supabase or network access.

All planner tests pass.

The same input + seed produces the same output.
