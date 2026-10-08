-- Phase 05: persist generated plans and workout execution.
create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  requested_sessions integer not null default 0 check (requested_sessions between 0 and 7),
  unscheduled_sessions jsonb not null default '[]'::jsonb check (jsonb_typeof(unscheduled_sessions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  unique (id, user_id)
);

create table public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  template_slug text not null,
  name text not null,
  category text not null check (category in ('strength', 'cardio', 'walking', 'mobility', 'recovery')),
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  is_outdoor boolean not null default false,
  intensity text not null check (intensity in ('low', 'moderate', 'high')),
  movement_patterns text[] not null default '{}',
  muscle_groups text[] not null default '{}',
  exercises jsonb not null check (jsonb_typeof(exercises) = 'array'),
  workout_json jsonb not null check (jsonb_typeof(workout_json) = 'object'),
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (weekly_plan_id, user_id) references public.weekly_plans(id, user_id) on delete cascade,
  unique (weekly_plan_id, workout_date),
  unique (id, user_id)
);
create index planned_workouts_user_date_idx on public.planned_workouts(user_id, workout_date);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  planned_workout_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'skipped')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  planned_duration_minutes integer not null check (planned_duration_minutes between 1 and 240),
  actual_duration_minutes integer check (actual_duration_minutes is null or actual_duration_minutes >= 0),
  perceived_exertion smallint check (perceived_exertion is null or perceived_exertion between 1 and 5),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (planned_workout_id, user_id) references public.planned_workouts(id, user_id) on delete cascade,
  unique (id, user_id)
);
create index workout_sessions_user_started_idx on public.workout_sessions(user_id, started_at desc);

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null,
  planned_workout_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null check (position > 0),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  sets_completed integer check (sets_completed is null or sets_completed >= 0),
  reps_completed text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workout_session_id, user_id) references public.workout_sessions(id, user_id) on delete cascade,
  foreign key (planned_workout_id, user_id) references public.planned_workouts(id, user_id) on delete cascade,
  unique (workout_session_id, position)
);
create index exercise_sessions_user_idx on public.exercise_sessions(user_id, created_at desc);

create trigger weekly_plans_set_updated_at before update on public.weekly_plans for each row execute function public.set_updated_at();
create trigger planned_workouts_set_updated_at before update on public.planned_workouts for each row execute function public.set_updated_at();
create trigger exercise_sessions_set_updated_at before update on public.exercise_sessions for each row execute function public.set_updated_at();

alter table public.weekly_plans enable row level security;
alter table public.planned_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_sessions enable row level security;

create policy "Users manage their own weekly plans" on public.weekly_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own planned workouts" on public.planned_workouts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own workout sessions" on public.workout_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own exercise sessions" on public.exercise_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
