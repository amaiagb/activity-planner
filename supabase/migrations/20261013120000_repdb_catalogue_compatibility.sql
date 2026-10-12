-- Follow-up for the already-applied RepDB catalogue migration.
-- Keep legacy underscore slugs used by the planner and test fixtures.
do $$
declare
  repdb_id uuid;
  legacy_id uuid;
begin
  select id into repdb_id from public.exercises where slug = 'bodyweight-squat';
  select id into legacy_id from public.exercises where slug = 'bodyweight_squat';

  if repdb_id is not null and legacy_id is null then
    update public.exercises
    set slug = 'bodyweight_squat', name = 'Bodyweight squat'
    where id = repdb_id;
  elsif repdb_id is not null and legacy_id is not null and repdb_id <> legacy_id then
    update public.exercise_equipment set exercise_id = legacy_id where exercise_id = repdb_id
      and not exists (select 1 from public.exercise_equipment existing where existing.exercise_id = legacy_id and existing.equipment_id = exercise_equipment.equipment_id);
    update public.exercise_muscles set exercise_id = legacy_id where exercise_id = repdb_id
      and not exists (select 1 from public.exercise_muscles existing where existing.exercise_id = legacy_id and existing.muscle_group = exercise_muscles.muscle_group);
    delete from public.exercise_media where exercise_id = repdb_id;
    delete from public.exercises where id = repdb_id;
  end if;
end $$;

-- The planner's historical catalogue uses underscore slugs. Normalize any
-- newly inserted hyphen slugs when their underscore form is still unused.
do $$
declare
  item record;
  normalized_slug text;
begin
  for item in select id, slug from public.exercises where slug like '%-%' loop
    normalized_slug := replace(item.slug, '-', '_');
    if not exists (select 1 from public.exercises where slug = normalized_slug) then
      update public.exercises set slug = normalized_slug where id = item.id;
    end if;
  end loop;
end $$;

-- Every active catalogue row must have an executable minimum prescription.
update public.exercises
set default_sets = coalesce(default_sets, 3),
    default_reps = coalesce(default_reps, '8–12'),
    default_duration_seconds = coalesce(default_duration_seconds, 30)
where is_active;

update public.exercises
set name = 'Bodyweight squat'
where slug = 'bodyweight_squat';
