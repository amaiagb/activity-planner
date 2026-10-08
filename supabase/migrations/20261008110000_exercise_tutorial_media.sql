-- Phase 08: editorial metadata for approved exercise tutorial media.
create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position integer not null check (position > 0),
  media_kind text not null check (media_kind in ('image', 'infographic', 'animation', 'video')),
  storage_path text not null,
  thumbnail_path text,
  captions_path text,
  alt_text text not null check (char_length(alt_text) between 1 and 300),
  description text,
  caption text,
  transcript text,
  source_name text not null,
  source_url text,
  license_name text not null,
  license_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (exercise_id, position),
  check (media_kind not in ('animation', 'video') or thumbnail_path is not null),
  check (media_kind not in ('animation', 'video') or captions_path is not null or transcript is not null)
);

create index exercise_media_published_position_idx
  on public.exercise_media (exercise_id, position)
  where is_published;

alter table public.exercise_media enable row level security;
create policy "Authenticated users read published exercise media"
  on public.exercise_media for select to authenticated
  using (is_published);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-tutorials',
  'exercise-tutorials',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm', 'text/vtt']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users read published tutorial assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-tutorials'
    and exists (
      select 1
      from public.exercise_media media
      where media.is_published
        and (media.storage_path = name or media.thumbnail_path = name or media.captions_path = name)
    )
  );

-- Editorial workflow:
-- 1. Prepare an appropriately sized thumbnail and a full illustration or
--    controlled-play video/poster plus captions (VTT) or transcript text.
-- 2. Upload files to a private Storage folder such as <exercise-slug>/.
-- 3. Insert an exercise_media row with source/license attribution and keep
--    is_published=false while reviewing the asset and text equivalents.
-- 4. Set is_published=true only after review. The catalogue automatically
--    renders its thumbnail and the detail view its full asset; no client edit
--    is required. Unpublish by setting is_published=false; delete unused files
--    from Storage through the editorial/admin workflow.
