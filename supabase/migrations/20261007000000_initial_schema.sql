create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  primary_goal text check (primary_goal is null or primary_goal in ('lose_weight', 'improve_strength', 'improve_endurance', 'stay_active', 'general_health', 'other')),
  secondary_goal text check (secondary_goal is null or secondary_goal in ('lose_weight', 'improve_strength', 'improve_endurance', 'stay_active', 'general_health', 'other')),
  fitness_level text check (fitness_level is null or fitness_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  monday boolean not null default false,
  tuesday boolean not null default false,
  wednesday boolean not null default false,
  thursday boolean not null default false,
  friday boolean not null default false,
  saturday boolean not null default false,
  sunday boolean not null default false,
  default_duration_minutes integer not null default 30 check (default_duration_minutes between 5 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  likes_strength boolean not null default false,
  likes_cardio boolean not null default false,
  likes_walking boolean not null default false,
  likes_hiit boolean not null default false,
  likes_mobility boolean not null default false,
  can_go_outside boolean not null default false,
  outside_is_weather_dependent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null
);

create table public.user_equipment (
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  primary key (user_id, equipment_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  instructions text,
  category text not null,
  movement_pattern text,
  difficulty text check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')),
  impact_level text check (impact_level is null or impact_level in ('low', 'moderate', 'high')),
  default_sets integer check (default_sets is null or default_sets > 0),
  default_reps text,
  default_duration_seconds integer check (default_duration_seconds is null or default_duration_seconds > 0),
  is_outdoor boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  primary key (exercise_id, equipment_id)
);

create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  muscle_group text not null,
  primary key (exercise_id, muscle_group)
);

create table public.excluded_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  primary key (user_id, exercise_id)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg > 0),
  height_cm numeric(6, 2) check (height_cm is null or height_cm > 0),
  waist_cm numeric(6, 2) check (waist_cm is null or waist_cm > 0),
  chest_cm numeric(6, 2) check (chest_cm is null or chest_cm > 0),
  hips_cm numeric(6, 2) check (hips_cm is null or hips_cm > 0),
  arm_cm numeric(6, 2) check (arm_cm is null or arm_cm > 0),
  thigh_cm numeric(6, 2) check (thigh_cm is null or thigh_cm > 0),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index body_measurements_user_date_idx on public.body_measurements (user_id, measured_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger availability_set_updated_at before update on public.availability for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.preferences for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.preferences enable row level security;
alter table public.equipment enable row level security;
alter table public.user_equipment enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.excluded_exercises enable row level security;
alter table public.body_measurements enable row level security;

create policy "Users manage their own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own availability" on public.availability for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own preferences" on public.preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own equipment" on public.user_equipment for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own exclusions" on public.excluded_exercises for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own measurements" on public.body_measurements for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Authenticated users read equipment" on public.equipment for select to authenticated using (true);
create policy "Authenticated users read exercises" on public.exercises for select to authenticated using (true);
create policy "Authenticated users read exercise equipment" on public.exercise_equipment for select to authenticated using (true);
create policy "Authenticated users read exercise muscles" on public.exercise_muscles for select to authenticated using (true);

insert into public.equipment (id, slug, name, category) values
  ('10000000-0000-4000-8000-000000000001', 'no-equipment', 'No equipment', 'bodyweight'),
  ('10000000-0000-4000-8000-000000000002', 'dumbbells', 'Dumbbells', 'free_weights'),
  ('10000000-0000-4000-8000-000000000003', 'resistance-bands', 'Resistance bands', 'resistance'),
  ('10000000-0000-4000-8000-000000000004', 'kettlebell', 'Kettlebell', 'free_weights'),
  ('10000000-0000-4000-8000-000000000005', 'barbell', 'Barbell', 'free_weights'),
  ('10000000-0000-4000-8000-000000000006', 'bench', 'Bench', 'accessories'),
  ('10000000-0000-4000-8000-000000000007', 'pull-up-bar', 'Pull-up bar', 'accessories'),
  ('10000000-0000-4000-8000-000000000008', 'treadmill', 'Treadmill', 'cardio'),
  ('10000000-0000-4000-8000-000000000009', 'stationary-bike', 'Stationary bike', 'cardio'),
  ('10000000-0000-4000-8000-000000000010', 'jump-rope', 'Jump rope', 'cardio')
on conflict (slug) do nothing;
