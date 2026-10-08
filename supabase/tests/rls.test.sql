begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase07-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('b0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase07-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, display_name) values
  ('a0000000-0000-4000-8000-000000000001', 'User A'),
  ('b0000000-0000-4000-8000-000000000002', 'User B');

select ok((
  select count(*) = 10 and bool_and(relrowsecurity)
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relname = any(array[
      'profiles', 'availability', 'preferences', 'user_equipment', 'excluded_exercises',
      'body_measurements', 'weekly_plans', 'planned_workouts', 'workout_sessions', 'exercise_sessions'
    ])
), 'RLS is enabled on every user-owned table');

select ok((
  select count(*) = 6 and bool_and(relrowsecurity)
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relname = any(array['equipment', 'exercises', 'exercise_equipment', 'exercise_muscles', 'workout_templates', 'workout_template_blocks'])
), 'RLS is enabled on every catalogue table');

select is((
  select count(*)
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array['equipment', 'exercises', 'exercise_equipment', 'exercise_muscles', 'workout_templates', 'workout_template_blocks'])
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
), 0::bigint, 'catalogue tables expose no write policies');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001'), 1::bigint, 'User A can read User A profile data');
select is((select count(*) from public.profiles), 1::bigint, 'User A cannot read User B profile data');
select ok((select count(*) = 1 from public.exercises where slug = 'bodyweight_squat'), 'Authenticated users can read the exercise catalogue');

update public.profiles set display_name = 'Tampered by A' where user_id = 'b0000000-0000-4000-8000-000000000002';
delete from public.profiles where user_id = 'b0000000-0000-4000-8000-000000000002';
update public.exercises set name = 'Tampered catalogue item' where slug = 'bodyweight_squat';
delete from public.exercises where slug = 'bodyweight_squat';

select throws_ok(
  $$insert into public.exercises (slug, name, category) values ('phase07-unauthorized-exercise', 'Unauthorized exercise', 'test')$$,
  '42501',
  'Authenticated users cannot insert catalogue exercises'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'Unauthenticated users cannot read private profile data');

reset role;
select is((select display_name from public.profiles where user_id = 'b0000000-0000-4000-8000-000000000002'), 'User B', 'User A cannot update or delete User B profile data');
select is((select name from public.exercises where slug = 'bodyweight_squat'), 'Bodyweight squat', 'Authenticated users cannot update or delete catalogue rows');

select * from finish();
rollback;
