-- Phase 03: catalogue data and reusable workout templates.
-- Preserve equipment IDs already referenced by user_equipment while normalizing slugs.
update public.equipment set slug = 'bodyweight', name = 'Bodyweight (no equipment)' where slug = 'no-equipment';
update public.equipment set slug = 'resistance_band', name = 'Resistance band' where slug = 'resistance-bands';
update public.equipment set slug = 'stationary_bike' where slug = 'stationary-bike';
update public.equipment set slug = 'jump_rope' where slug = 'jump-rope';

-- Rows in one requirement group are interchangeable options; separate groups
-- indicate equipment that must be available together.
alter table public.exercise_equipment
  add column requirement_group smallint not null default 1 check (requirement_group > 0);

insert into public.equipment (slug, name, category) values
  ('mat', 'Exercise mat', 'accessories'),
  ('chair', 'Chair or sturdy step', 'accessories')
on conflict (slug) do update set name = excluded.name, category = excluded.category;

-- Match the phase specification vocabulary: low, medium, high.
alter table public.exercises drop constraint if exists exercises_impact_level_check;
alter table public.exercises add constraint exercises_impact_level_check
  check (impact_level is null or impact_level in ('low', 'medium', 'high'));

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null check (category in ('strength', 'cardio', 'walking', 'mobility', 'recovery')),
  default_duration_minutes integer not null check (default_duration_minutes between 5 and 180),
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workout_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  position integer not null check (position > 0),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  prescribed_sets integer check (prescribed_sets is null or prescribed_sets > 0),
  prescribed_reps text,
  prescribed_duration_seconds integer check (prescribed_duration_seconds is null or prescribed_duration_seconds > 0),
  rest_seconds integer not null default 0 check (rest_seconds >= 0),
  unique (template_id, position)
);

create index workout_template_blocks_exercise_idx on public.workout_template_blocks (exercise_id);

alter table public.workout_templates enable row level security;
alter table public.workout_template_blocks enable row level security;
create policy "Authenticated users read workout templates" on public.workout_templates
  for select to authenticated using (true);
create policy "Authenticated users read workout template blocks" on public.workout_template_blocks
  for select to authenticated using (true);

insert into public.exercises (
  id, slug, name, description, instructions, category, movement_pattern,
  difficulty, impact_level, default_sets, default_reps, default_duration_seconds, is_outdoor
) values
  ('20000000-0000-4000-8000-000000000001', 'bodyweight_squat', 'Bodyweight squat', 'A basic squat to strengthen the legs and hips.', 'Stand with feet about shoulder-width apart. Sit your hips back, bend your knees within a comfortable range, then press through your whole foot to stand.', 'legs', 'squat', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000002', 'goblet_squat', 'Goblet squat', 'A squat holding one weight close to the chest.', 'Hold one dumbbell or kettlebell close to your chest. Keep your torso steady, sit your hips down between your feet, then stand smoothly.', 'legs', 'squat', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000003', 'split_squat', 'Split squat', 'A stationary single-leg squat variation.', 'Take a comfortable staggered stance. Lower straight down as far as is comfortable, keeping the front knee over the foot, then push through the front foot to rise.', 'legs', 'single_leg_squat', 'beginner', 'medium', 3, '8–10 each side', null, false),
  ('20000000-0000-4000-8000-000000000004', 'reverse_lunge', 'Reverse lunge', 'A controlled step-back lunge for the legs and hips.', 'Stand tall and step one foot back. Lower both knees gently, keeping your balance, then push through the front foot to return. Alternate sides.', 'legs', 'lunge', 'beginner', 'medium', 3, '8 each side', null, false),
  ('20000000-0000-4000-8000-000000000005', 'forward_lunge', 'Forward lunge', 'A forward-stepping lunge for the legs and hips.', 'Step forward into a comfortable stance. Lower under control without letting the front knee collapse inward, then push back to standing. Alternate sides.', 'legs', 'lunge', 'beginner', 'medium', 3, '8 each side', null, false),
  ('20000000-0000-4000-8000-000000000006', 'romanian_deadlift', 'Romanian deadlift', 'A hip hinge that works the back of the legs.', 'Hold dumbbells or a kettlebell in front of your thighs. Soften your knees, push your hips back, lower the weights along your legs, then stand by bringing your hips forward.', 'legs', 'hip_hinge', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000007', 'single_leg_rdl', 'Single-leg Romanian deadlift', 'A balance-focused hip hinge for one leg at a time.', 'Stand on one leg with a soft knee. Hinge at your hip as the free leg reaches back, keeping your back long, then return upright. Use a wall for balance if needed.', 'legs', 'single_leg_hip_hinge', 'beginner', 'low', 3, '6–8 each side', null, false),
  ('20000000-0000-4000-8000-000000000008', 'glute_bridge', 'Glute bridge', 'A floor-based hip extension exercise.', 'Lie on your back with knees bent and feet flat. Gently brace your trunk, press through your feet to lift your hips, pause, then lower slowly.', 'legs', 'hip_extension', 'beginner', 'low', 3, '10–15', null, false),
  ('20000000-0000-4000-8000-000000000009', 'hip_thrust', 'Hip thrust', 'A hip extension exercise using the floor or a stable bench.', 'Rest your upper back on a stable bench or lie on the floor. Keep your ribs relaxed, press through your feet to lift your hips, then lower with control.', 'legs', 'hip_extension', 'beginner', 'low', 3, '10–12', null, false),
  ('20000000-0000-4000-8000-000000000010', 'calf_raise', 'Calf raise', 'A simple heel raise to strengthen the lower legs.', 'Stand tall near a wall for balance. Rise onto the balls of your feet, pause briefly, then lower your heels slowly.', 'legs', 'plantar_flexion', 'beginner', 'low', 3, '12–15', null, false),
  ('20000000-0000-4000-8000-000000000011', 'step_up', 'Step-up', 'A controlled step onto a low, stable step.', 'Face a low, stable step or stair. Place one whole foot on it, stand up through that leg, then step down carefully. Alternate the leading leg.', 'legs', 'step_up', 'beginner', 'medium', 3, '8 each side', null, false),
  ('20000000-0000-4000-8000-000000000012', 'wall_sit', 'Wall sit', 'An isometric hold for the thighs and hips.', 'Lean your back against a wall and walk your feet forward. Slide down only to a comfortable depth, keep breathing, and hold. Stand up to finish.', 'legs', 'isometric_squat', 'beginner', 'low', 3, null, 30, false),
  ('20000000-0000-4000-8000-000000000013', 'push_up', 'Push-up', 'A bodyweight press for the chest, shoulders, and arms.', 'Place hands just wider than your shoulders. Keep your body in a comfortable straight line, lower your chest under control, then press the floor away.', 'push', 'horizontal_push', 'beginner', 'medium', 3, '6–12', null, false),
  ('20000000-0000-4000-8000-000000000014', 'incline_push_up', 'Incline push-up', 'A push-up with hands on a stable raised surface.', 'Place hands on a wall, sturdy chair, or bench. Keep your body aligned, bend your elbows to bring your chest toward the surface, then press away.', 'push', 'horizontal_push', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000015', 'knee_push_up', 'Knee push-up', 'A push-up variation performed with knees on the floor.', 'Place hands just wider than your shoulders and knees on the floor. Keep a straight line from knees to head, lower with control, then press up.', 'push', 'horizontal_push', 'beginner', 'low', 3, '6–12', null, false),
  ('20000000-0000-4000-8000-000000000016', 'dumbbell_floor_press', 'Dumbbell floor press', 'A chest press performed lying on the floor.', 'Lie on your back with a dumbbell in each hand and elbows resting lightly on the floor. Press weights above your chest, then lower until elbows touch down softly.', 'push', 'horizontal_push', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000017', 'dumbbell_chest_press', 'Dumbbell chest press', 'A chest press performed on a stable bench.', 'Lie on a stable bench with feet supported. Start weights beside your chest, press upward without locking hard, then lower slowly.', 'push', 'horizontal_push', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000018', 'dumbbell_shoulder_press', 'Dumbbell shoulder press', 'An overhead press for the shoulders and arms.', 'Sit or stand with light dumbbells at shoulder height. Brace gently and press overhead in a comfortable range, then lower slowly.', 'push', 'vertical_push', 'beginner', 'low', 3, '8–12', null, false),
  ('20000000-0000-4000-8000-000000000019', 'dumbbell_lateral_raise', 'Dumbbell lateral raise', 'A light shoulder exercise lifting the arms out to the sides.', 'Hold light dumbbells by your sides with elbows soft. Raise arms outward to a comfortable height, then lower slowly without swinging.', 'push', 'shoulder_abduction', 'beginner', 'low', 3, '10–15', null, false),
  ('20000000-0000-4000-8000-000000000020', 'dumbbell_row', 'Dumbbell row', 'A supported pulling exercise for the upper back.', 'Support one hand on a stable bench or chair and hinge forward. Pull the dumbbell toward your hip, keep your shoulder relaxed, then lower slowly.', 'pull', 'horizontal_pull', 'beginner', 'low', 3, '8–12 each side', null, false),
  ('20000000-0000-4000-8000-000000000021', 'one_arm_dumbbell_row', 'One-arm dumbbell row', 'A single-arm row focusing on the back and arm.', 'Brace one hand on a stable surface. Let the weight hang from the other hand, row your elbow toward your hip, then lower with control.', 'pull', 'horizontal_pull', 'beginner', 'low', 3, '8–12 each side', null, false),
  ('20000000-0000-4000-8000-000000000022', 'band_row', 'Resistance band row', 'A band row for the upper back and arms.', 'Anchor a resistance band securely at chest height. Hold an end in each hand, draw elbows back beside your body, then return slowly.', 'pull', 'horizontal_pull', 'beginner', 'low', 3, '10–15', null, false),
  ('20000000-0000-4000-8000-000000000023', 'band_pull_apart', 'Band pull-apart', 'A light band exercise for the upper back and shoulders.', 'Hold a light band at chest height with straight but soft elbows. Pull hands apart by squeezing shoulder blades gently, then return with control.', 'pull', 'horizontal_pull', 'beginner', 'low', 3, '10–15', null, false),
  ('20000000-0000-4000-8000-000000000024', 'dumbbell_reverse_fly', 'Dumbbell reverse fly', 'A light bent-over raise for the rear shoulders and upper back.', 'Hinge forward with a long back and light dumbbells hanging below your shoulders. Raise arms outward with soft elbows, then lower slowly.', 'pull', 'horizontal_abduction', 'beginner', 'low', 3, '10–12', null, false),
  ('20000000-0000-4000-8000-000000000025', 'plank', 'Plank', 'A steady trunk-strength hold from hands or forearms.', 'Set hands or forearms under your shoulders. Keep your body comfortably straight, breathe normally, and stop the hold before your back sags.', 'core', 'anti_extension', 'beginner', 'low', 3, null, 20, false),
  ('20000000-0000-4000-8000-000000000026', 'side_plank', 'Side plank', 'A side-facing trunk-strength hold.', 'Lie on your side with elbow under shoulder and knees bent or legs long. Lift hips into a comfortable line, breathe steadily, then switch sides.', 'core', 'lateral_stability', 'beginner', 'low', 3, null, 15, false),
  ('20000000-0000-4000-8000-000000000027', 'dead_bug', 'Dead bug', 'A slow coordination exercise for trunk control.', 'Lie on your back with arms up and knees bent. Gently brace, lower one arm and the opposite heel toward the floor, return, then switch sides.', 'core', 'anti_extension', 'beginner', 'low', 3, '6–8 each side', null, false),
  ('20000000-0000-4000-8000-000000000028', 'bird_dog', 'Bird dog', 'A hands-and-knees balance exercise for trunk and hips.', 'Start on hands and knees. Reach one arm forward and the opposite leg back without twisting, pause, return, then switch sides.', 'core', 'anti_rotation', 'beginner', 'low', 3, '6–8 each side', null, false),
  ('20000000-0000-4000-8000-000000000029', 'mountain_climber', 'Mountain climber', 'A stepping plank movement for core and conditioning.', 'Start in a stable high plank. Bring one knee toward your chest, return it, then switch sides at a controlled pace. Step rather than hop to reduce impact.', 'core', 'dynamic_anti_extension', 'beginner', 'medium', 3, '20 alternating', null, false),
  ('20000000-0000-4000-8000-000000000030', 'march_in_place', 'March in place', 'An easy indoor walking movement to raise activity gently.', 'Stand tall near support if needed. March comfortably, lifting each foot a small distance and swinging your arms naturally.', 'cardio', 'locomotion', 'beginner', 'low', null, null, 60, false),
  ('20000000-0000-4000-8000-000000000031', 'high_knee_march', 'High-knee march', 'A brisk march with a higher knee lift.', 'Stand tall and alternate lifting knees toward hip height only if comfortable. Keep the movement controlled and use a lower lift to reduce effort.', 'cardio', 'locomotion', 'beginner', 'medium', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000032', 'jumping_jack', 'Jumping jack', 'A full-body jumping movement for cardiovascular conditioning.', 'Start standing with arms by your sides. Step or jump feet apart as arms rise, then return to start. Use the step-out version for lower impact.', 'cardio', 'lateral_locomotion', 'beginner', 'high', null, null, 30, false),
  ('20000000-0000-4000-8000-000000000033', 'low_impact_jack', 'Low-impact jack', 'A step-out version of a jumping jack without jumping.', 'Stand tall. Step one foot out as arms lift to a comfortable height, return to center, and alternate sides at a steady pace.', 'cardio', 'lateral_locomotion', 'beginner', 'low', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000034', 'shadow_boxing', 'Shadow boxing', 'Light punches in the air for movement and coordination.', 'Stand with a comfortable staggered stance and soft knees. Alternate relaxed straight punches without locking elbows, keeping the pace easy to moderate.', 'cardio', 'upper_body_locomotion', 'beginner', 'low', null, null, 60, false),
  ('20000000-0000-4000-8000-000000000035', 'step_up_cardio', 'Step-up cardio', 'A steady step-up pattern for low-equipment conditioning.', 'Use a low, stable step. Step up one foot at a time and step down carefully, alternating the lead foot. Slow the pace whenever needed.', 'cardio', 'step_up', 'beginner', 'medium', null, null, 60, false),
  ('20000000-0000-4000-8000-000000000036', 'stationary_bike', 'Stationary bike', 'Steady cycling on a stationary bike.', 'Adjust the seat so your knee stays slightly bent at the bottom of each pedal stroke. Begin with light resistance and a comfortable, even pace.', 'cardio', 'cycling', 'beginner', 'low', null, null, 300, false),
  ('20000000-0000-4000-8000-000000000037', 'cat_cow', 'Cat-cow', 'A gentle spinal movement from hands and knees.', 'Start on hands and knees. Slowly round your back as you breathe out, then gently lengthen and lift your chest as you breathe in. Keep the range comfortable.', 'mobility', 'spinal_flexion_extension', 'beginner', 'low', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000038', 'thoracic_rotation', 'Thoracic rotation', 'A gentle upper-back rotation from a supported position.', 'Lie on your side with knees bent and arms together in front. Sweep the top arm open, follow it with your eyes, then return slowly and switch sides.', 'mobility', 'thoracic_rotation', 'beginner', 'low', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000039', 'hip_90_90', '90/90 hip switch', 'A seated hip rotation mobility movement.', 'Sit with knees bent and feet wider than hips. Let both knees fall gently to one side, return through center, and move to the other side without forcing range.', 'mobility', 'hip_rotation', 'beginner', 'low', null, null, 60, false),
  ('20000000-0000-4000-8000-000000000040', 'world_greatest_stretch', 'World’s greatest stretch', 'A gentle lunge position with upper-back rotation.', 'Step into a short lunge with hands supported on the floor or a chair. Rotate the chest gently toward the front leg, return, and switch sides.', 'mobility', 'multi_joint_mobility', 'beginner', 'low', null, null, 60, false),
  ('20000000-0000-4000-8000-000000000041', 'hamstring_stretch', 'Hamstring stretch', 'A gentle stretch for the back of the thigh.', 'Sit tall with one leg extended and the other comfortably bent. Hinge slightly from the hips until a mild stretch is felt, hold, then switch sides.', 'mobility', 'hamstring_mobility', 'beginner', 'low', null, null, 30, false),
  ('20000000-0000-4000-8000-000000000042', 'hip_flexor_stretch', 'Hip flexor stretch', 'A supported half-kneeling stretch at the front of the hip.', 'Take a short half-kneeling stance with support nearby. Gently tuck your pelvis and shift forward a little until you feel a mild stretch, then switch sides.', 'mobility', 'hip_extension_mobility', 'beginner', 'low', null, null, 30, false),
  ('20000000-0000-4000-8000-000000000043', 'child_pose', 'Child’s pose', 'A comfortable kneeling rest position for back and hips.', 'Kneel on a mat or soft surface and sit hips toward heels as far as comfortable. Rest hands forward or by your sides and breathe gently.', 'mobility', 'rest_position', 'beginner', 'low', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000044', 'shoulder_mobility', 'Shoulder mobility reach', 'A controlled arm reach for comfortable shoulder movement.', 'Stand or sit tall. Slowly raise one arm forward and overhead only within a comfortable range, lower, and alternate. Keep your neck relaxed.', 'mobility', 'shoulder_flexion', 'beginner', 'low', null, null, 45, false),
  ('20000000-0000-4000-8000-000000000045', 'walk_easy', 'Easy walk', 'A relaxed outdoor walk at a conversational pace.', 'Walk on a familiar, even route at a pace that feels easy. Keep your stride natural and turn back whenever you need.', 'outdoor', 'walking', 'beginner', 'low', null, null, 1200, true),
  ('20000000-0000-4000-8000-000000000046', 'walk_brisk', 'Brisk walk', 'A purposeful outdoor walk while still able to speak.', 'Walk on a familiar route at a brisk but manageable pace. You should still be able to speak in short sentences; slow down whenever needed.', 'outdoor', 'walking', 'beginner', 'medium', null, null, 1200, true),
  ('20000000-0000-4000-8000-000000000047', 'walk_interval', 'Walk intervals', 'Alternating easy and brisk walking segments outdoors.', 'On a familiar, even route, alternate one minute brisk with two minutes easy. Repeat at a comfortable effort and finish with an easy pace.', 'outdoor', 'walking_intervals', 'beginner', 'medium', null, null, 900, true)
on conflict (slug) do nothing;

insert into public.exercise_equipment (exercise_id, equipment_id, requirement_group)
select exercise.id, equipment.id, mapping.requirement_group
from (values
  ('bodyweight_squat', 'bodyweight', 1), ('goblet_squat', 'dumbbells', 1), ('goblet_squat', 'kettlebell', 1),
  ('split_squat', 'bodyweight', 1), ('split_squat', 'dumbbells', 1), ('reverse_lunge', 'bodyweight', 1), ('reverse_lunge', 'dumbbells', 1),
  ('forward_lunge', 'bodyweight', 1), ('forward_lunge', 'dumbbells', 1), ('romanian_deadlift', 'dumbbells', 1), ('romanian_deadlift', 'kettlebell', 1),
  ('single_leg_rdl', 'bodyweight', 1), ('single_leg_rdl', 'dumbbells', 1), ('glute_bridge', 'bodyweight', 1), ('hip_thrust', 'bodyweight', 1), ('hip_thrust', 'bench', 1),
  ('calf_raise', 'bodyweight', 1), ('step_up', 'bodyweight', 1), ('step_up', 'chair', 1), ('wall_sit', 'bodyweight', 1),
  ('push_up', 'bodyweight', 1), ('incline_push_up', 'bodyweight', 1), ('incline_push_up', 'chair', 1), ('knee_push_up', 'bodyweight', 1),
  ('dumbbell_floor_press', 'dumbbells', 1), ('dumbbell_chest_press', 'dumbbells', 1), ('dumbbell_chest_press', 'bench', 2),
  ('dumbbell_shoulder_press', 'dumbbells', 1), ('dumbbell_lateral_raise', 'dumbbells', 1),
  ('dumbbell_row', 'dumbbells', 1), ('one_arm_dumbbell_row', 'dumbbells', 1),
  ('band_row', 'resistance_band', 1), ('band_pull_apart', 'resistance_band', 1), ('dumbbell_reverse_fly', 'dumbbells', 1),
  ('plank', 'bodyweight', 1), ('side_plank', 'bodyweight', 1), ('dead_bug', 'bodyweight', 1), ('bird_dog', 'bodyweight', 1), ('mountain_climber', 'bodyweight', 1),
  ('march_in_place', 'bodyweight', 1), ('high_knee_march', 'bodyweight', 1), ('jumping_jack', 'bodyweight', 1), ('low_impact_jack', 'bodyweight', 1),
  ('shadow_boxing', 'bodyweight', 1), ('step_up_cardio', 'bodyweight', 1), ('step_up_cardio', 'chair', 1), ('stationary_bike', 'stationary_bike', 1),
  ('cat_cow', 'bodyweight', 1), ('thoracic_rotation', 'bodyweight', 1), ('hip_90_90', 'bodyweight', 1), ('world_greatest_stretch', 'bodyweight', 1),
  ('hamstring_stretch', 'bodyweight', 1), ('hip_flexor_stretch', 'bodyweight', 1), ('child_pose', 'bodyweight', 1), ('child_pose', 'mat', 1), ('shoulder_mobility', 'bodyweight', 1),
  ('walk_easy', 'bodyweight', 1), ('walk_brisk', 'bodyweight', 1), ('walk_interval', 'bodyweight', 1)
) as mapping(exercise_slug, equipment_slug, requirement_group)
join public.exercises exercise on exercise.slug = mapping.exercise_slug
join public.equipment equipment on equipment.slug = mapping.equipment_slug
on conflict do nothing;

insert into public.exercise_muscles (exercise_id, muscle_group)
select exercise.id, mapping.muscle_group
from (values
  ('bodyweight_squat', 'quadriceps'), ('bodyweight_squat', 'glutes'), ('bodyweight_squat', 'core'),
  ('goblet_squat', 'quadriceps'), ('goblet_squat', 'glutes'), ('goblet_squat', 'core'),
  ('split_squat', 'quadriceps'), ('split_squat', 'glutes'), ('reverse_lunge', 'quadriceps'), ('reverse_lunge', 'glutes'),
  ('forward_lunge', 'quadriceps'), ('forward_lunge', 'glutes'), ('romanian_deadlift', 'hamstrings'), ('romanian_deadlift', 'glutes'),
  ('single_leg_rdl', 'hamstrings'), ('single_leg_rdl', 'glutes'), ('single_leg_rdl', 'core'),
  ('glute_bridge', 'glutes'), ('glute_bridge', 'hamstrings'), ('hip_thrust', 'glutes'), ('hip_thrust', 'hamstrings'),
  ('calf_raise', 'calves'), ('step_up', 'quadriceps'), ('step_up', 'glutes'), ('wall_sit', 'quadriceps'),
  ('push_up', 'chest'), ('push_up', 'triceps'), ('push_up', 'shoulders'), ('incline_push_up', 'chest'), ('incline_push_up', 'triceps'),
  ('knee_push_up', 'chest'), ('knee_push_up', 'triceps'), ('dumbbell_floor_press', 'chest'), ('dumbbell_floor_press', 'triceps'),
  ('dumbbell_chest_press', 'chest'), ('dumbbell_chest_press', 'triceps'), ('dumbbell_shoulder_press', 'shoulders'),
  ('dumbbell_shoulder_press', 'triceps'), ('dumbbell_lateral_raise', 'shoulders'),
  ('dumbbell_row', 'upper_back'), ('dumbbell_row', 'biceps'), ('one_arm_dumbbell_row', 'upper_back'), ('one_arm_dumbbell_row', 'biceps'),
  ('band_row', 'upper_back'), ('band_row', 'biceps'), ('band_pull_apart', 'upper_back'), ('band_pull_apart', 'shoulders'),
  ('dumbbell_reverse_fly', 'upper_back'), ('dumbbell_reverse_fly', 'shoulders'),
  ('plank', 'core'), ('plank', 'shoulders'), ('side_plank', 'core'), ('dead_bug', 'core'), ('bird_dog', 'core'), ('bird_dog', 'glutes'),
  ('mountain_climber', 'core'), ('mountain_climber', 'shoulders'),
  ('march_in_place', 'quadriceps'), ('march_in_place', 'calves'), ('high_knee_march', 'quadriceps'), ('high_knee_march', 'core'),
  ('jumping_jack', 'calves'), ('jumping_jack', 'shoulders'), ('low_impact_jack', 'calves'), ('shadow_boxing', 'shoulders'),
  ('shadow_boxing', 'core'), ('step_up_cardio', 'quadriceps'), ('step_up_cardio', 'glutes'), ('stationary_bike', 'quadriceps'),
  ('stationary_bike', 'hamstrings'), ('cat_cow', 'back'), ('thoracic_rotation', 'upper_back'), ('hip_90_90', 'hips'),
  ('world_greatest_stretch', 'hips'), ('world_greatest_stretch', 'upper_back'), ('hamstring_stretch', 'hamstrings'),
  ('hip_flexor_stretch', 'hip_flexors'), ('child_pose', 'back'), ('shoulder_mobility', 'shoulders'),
  ('walk_easy', 'quadriceps'), ('walk_easy', 'calves'), ('walk_brisk', 'quadriceps'), ('walk_brisk', 'calves'),
  ('walk_interval', 'quadriceps'), ('walk_interval', 'calves')
) as mapping(exercise_slug, muscle_group)
join public.exercises exercise on exercise.slug = mapping.exercise_slug
on conflict do nothing;

insert into public.workout_templates (slug, name, description, category, default_duration_minutes, difficulty) values
  ('strength_full_body_a', 'Full-body strength A', 'A simple whole-body strength session using beginner-friendly movements.', 'strength', 30, 'beginner'),
  ('strength_full_body_b', 'Full-body strength B', 'A second whole-body strength option with different movement variations.', 'strength', 30, 'beginner'),
  ('strength_upper', 'Upper-body strength', 'A balanced push and pull session for the upper body.', 'strength', 25, 'beginner'),
  ('strength_lower', 'Lower-body strength', 'A lower-body session covering squatting, hinging, and calves.', 'strength', 25, 'beginner'),
  ('cardio_low_impact', 'Low-impact cardio', 'Steady, low-impact movements for a comfortable cardio session.', 'cardio', 20, 'beginner'),
  ('cardio_mixed', 'Mixed cardio', 'A mix of steady and brisk intervals with low-impact alternatives.', 'cardio', 20, 'beginner'),
  ('walking_20', 'Easy walk · 20 min', 'A relaxed twenty-minute outdoor walk.', 'walking', 20, 'beginner'),
  ('walking_30', 'Brisk walk · 30 min', 'A thirty-minute outdoor walk with easy and brisk segments.', 'walking', 30, 'beginner'),
  ('walking_45', 'Walk intervals · 45 min', 'An outdoor walk alternating manageable brisk and easy segments.', 'walking', 45, 'beginner'),
  ('mobility_15', 'Mobility · 15 min', 'A short whole-body mobility sequence with comfortable ranges.', 'mobility', 15, 'beginner'),
  ('mobility_30', 'Mobility · 30 min', 'A longer, unhurried whole-body mobility sequence.', 'mobility', 30, 'beginner'),
  ('recovery_15', 'Recovery · 15 min', 'Gentle movements and easy walking for a light recovery session.', 'recovery', 15, 'beginner')
on conflict (slug) do nothing;

insert into public.workout_template_blocks (
  template_id, position, exercise_id, prescribed_sets, prescribed_reps, prescribed_duration_seconds, rest_seconds
)
select template.id, block.position, exercise.id, block.prescribed_sets, block.prescribed_reps, block.prescribed_duration_seconds, block.rest_seconds
from (values
  ('strength_full_body_a', 1, 'bodyweight_squat', 3, '8–12', null::integer, 60),
  ('strength_full_body_a', 2, 'incline_push_up', 3, '8–12', null::integer, 60),
  ('strength_full_body_a', 3, 'glute_bridge', 3, '10–15', null::integer, 45),
  ('strength_full_body_a', 4, 'bird_dog', 2, '6 each side', null::integer, 30),
  ('strength_full_body_a', 5, 'calf_raise', 2, '12–15', null::integer, 30),
  ('strength_full_body_b', 1, 'reverse_lunge', 3, '8 each side', null::integer, 60),
  ('strength_full_body_b', 2, 'knee_push_up', 3, '6–12', null::integer, 60),
  ('strength_full_body_b', 3, 'single_leg_rdl', 3, '6 each side', null::integer, 45),
  ('strength_full_body_b', 4, 'dead_bug', 2, '8 each side', null::integer, 30),
  ('strength_full_body_b', 5, 'wall_sit', 2, null::text, 30, 45),
  ('strength_upper', 1, 'push_up', 3, '6–12', null::integer, 60),
  ('strength_upper', 2, 'band_row', 3, '10–15', null::integer, 45),
  ('strength_upper', 3, 'dumbbell_shoulder_press', 3, '8–12', null::integer, 45),
  ('strength_upper', 4, 'band_pull_apart', 2, '12–15', null::integer, 30),
  ('strength_upper', 5, 'plank', 2, null::text, 20, 30),
  ('strength_lower', 1, 'bodyweight_squat', 3, '8–12', null::integer, 60),
  ('strength_lower', 2, 'romanian_deadlift', 3, '8–12', null::integer, 60),
  ('strength_lower', 3, 'step_up', 3, '8 each side', null::integer, 45),
  ('strength_lower', 4, 'glute_bridge', 3, '10–15', null::integer, 45),
  ('strength_lower', 5, 'calf_raise', 2, '12–15', null::integer, 30),
  ('cardio_low_impact', 1, 'march_in_place', null::integer, null::text, 180, 30),
  ('cardio_low_impact', 2, 'low_impact_jack', null::integer, null::text, 180, 30),
  ('cardio_low_impact', 3, 'shadow_boxing', null::integer, null::text, 180, 30),
  ('cardio_low_impact', 4, 'march_in_place', null::integer, null::text, 180, 0),
  ('cardio_mixed', 1, 'march_in_place', null::integer, null::text, 120, 30),
  ('cardio_mixed', 2, 'high_knee_march', null::integer, null::text, 45, 30),
  ('cardio_mixed', 3, 'low_impact_jack', null::integer, null::text, 120, 30),
  ('cardio_mixed', 4, 'shadow_boxing', null::integer, null::text, 120, 0),
  ('walking_20', 1, 'walk_easy', null::integer, null::text, 1200, 0),
  ('walking_30', 1, 'walk_easy', null::integer, null::text, 300, 0),
  ('walking_30', 2, 'walk_brisk', null::integer, null::text, 1200, 0),
  ('walking_30', 3, 'walk_easy', null::integer, null::text, 300, 0),
  ('walking_45', 1, 'walk_easy', null::integer, null::text, 300, 0),
  ('walking_45', 2, 'walk_brisk', null::integer, null::text, 600, 0),
  ('walking_45', 3, 'walk_easy', null::integer, null::text, 300, 0),
  ('walking_45', 4, 'walk_brisk', null::integer, null::text, 900, 0),
  ('walking_45', 5, 'walk_easy', null::integer, null::text, 600, 0),
  ('mobility_15', 1, 'cat_cow', null::integer, null::text, 90, 0),
  ('mobility_15', 2, 'thoracic_rotation', null::integer, null::text, 120, 0),
  ('mobility_15', 3, 'hip_90_90', null::integer, null::text, 120, 0),
  ('mobility_15', 4, 'hamstring_stretch', null::integer, null::text, 120, 0),
  ('mobility_15', 5, 'hip_flexor_stretch', null::integer, null::text, 120, 0),
  ('mobility_15', 6, 'child_pose', null::integer, null::text, 90, 0),
  ('mobility_30', 1, 'cat_cow', null::integer, null::text, 120, 0),
  ('mobility_30', 2, 'thoracic_rotation', null::integer, null::text, 180, 0),
  ('mobility_30', 3, 'hip_90_90', null::integer, null::text, 180, 0),
  ('mobility_30', 4, 'world_greatest_stretch', null::integer, null::text, 180, 0),
  ('mobility_30', 5, 'hamstring_stretch', null::integer, null::text, 180, 0),
  ('mobility_30', 6, 'hip_flexor_stretch', null::integer, null::text, 180, 0),
  ('mobility_30', 7, 'child_pose', null::integer, null::text, 180, 0),
  ('mobility_30', 8, 'shoulder_mobility', null::integer, null::text, 180, 0),
  ('recovery_15', 1, 'walk_easy', null::integer, null::text, 300, 0),
  ('recovery_15', 2, 'cat_cow', null::integer, null::text, 120, 0),
  ('recovery_15', 3, 'hip_90_90', null::integer, null::text, 180, 0),
  ('recovery_15', 4, 'child_pose', null::integer, null::text, 120, 0)
) as block(template_slug, position, exercise_slug, prescribed_sets, prescribed_reps, prescribed_duration_seconds, rest_seconds)
join public.workout_templates template on template.slug = block.template_slug
join public.exercises exercise on exercise.slug = block.exercise_slug
on conflict (template_id, position) do nothing;
