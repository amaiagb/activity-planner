# Personal Fitness Planner

Private personal fitness planner PWA.

## Purpose

Remove the friction of deciding what exercise to do each day.

The app uses profile information, availability, equipment, preferences and recent history to generate a varied weekly exercise plan.

## MVP

- Profile
- Goals
- Optional body measurements
- Equipment
- Availability
- Preferences
- Weekly planner
- Daily workout
- Workout tracking
- History
- Basic progress

## Important MVP rules

Goals are informational only.

Body measurements are tracking data only.

Neither affects workout generation in the MVP.

The planner is rule-based and does not require AI.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Supabase
- PostgreSQL
- Supabase Auth
- RLS
- Vite PWA
- Vitest

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Implementation phases

See:

- `PROJECT.md`
- `PHASE-01-FOUNDATION.md`
- `PHASE-02-DATABASE-AUTH.md`
- `PHASE-03-EXERCISE-DATA.md`
- `PHASE-04-PLANNER.md`
- `PHASE-05-PLANNER-UI.md`
- `PHASE-06-HISTORY-PROFILE.md`
- `PHASE-07-POLISH-SECURITY-DEPLOY.md`

Implement one phase at a time.

After each phase:

1. run all checks;
2. review the diff;
3. commit;
4. push;
5. only then start the next phase.
