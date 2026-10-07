# Phase 06 — History, Progress and Profile

## Objective

Complete the personal tracker.

## History

Show:

- recent workouts;
- completion date;
- workout type;
- duration;
- perceived exertion if provided.

Do not build complex analytics.

## Weekly summary

Show:

```text
3 / 4 workouts
92 active minutes
75% completion
```

## Monthly summary

Show:

```text
12 workouts
6h 25m active time
78% completion
```

## Streak

Calculate a simple current streak based on completed planned workout days.

Avoid gamification overload.

## Measurements

Add a measurements section to Profile.

The user can:

- add measurement;
- choose date;
- enter optional values;
- save;
- see historical values;
- edit/delete entries.

Supported MVP fields:

```text
weight_kg
height_cm
waist_cm
chest_cm
hips_cm
arm_cm
thigh_cm
notes
```

All optional.

## Measurement history

Display newest first.

Example:

```text
7 Oct 2026

Weight     82.4 kg
Waist      91 cm

5 Sep 2026

Weight     83.8 kg
Waist      94 cm
```

A simple line chart may be added if easy, but is not required for MVP completion.

## Important

Measurements must NOT:

- change workout selection;
- calculate calories;
- calculate BMI;
- provide health advice.

They are tracking data only.

## Profile

Allow editing:

- name;
- goals;
- fitness level;
- availability;
- duration;
- equipment;
- preferences;
- exclusions;
- measurements.

## Delete account/data

Provide a clear destructive action in Profile/Settings.

If account deletion is implemented, ensure it deletes user-owned application data according to the database foreign-key strategy and then removes the auth account through a secure server-side mechanism.

Do not fake account deletion from the frontend.

## Acceptance criteria

- User can see workout history.
- Weekly/monthly summaries work.
- User can record measurements.
- Measurements remain historical.
- User can edit/delete measurements.
- Profile settings are editable.
- Goal changes update profile but do not alter planner logic.
