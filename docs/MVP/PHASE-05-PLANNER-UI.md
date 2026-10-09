# Phase 05 — Today, Week and Workout Execution

## Objective

Connect the planner to the application UI.

## Today page

The main page must answer:

> What should I do today?

Show:

- date;
- workout title;
- category;
- estimated duration;
- indoor/outdoor;
- exercise list;
- primary Start button.

Example:

```text
Today's workout

Full Body
30 min

1. Warm up
2. Goblet squat
3. Dumbbell row
4. Push-up
5. Dead bug
6. Cool down

[ Start workout ]
```

## Week page

Show all days in the current week.

Each day displays:

- rest;
- planned workout;
- completed;
- skipped.

Completed days should be visually clear without relying only on color.

## Workout page

For each exercise show:

- name;
- instructions;
- sets/reps/duration;
- optional equipment;
- Done button;
- Skip button.

The user must be able to progress through exercises quickly.

## Completion

At the end show:

- completed;
- planned duration;
- actual duration;
- optional perceived exertion 1–5;
- optional note.

Then save the session.

## Minimum-friction rule

The user must be able to finish an entire workout without entering:

- weight;
- repetitions;
- notes;
- RPE.

All of these are optional.

## Planned workouts

Persist the generated weekly plan in:

```text
weekly_plans
planned_workouts
```

When a workout starts:

```text
workout_sessions
```

is created.

When exercises are completed:

```text
exercise_sessions
```

are saved.

## Regenerate

Provide:

```text
Change today's workout
```

and:

```text
Regenerate week
```

The UI must clearly warn before regenerating a week if completed sessions exist.

Completed sessions must never be modified.

## Acceptance criteria

- User sees today's generated workout.
- User can open any day of the week.
- User can start a workout.
- User can mark exercises done.
- User can skip exercises.
- User can complete the session.
- Completed workout appears as completed.
- History is persisted.
- Regeneration works.
- Completed sessions remain untouched.
