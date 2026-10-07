# Personal Fitness Planner — Project Specification

## 1. Purpose

Private, personal, mobile-first fitness planner designed to remove the friction of deciding what exercise to do each day.

The user provides profile information such as:

- goals;
- fitness level;
- available days;
- usual available time;
- equipment available at home;
- whether outdoor exercise is possible;
- preferred workout types;
- disliked/excluded exercises.

The application generates a varied weekly plan and allows the user to execute and track workouts.

### Important MVP decision

Goals are currently **informational profile data only**.

The selected goal must be stored and displayed, but **must not affect workout-generation logic in the MVP**.

For example, selecting "Lose weight" does not change the planner compared with selecting "Improve strength".

The planner will use availability, equipment, preferences, exclusions, recent history and recovery/variety rules.

Goals can become planner inputs in a later version.

## 2. Optional body measurements

The profile may contain optional personal measurements:

- weight;
- height;
- waist;
- chest;
- hips;
- arm;
- thigh;
- other measurements later.

These are tracking data only in the MVP.

They must not influence workout generation.

Measurements are stored historically, not overwritten, so the user can see change over time.

## 3. Core UX principle

The app should answer:

> What should I do today?

with as little decision-making as possible.

Primary flow:

1. Open app.
2. See today's recommendation.
3. Start workout.
4. Complete exercises.
5. Save result.
6. Continue with the automatically updated plan.

## 4. MVP stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- vite-plugin-pwa

### Backend/data

- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase JavaScript client

### Hosting

- Vercel or Cloudflare Pages.

### Repository

Private GitHub repository.

### AI

No AI dependency in the MVP.

The planner must work using deterministic application logic.

## 5. Architecture

```text
iPhone
  |
  v
PWA / React
  |
  +--> UI
  +--> Planner
  +--> Tracker
  |
  v
Supabase
  +--> Auth
  +--> PostgreSQL
  +--> RLS
```

The planner must be independent of React and Supabase.

It should operate on plain TypeScript objects.

## 6. Security

All user-owned tables must have Row Level Security enabled.

A user may only access their own data.

Never expose:

- service-role keys;
- secret keys;
- database passwords.

Only frontend-safe Supabase configuration may be used in the client.

No analytics or third-party tracking is required for the MVP.

## 7. Main navigation

- Today
- Week
- History
- Profile

## 8. MVP screens

### Login

Magic-link authentication.

### Onboarding/Profile

Collect profile information.

### Today

Show today's workout and primary "Start workout" CTA.

### Week

Show the current weekly plan.

### Workout

Guide the user through exercises.

### History

Show completed sessions and basic activity statistics.

### Profile

Edit personal information, goals, preferences, equipment and measurements.

## 9. Out of scope

Do not implement in the MVP:

- AI-generated workouts;
- automatic weather integration;
- Apple Health;
- Apple Watch;
- GPS;
- nutrition/calorie tracking;
- social features;
- payments;
- native iOS app;
- push notifications;
- public accounts;
- community features.

## 10. Product principle

The MVP succeeds if the user can stop thinking about what workout to choose.

The central loop is:

```text
Plan -> Do -> Track -> Adapt next plan
```
