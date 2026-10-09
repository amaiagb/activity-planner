# Phase 08 — Browsable Exercise Catalogue and Tutorials (Post-MVP)

## Timing and dependency

This is a post-MVP phase. Do not start it until Phase 07's Definition of Done is met and the initial MVP has been deployed and verified.

Phase 03 provides the exercise data and Phase 05 provides exercise instructions in the context of a workout. Neither phase creates a standalone exercise-browsing experience. This phase adds a place for an authenticated user to find an exercise, understand how to perform it, and view an instructional visual where one is available.

## Objective

Let a user browse the exercise library outside an active workout and open a concise, useful tutorial for each active exercise.

The tutorial may use one or more of these formats:

- still images or a sequence of images;
- a short, silent animation;
- a short video;
- an infographic.

Text instructions remain available for every exercise, including when media cannot load or motion is disabled.

## Reference app (described in text; no images are provided)

The layout and interaction below are modelled on another exercise-tracking app's exercise library. This description is self-contained: **no screenshots are provided and none are needed**. Use it as **inspiration for layout and interaction only**. Do not copy any app's branding, copy, or imagery, and do not reproduce features that are not listed in this document.

### What to take from the reference

**Catalogue**

- A bottom tab bar with a dedicated `Exercises` item (dumbbell icon) that opens the catalogue. The active tab is visually highlighted.
- A large page title (`Exercises`) followed by a search field.
- A row of **two filter controls** under the search field, rendered as large, tappable pill buttons: one for **body part** and one for **equipment**. Their default state reads as "Any body part" / "Any equipment" (the reference shows "Any body part" / "Any category"; here the second filter is equipment, not category).
- An **alphabetically sorted list** grouped under sticky letter headers (A, B, C, …).
- A vertical **A–Z index rail** on the right edge for fast jumping between letters.
- Each row shows: a **square thumbnail** on the left, the **exercise name** in bold, and a **secondary line** underneath (in the reference, the body part/category, e.g. "Shoulders", "Core").
- When an exercise has no image, the thumbnail falls back to a neutral tile with the exercise's initial letter. This is a good model for the placeholder behaviour below.

**Exercise detail**

- Opens when a catalogue row is tapped. On mobile it may be a bottom sheet/modal (as in the reference) or a full page at `/exercises/:id`; choose whichever fits the existing navigation best, but it must have a close/back control and be deep-linkable.
- Header with the exercise name (including its equipment variant, e.g. "Arnold Press (Dumbbell)").
- A **large illustrative image** in a rounded card, with the working muscles highlighted when the asset supports it. The reference shows a play control on the card for animated demos; this is optional here.
- An **Instructions** section with **numbered steps** in plain, readable language.

### What is deliberately NOT being taken from the reference

- The `New`/create-exercise action and the overflow (`…`) menu.
- The sort toggle and the category filter (only body part and equipment filters are required).
- The detail tabs `History`, `Charts`, and `Records`, and the `Edit` action. Only the description/instructions view is in scope.
- The `Profile`, `History`, `Train`, and `Store` tabs of the reference app; only the `Exercises` entry is added to this app's existing navigation.

## User experience

### Navigation

- Add an authenticated `Exercises` item to the **bottom navigation bar** (the main mobile navigation), with an icon and label consistent with the existing items, and a route such as `/exercises`.
- The item shows its active state when on `/exercises` or any exercise detail route.
- Unauthenticated users are redirected through the existing auth guard.

### Catalogue page

- Show **every active exercise available in the database** (the Phase 03 library) as a mobile-friendly vertical list, **sorted alphabetically by display name** and grouped under letter section headers.
- Provide an **A–Z index rail** along the right edge that jumps to the matching section. Only show letters that have at least one exercise (or visibly disable the others). It must not obstruct row content or tap targets and must be usable by touch; provide a non-gesture alternative for keyboard and screen-reader users (e.g. the search field and filters, plus focusable section headings).
- Each row shows:
  - a **thumbnail** (square, small, lazily loaded);
  - the **exercise name**;
  - a **secondary line** with the body part (primary muscle group or body region) and, where useful, the equipment.
- Provide a **search field** (display name and known catalogue terms).
- Provide **two filters**:
  1. **Body part** — default "Any body part";
  2. **Equipment** — default "Any equipment".
  Both are single- or multi-select (choose one and apply it consistently), combine with each other and with the text search, and show their current selection on the control. Provide a way to clear them. Filter options are derived from the catalogue relations in the database, not hard-coded in the client.
- Additional filters (category, movement pattern, difficulty) are **not required** in this phase; do not add them unless trivial and they do not crowd the two-filter layout.
- Do not load full-size tutorial media in the results list; use thumbnails only.
- Show clear loading, empty (including "no exercises match these filters" with a clear-filters action), and recoverable error states.
- Tapping a row opens the exercise detail view.

### Exercise detail and tutorial

For each active exercise, show, in this order on a narrow screen:

1. a header with the **display name** and a close/back control;
2. a **large explanatory image** (the tutorial visual or its placeholder; see "Placeholder media");
3. an **Instructions** section: the existing written instructions presented as **numbered, readable steps**;
4. supporting details where those fields exist: short description, body part / muscle groups (primary and secondary), equipment requirements and alternatives, category, movement pattern, difficulty, impact, and outdoor status;
5. a clear text fallback if media is missing, unavailable, or disabled.

The instructions must be readable without scrolling past the image on a typical phone only if the image is kept to a reasonable height; keep the image large but bounded so that the first instruction step is at least partly visible without scrolling on common mobile heights.

When an exercise appears in a workout, provide a link to the same detail/tutorial view. Keep workout execution actions such as Done and Skip in the workout flow.

## Placeholder media (until real assets exist)

Real illustrations for each exercise are not available yet. Until they are, the catalogue and detail views must still look complete and be fully functional:

- Provide a **mockup/placeholder image** for every exercise lacking an approved asset. It must be visually neutral and clearly a placeholder (for example a neutral illustration of a figure or a tile with the exercise's initial and a subtle "illustration coming soon" treatment). Do not use unlicensed images, stock photos of real people, or imagery taken from the reference app.
- The placeholder is provided in **two sizes**: a small square thumbnail for the list and a larger image for the detail view, with consistent aspect ratios so that swapping in real assets causes no layout shift.
- Placeholder behaviour is driven by data/logic, not by per-exercise client code: if an exercise has no approved media asset, the client renders the placeholder; as soon as an approved asset exists for it, that asset is rendered instead, with no client code change.
- Placeholders have appropriate alt text (for example, "Illustration not yet available for <exercise name>") and never replace or hide the written instructions.
- Placeholders must be identifiable in the data (for example, an exercise with no media rows) so that progress towards full coverage can be measured and tests can distinguish placeholder from real assets.

## Tutorial content

- Curate the media for instructional clarity and beginner use; do not use visuals that imply unsafe ranges or technique.
- Where possible, the illustration should show the start and end positions, and highlight the working muscles, similar in spirit to the reference.
- Include a meaningful alt text or equivalent text description for non-text content.
- For video, provide captions or a transcript, a poster image, and user-controlled playback. Do not autoplay with sound.
- Respect reduced-motion preferences. Do not make an animation the only way to understand the movement.
- Preserve the written instructions if a visual asset fails to load.
- Record the asset's source and usage/license information. Use only media the project has permission to distribute.
- Avoid medical claims, diagnosis, or injury-treatment advice.

## Data and media architecture

- Reuse the Phase 03 exercise records and relationships as the source of exercise names, instructions, equipment, and muscles. Do not create a second exercise catalogue in the client.
- The catalogue query must return all active exercises together with what the list needs (name, body part, equipment, thumbnail reference) in an efficient way; avoid N+1 requests per row. Body-part and equipment filtering should be performed from the database relations (server-side or via an efficient query/view), and results must stay correct as the library grows.
- Add a migration only if the existing schema cannot represent tutorial content and media metadata, or cannot express the "body part" grouping needed for the filter and secondary line. Keep media files out of PostgreSQL rows; store a stable storage path or URL and metadata instead.
- Support one or more ordered media assets per exercise, with at least a media kind, storage reference, alt text/description, optional caption/transcript, and source/license metadata. Support a distinct thumbnail rendition (or a derivable one) for list use.
- Keep catalogue and tutorial content read-only to regular users. Enable and verify RLS for any new metadata table and media storage policy; normal authenticated users may read, but may not upload or edit catalogue assets.
- Do not expose a service-role key or other secret in the client.
- Load media on the detail view, lazily where possible; thumbnails in the list load lazily as rows approach the viewport. Provide appropriately sized assets and a poster/thumbnail so mobile users do not download full videos just to browse.
- Define an editorial workflow for adding, replacing, and validating tutorial assets without requiring client code changes for every content update. This workflow includes how placeholders are replaced by approved assets.

## Accessibility and mobile performance

- Use semantic headings (including for the alphabetical section headers), labelled search and filter controls, keyboard-operable controls, and visible focus states.
- The A–Z index rail must have accessible names and must not be the only way to navigate the list.
- Provide text equivalents for diagrams and media; do not encode essential instructions only in colour or motion (the muscle highlight colour must be accompanied by a text list of muscles).
- Respect reduced motion and allow video/animation playback to be paused and controlled.
- Test narrow mobile layouts, slow connections, failed media requests, and supported image/video formats on target browsers.
- Avoid loading the full media library up front; the catalogue list should remain usable on a slow connection, including with a long list (consider list virtualisation if the library is large).
- Ensure the bottom navigation, the sticky section headers, and the index rail do not overlap or hide content, including on devices with safe-area insets.

## Out of scope

- User uploads or community-submitted tutorials.
- Creating, editing, or deleting exercises from the client (the reference's `New` and `Edit` actions).
- Per-exercise history, charts, and personal records tabs.
- Social ratings, comments, or public exercise profiles.
- AI-generated demonstrations or medical/rehabilitation advice.
- Replacing the workout planner, tracker, or Phase 05 execution flow.
- Requiring a visual asset to load before text instructions can be read.

## Tests and validation

- Authenticated users can open the catalogue from the bottom navigation and open active exercise details; unauthenticated users are redirected through the existing auth guard.
- The catalogue lists every active exercise in the database, sorted alphabetically and grouped under the correct letter headers; the A–Z rail jumps to the right section.
- Search, the body-part filter, the equipment filter, and combinations of them return the expected exercises, including an empty-result case and a clear-filters action.
- Tapping a row opens the detail view with the larger image (or placeholder), numbered written instructions, and the equipment and muscle details; closing/back returns to the list at the same scroll position and with filters preserved.
- Exercises without approved media show the placeholder in both list and detail with no layout shift, and automatically show the real asset once one is approved.
- Exercise equipment and muscle details are sourced from the catalogue relations and render correctly when there are multiple alternatives or groups.
- Media failure still leaves the name and written instructions available.
- Alt text, video captions/transcripts (where video is used), reduced-motion behavior, and user-controlled playback are verified.
- RLS and storage policies prevent anonymous reads where intended and prevent regular users from modifying or uploading catalogue content.
- Lint, typecheck, tests, and production build pass; test the catalogue at the supported mobile widths.

## Acceptance criteria

- An `Exercises` item in the bottom navigation takes an authenticated user to a catalogue of all active exercises in the database, shown as an alphabetical list with thumbnails, names, and body-part summaries.
- The user can filter the catalogue by **body part** and **equipment** (and search by name) without starting a workout.
- Opening an exercise shows a detail view with a larger explanatory image and clear, numbered written instructions, plus equipment and muscle information from the existing catalogue.
- While real illustrations are not yet available, every exercise displays a consistent mockup/placeholder image in the list and detail views, and the app is fully usable in that state.
- Real assets can replace placeholders through the editorial workflow without client code changes.
- Visual tutorials work accessibly on mobile, and the text tutorial remains usable with reduced motion or unavailable media.
- Existing workout planning and tracking flows continue to work unchanged.

## Definition of done for content (tracked separately from the feature)

The feature can ship with placeholders. The *content* milestone is complete only when every active exercise has concise written instructions and at least one approved instructional visual asset with alt text and source/license metadata, and no exercise relies on a placeholder.
