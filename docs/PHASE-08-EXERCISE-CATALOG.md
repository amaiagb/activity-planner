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

## User experience

### Catalogue page

- Add an authenticated `Exercises` entry to the main navigation and a route such as `/exercises`.
- Show the active exercise library as a mobile-friendly, searchable list or grid.
- Search by display name and known catalogue terms. Allow filtering by category, movement pattern, muscle group, and required equipment where practical.
- Show each result's name and a small category or movement summary. Do not load full-size tutorial media in the results list.
- Show clear loading, empty, and recoverable error states.
- Let the user open an exercise detail page from a catalogue result.

### Exercise detail and tutorial

For each active exercise, show:

- display name and short description;
- the existing written instructions, presented as readable steps;
- the tutorial image, animation, video, or infographic;
- equipment requirements and alternatives, muscle groups, category, movement pattern, difficulty, impact, and outdoor status where those fields exist;
- a clear text fallback if media is missing, unavailable, or disabled.

When an exercise appears in a workout, provide a link to the same detail/tutorial view. Keep workout execution actions such as Done and Skip in the workout flow.

## Tutorial content

- Curate the media for instructional clarity and beginner use; do not use visuals that imply unsafe ranges or technique.
- Include a meaningful alt text or equivalent text description for non-text content.
- For video, provide captions or a transcript, a poster image, and user-controlled playback. Do not autoplay with sound.
- Respect reduced-motion preferences. Do not make an animation the only way to understand the movement.
- Preserve the written instructions if a visual asset fails to load.
- Record the asset's source and usage/license information. Use only media the project has permission to distribute.
- Avoid medical claims, diagnosis, or injury-treatment advice.

## Data and media architecture

- Reuse the Phase 03 exercise records and relationships as the source of exercise names, instructions, equipment, and muscles. Do not create a second exercise catalogue in the client.
- Add a migration only if the existing schema cannot represent tutorial content and media metadata. Keep media files out of PostgreSQL rows; store a stable storage path or URL and metadata instead.
- Support one or more ordered media assets per exercise, with at least a media kind, storage reference, alt text/description, optional caption/transcript, and source/license metadata.
- Keep catalogue and tutorial content read-only to regular users. Enable and verify RLS for any new metadata table and media storage policy; normal authenticated users may read, but may not upload or edit catalogue assets.
- Do not expose a service-role key or other secret in the client.
- Load media on the detail view, lazily where possible. Provide appropriately sized assets and a poster/thumbnail so mobile users do not download full videos just to browse.
- Define an editorial workflow for adding, replacing, and validating tutorial assets without requiring client code changes for every content update.

## Accessibility and mobile performance

- Use semantic headings, labelled filters/search, keyboard-operable controls, and visible focus states.
- Provide text equivalents for diagrams and media; do not encode essential instructions only in colour or motion.
- Respect reduced motion and allow video playback to be paused and controlled.
- Test narrow mobile layouts, slow connections, failed media requests, and supported image/video formats on target browsers.
- Avoid loading the full media library up front; the catalogue list should remain usable on a slow connection.

## Out of scope

- User uploads or community-submitted tutorials.
- Social ratings, comments, or public exercise profiles.
- AI-generated demonstrations or medical/rehabilitation advice.
- Replacing the workout planner, tracker, or Phase 05 execution flow.
- Requiring a visual asset to load before text instructions can be read.

## Tests and validation

- Authenticated users can open the catalogue and active exercise details; unauthenticated users are redirected through the existing auth guard.
- Search and each supported filter return the expected exercises, including an empty-result case.
- Every active exercise has written instructions and at least one approved instructional visual asset before this phase is considered complete.
- Exercise equipment and muscle details are sourced from the catalogue relations and render correctly when there are multiple alternatives or groups.
- Media failure still leaves the name and written instructions available.
- Alt text, video captions/transcripts, reduced-motion behavior, and user-controlled playback are verified.
- RLS and storage policies prevent anonymous reads where intended and prevent regular users from modifying or uploading catalogue content.
- Lint, typecheck, tests, and production build pass; test the catalogue at the supported mobile widths.

## Acceptance criteria

- An authenticated user can find and open any active exercise without starting a workout.
- Every active exercise has a concise text tutorial and at least one approved visual tutorial asset.
- Exercise details include available equipment and muscle relationships from the existing catalogue.
- Visual tutorials work accessibly on mobile, and the text tutorial remains usable with reduced motion or unavailable media.
- Existing workout planning and tracking flows continue to work unchanged.
