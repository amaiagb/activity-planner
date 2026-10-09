# Phase 01 — Project Foundation

## Objective

Turn the empty GitHub repository into a clean React/TypeScript/Vite mobile-first PWA foundation.

Do not implement business logic yet.

## Starting state

Repository currently contains only a README.

The repository is already connected to Codex Desktop.

## Tasks

### 1. Scaffold

Create:

- React
- TypeScript
- Vite

Use npm.

### 2. Dependencies

Install and configure:

- React Router
- Tailwind CSS
- vite-plugin-pwa
- Vitest
- ESLint
- TypeScript

Avoid unnecessary dependencies.

### 3. Scripts

package.json should provide:

```text
dev
build
preview
lint
typecheck
test
```

### 4. Directory structure

Create:

```text
src/
  app/
  components/
  features/
    auth/
    onboarding/
    today/
    planner/
    workouts/
    history/
    profile/
  planner/
  lib/
  types/
  styles/
tests/
```

### 5. Application shell

Create a basic application shell with:

- mobile-first layout;
- top-level router;
- bottom navigation;
- placeholder pages.

Routes:

```text
/login
/onboarding
/today
/week
/workout/:id
/history
/profile
```

For now the pages can contain simple placeholder content.

### 6. PWA

Configure:

- manifest;
- app name: Personal Fitness Planner;
- short name: Fitness Planner;
- standalone display;
- appropriate icons;
- theme metadata;
- service worker.

Do not spend time creating polished icons yet. Temporary valid icons are acceptable.

### 7. Styling

Create a minimal design foundation:

- readable typography;
- spacing scale;
- cards;
- buttons;
- form controls;
- mobile-friendly touch targets;
- dark-mode support if straightforward.

Do not build final visual design yet.

### 8. Accessibility

Ensure:

- semantic HTML;
- labels for form controls;
- keyboard focus;
- buttons are actual buttons;
- no click handlers on generic divs;
- reduced-motion support where animations exist.

### 9. Testing

Add at least one sanity test confirming the application/tooling works.

### 10. CI

Create GitHub Actions workflow running:

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

## Acceptance criteria

- `npm run dev` works.
- `npm run build` works.
- `npm run lint` works.
- `npm run typecheck` works.
- `npm run test` works.
- PWA manifest exists.
- All routes render.
- Mobile layout is usable.
- No backend has been introduced yet.

## Important

Do not implement:

- Supabase;
- authentication;
- planner;
- database;
- measurements;
- workout logic.

Those belong to later phases.
