alter table public.workout_sessions
  add column completed_sets integer not null default 0
    check (completed_sets >= 0);
