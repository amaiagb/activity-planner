# Exercise tutorial media editorial workflow

Exercise instructions and metadata remain in the existing Phase 03 catalogue. Tutorial files are kept in the private Supabase Storage bucket `exercise-tutorials`; `public.exercise_media` stores only references and editorial metadata.

## Adding or replacing an asset

1. Prepare an image, infographic, or controlled-play MP4/WebM video and a small WebP/JPEG/PNG thumbnail. For a video, also prepare a WebVTT caption file or a text transcript. Keep stable paths based on the exercise slug, such as `bodyweight_squat/squat-side-view.webp` and `bodyweight_squat/squat-thumbnail.webp`.
2. Confirm the project has permission to distribute the file. Record the source name and URL, the license name and URL where available, useful alt text, a concise description, and a transcript for video when one is available. Do not use reference-app imagery or unlicensed photography.
3. Upload the files to the private `exercise-tutorials` bucket using an authorized editorial/admin account. Regular authenticated app users have read access to published files only and cannot upload, replace, or delete them.
4. Add an `exercise_media` row with the exercise ID, a unique positive position for that exercise, media kind, stable file paths, text alternatives, attribution, and `is_published = false` while reviewing. For video, set `captions_path` or `transcript`.
5. Check the image/video, thumbnail crop, alt text, text instructions, transcript/caption and attribution on a narrow screen. Confirm that video playback is user controlled and the written instructions remain available.
6. Set `is_published = true` when approved. The catalogue automatically uses its thumbnail and the detail view uses the full asset. No client code change is required. To replace a published asset, add the new metadata and files, approve and publish them, then unpublish and remove the old files through the editorial/admin workflow.

An exercise with no published `exercise_media` rows is intentionally rendered with the built-in neutral placeholder. The metadata table is queryable for coverage reporting; no placeholder row or fake asset needs to be inserted.
