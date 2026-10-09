# Phase 07 — Security, PWA, Testing and Production

## Objective

Prepare the MVP for real personal use on iPhone.

## Security review

Verify:

- RLS enabled on all user tables;
- no public access to private rows;
- catalogue tables are read-only to normal users;
- no service-role key in frontend;
- no secrets committed;
- `.env.local` ignored;
- authenticated routes protected;
- unauthenticated users cannot access profile/history data.

## RLS tests

Explicitly test:

```text
User A can read User A data.
User A cannot read User B data.
User A cannot update User B data.
User A cannot delete User B data.
User A cannot modify exercise catalogue.
```

## Authentication

Verify Magic Link flow on a production deployment.

## PWA

Verify:

- installable from Safari;
- icon appears on Home Screen;
- standalone mode works;
- refresh works;
- service worker updates correctly.

## Mobile UX

Test at least:

```text
375px
390px
393px
430px
```

Check:

- no horizontal scrolling;
- buttons are comfortable;
- bottom navigation is usable;
- keyboard does not obscure critical controls;
- safe areas work;
- loading states are clear;
- error states are clear.

## Accessibility

Verify:

- semantic headings;
- labels;
- focus states;
- keyboard navigation;
- screen-reader-friendly buttons;
- sufficient contrast;
- no information conveyed only by color;
- reduced motion.

## Performance

Do not over-optimize.

Ensure:

- production build works;
- no unnecessary giant dependencies;
- catalogue data is not fetched repeatedly;
- planner runs locally without network calls.

## Deployment

Preferred initial flow:

```text
GitHub
  |
  v
Vercel
  |
  v
Production PWA
```

Configure production environment variables in the hosting provider.

Never commit production secrets.

## CI

Every push/PR should run:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

## Final MVP test

From a clean browser:

1. Open production URL.
2. Sign in.
3. Complete profile.
4. Choose goals.
5. Add equipment.
6. Add optional measurement.
7. Generate week.
8. Open today's workout.
9. Complete workout.
10. Confirm history.
11. Confirm weekly statistics.
12. Change goal.
13. Confirm planner behavior is unchanged by goal.
14. Add another measurement.
15. Confirm both measurements remain in history.
16. Regenerate a future workout.
17. Confirm completed workout is untouched.
18. Install PWA on iPhone.

## Definition of done

The project is MVP-complete only when:

- all tests pass;
- build passes;
- RLS has been verified;
- production deployment works;
- iPhone PWA installation works;
- full user flow works from login to tracking.
