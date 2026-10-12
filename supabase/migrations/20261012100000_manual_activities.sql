create table public.manual_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  activity_type text not null check (activity_type in ('training', 'walking', 'padel')),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  exercises text check (exercises is null or char_length(exercises) <= 2000),
  created_at timestamptz not null default now()
);

create index manual_activities_user_date_idx on public.manual_activities(user_id, activity_date desc);
alter table public.manual_activities enable row level security;
create policy "Users manage their own manual activities" on public.manual_activities for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
