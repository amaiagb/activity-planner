-- Track daily training completions separately from scheduled-plan adherence.
alter table public.profiles
  add column time_zone text,
  add column streak_tracking_started_on date;

update public.profiles
set streak_tracking_started_on = current_date
where streak_tracking_started_on is null;

alter table public.profiles
  alter column streak_tracking_started_on set default current_date,
  alter column streak_tracking_started_on set not null;

alter table public.workout_sessions
  add column completed_local_date date,
  add column completion_timezone text;

create index workout_sessions_user_completion_date_idx
  on public.workout_sessions(user_id, completed_local_date)
  where status = 'completed' and completed_local_date is not null;

comment on column public.profiles.time_zone is
  'IANA time zone used to attribute future completed workouts to a local calendar date.';
comment on column public.profiles.streak_tracking_started_on is
  'First local date covered by the daily training streak; earlier history is not assumed complete.';
comment on column public.workout_sessions.completed_local_date is
  'User-local date of completion, stored so later time-zone changes do not move streak credit.';
comment on column public.workout_sessions.completion_timezone is
  'IANA time zone used to calculate completed_local_date.';
