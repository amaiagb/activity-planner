begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'c0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
  'phase08-media@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.exercise_media (
  id, exercise_id, position, media_kind, storage_path, thumbnail_path,
  alt_text, source_name, license_name, is_published
)
select media.id, exercise.id, media.position, 'image', media.storage_path, media.thumbnail_path,
  media.alt_text, 'Phase 08 test fixture', 'Test fixture license', media.is_published
from public.exercises exercise
cross join (values
  ('c8000000-0000-4000-8000-000000000008'::uuid, 1, 'bodyweight_squat/tutorial.webp', 'bodyweight_squat/thumb.webp', 'A squat tutorial image', true),
  ('c8000000-0000-4000-8000-000000000009'::uuid, 2, 'bodyweight_squat/draft.webp', 'bodyweight_squat/draft-thumb.webp', 'An unpublished draft image', false)
) as media(id, position, storage_path, thumbnail_path, alt_text, is_published)
where exercise.slug = 'bodyweight_squat';

select ok((select relrowsecurity from pg_class where oid = 'public.exercise_media'::regclass), 'exercise media metadata has RLS enabled');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.exercise_media), 1::bigint, 'authenticated users can read published media but not drafts');
update public.exercise_media set alt_text = 'Changed by regular user' where id = 'c8000000-0000-4000-8000-000000000008';
delete from public.exercise_media where id = 'c8000000-0000-4000-8000-000000000008';
select throws_ok(
  $$insert into public.exercise_media (exercise_id, position, media_kind, storage_path, alt_text, source_name, license_name) select id, 3, 'image', 'unauthorized.webp', 'Unauthorized', 'test', 'test' from public.exercises where slug = 'bodyweight_squat'$$,
  '42501',
  'new row violates row-level security policy for table "exercise_media"',
  'regular users cannot add tutorial metadata'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from public.exercise_media), 0::bigint, 'anonymous users cannot read tutorial metadata');

reset role;
select ok((select count(*) = 2 and count(*) filter (where is_published) = 1 and count(*) filter (where alt_text = 'A squat tutorial image') = 1 from public.exercise_media), 'regular users cannot update or delete published media');
select is((select public from storage.buckets where id = 'exercise-tutorials'), false, 'tutorial assets are stored in a private bucket');
select ok((select count(*) = 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated users read published tutorial assets' and cmd = 'SELECT' and roles = array['authenticated']::name[]), 'published tutorial files can be signed only by authenticated users');
select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL') and (coalesce(qual, '') || coalesce(with_check, '')) ilike '%exercise-tutorials%'), 0::bigint, 'regular users have no tutorial asset upload or edit policy');

select * from finish();
rollback;
