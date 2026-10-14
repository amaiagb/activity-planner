-- User saved video resources for the Templates area.
create table public.user_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null check (char_length(original_url) between 1 and 2048),
  provider text not null check (provider in ('youtube', 'instagram', 'tiktok')),
  provider_video_id text,
  title text check (title is null or char_length(title) between 1 and 160),
  source_title text check (source_title is null or char_length(source_title) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, original_url)
);

create index user_resources_user_idx on public.user_resources(user_id, created_at desc);
create trigger user_resources_set_updated_at before update on public.user_resources
  for each row execute function public.set_updated_at();

alter table public.user_resources enable row level security;
create policy "Users manage their own resources" on public.user_resources for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
