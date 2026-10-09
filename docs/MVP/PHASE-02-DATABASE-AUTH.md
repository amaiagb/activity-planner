# Phase 02 — Supabase Database, Authentication and Profile

## Objective

Add Supabase persistence and authentication.

This phase introduces the data model and the profile.

## Supabase

Use:

- Supabase Auth;
- PostgreSQL;
- Row Level Security;
- Supabase JavaScript client.

Authentication method:

- Magic Link.

Do not create custom password authentication.

## Environment variables

Create `.env.example`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never commit `.env.local`.

Never use service-role/secret keys in frontend code.

## Database entities

Implement a migration containing:

### profiles

Fields:

```text
id
user_id
display_name
primary_goal
secondary_goal
fitness_level
created_at
updated_at
```

Goals are informational only.

Suggested goal values:

```text
lose_weight
improve_strength
improve_endurance
stay_active
general_health
other
```

The application must not use these values in planner scoring yet.

### availability

```text
id
user_id

monday
tuesday
wednesday
thursday
friday
saturday
sunday

default_duration_minutes

created_at
updated_at
```

### preferences

```text
id
user_id

likes_strength
likes_cardio
likes_walking
likes_hiit
likes_mobility

can_go_outside
outside_is_weather_dependent

created_at
updated_at
```

### equipment

Global catalogue:

```text
id
slug
name
category
```

### user_equipment

```text
user_id
equipment_id
```

### exercises

Global catalogue:

```text
id
slug
name
description
instructions
category
movement_pattern
difficulty
impact_level
default_sets
default_reps
default_duration_seconds
is_outdoor
is_active
created_at
```

### exercise_equipment

```text
exercise_id
equipment_id
```

### exercise_muscles

```text
exercise_id
muscle_group
```

### excluded_exercises

```text
user_id
exercise_id
```

### body_measurements

This is an important MVP addition.

Each record represents a measurement at a point in time.

Fields:

```text
id
user_id
measured_at

weight_kg
height_cm

waist_cm
chest_cm
hips_cm
arm_cm
thigh_cm

notes

created_at
```

All measurement values are nullable.

Do not calculate BMI or health scores in this phase unless explicitly requested later.

Height may be recorded repeatedly for simplicity, although normally it changes infrequently.

The historical model is intentional:

```text
date 1 -> measurement
date 2 -> measurement
date 3 -> measurement
```

Never overwrite historical measurements.

## RLS

Enable RLS on every user-owned table.

A user can only access rows where:

```sql
auth.uid() = user_id
```

For relationship tables such as `user_equipment`, the policy should use the `user_id` directly.

For global catalogue tables, allow authenticated users to read them.

Do not allow regular users to modify global catalogues.

## Auth UX

Create:

### `/login`

Email field + "Send login link".

### authenticated state

After successful authentication:

- if profile is incomplete -> onboarding;
- otherwise -> today.

## Profile onboarding

Collect:

1. display name (optional);
2. goals;
3. fitness level;
4. available days;
5. normal workout duration;
6. equipment;
7. outdoor availability;
8. workout preferences;
9. excluded exercises.

Also allow optional measurements:

- weight;
- height;
- waist;
- chest;
- hips;
- arm;
- thigh.

Measurements should be skippable.

## Profile page

The user must be able to edit:

- name;
- goals;
- level;
- days;
- duration;
- equipment;
- preferences;
- excluded exercises.

And manage measurements:

- add measurement;
- view measurement history;
- edit/delete an individual measurement.

## Acceptance criteria

- User can request a magic link.
- Authenticated user can create their profile.
- Profile survives reload.
- User A cannot read User B's profile.
- User A cannot read User B's measurements.
- Catalogue data can be read.
- Catalogue data cannot be modified by normal users.
- Measurements are historical.
- Goals are stored but do not affect planner behavior.
