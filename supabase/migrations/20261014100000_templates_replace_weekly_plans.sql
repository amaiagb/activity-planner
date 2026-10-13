-- Replace weekly schedules with reusable user workout templates and standalone sessions.
-- Starter data is intentionally cleared as requested; workout history can be rebuilt from new activity.
create table public.user_workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 240),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.user_workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null check (position > 0),
  prescribed_sets integer check (prescribed_sets is null or prescribed_sets > 0),
  prescribed_reps text,
  prescribed_duration_seconds integer check (prescribed_duration_seconds is null or prescribed_duration_seconds > 0),
  rest_seconds integer not null default 0 check (rest_seconds >= 0),
  unique (template_id, position),
  foreign key (template_id, user_id) references public.user_workout_templates(id, user_id) on delete cascade
);

create index user_workout_templates_user_idx on public.user_workout_templates(user_id, updated_at desc);
create index user_workout_template_exercises_exercise_idx on public.user_workout_template_exercises(exercise_id);
create trigger user_workout_templates_set_updated_at before update on public.user_workout_templates for each row execute function public.set_updated_at();

alter table public.user_workout_templates enable row level security;
alter table public.user_workout_template_exercises enable row level security;
create policy "Users manage their own workout templates" on public.user_workout_templates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own workout template exercises" on public.user_workout_template_exercises for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Remove disposable weekly plan and session data before removing the schedule model.
delete from public.weekly_plans where true;
alter table public.planned_workouts drop constraint if exists planned_workouts_weekly_plan_id_user_id_fkey;
alter table public.planned_workouts drop constraint if exists planned_workouts_weekly_plan_id_workout_date_key;
alter table public.planned_workouts drop column if exists weekly_plan_id;
drop table public.weekly_plans;

alter table public.planned_workouts add column source_type text not null default 'generated'
  check (source_type in ('generated', 'user_template', 'catalogue_template'));
alter table public.planned_workouts add column source_template_id uuid
  references public.user_workout_templates(id) on delete set null;

alter table public.availability drop column if exists monday;
alter table public.availability drop column if exists tuesday;
alter table public.availability drop column if exists wednesday;
alter table public.availability drop column if exists thursday;
alter table public.availability drop column if exists friday;
alter table public.availability drop column if exists saturday;
alter table public.availability drop column if exists sunday;
