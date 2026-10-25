# Informe: series en `/workout/:id`

## 1. MODELO DE DATOS ACTUAL

### Tablas y DDL

La ejecución se persiste en tres tablas:

- `planned_workouts`: definición planificada del entreno.
- `workout_sessions`: una ejecución concreta.
- `exercise_sessions`: una fila por ejercicio dentro de una ejecución.

Fuente: [`supabase/migrations/20261008100000_planner_ui_sessions.sql`](supabase/migrations/20261008100000_planner_ui_sessions.sql:14).

```sql
create table public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null, -- eliminado posteriormente
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
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (weekly_plan_id, user_id)
    references public.weekly_plans(id, user_id) on delete cascade,
  unique (weekly_plan_id, workout_date),
  unique (id, user_id)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  planned_workout_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'skipped')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  planned_duration_minutes integer not null
    check (planned_duration_minutes between 1 and 240),
  actual_duration_minutes integer
    check (actual_duration_minutes is null or actual_duration_minutes >= 0),
  perceived_exertion smallint
    check (perceived_exertion is null or perceived_exertion between 1 and 5),
  note text
    check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (planned_workout_id, user_id)
    references public.planned_workouts(id, user_id) on delete cascade,
  unique (id, user_id)
);

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null,
  planned_workout_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null check (position > 0),
  status text not null default 'planned'
    check (status in ('planned', 'done', 'skipped')),
  sets_completed integer
    check (sets_completed is null or sets_completed >= 0),
  reps_completed text,
  duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workout_session_id, user_id)
    references public.workout_sessions(id, user_id) on delete cascade,
  foreign key (planned_workout_id, user_id)
    references public.planned_workouts(id, user_id) on delete cascade,
  unique (workout_session_id, position)
);
```

Índices y triggers:

```sql
create index planned_workouts_user_date_idx
  on public.planned_workouts(user_id, workout_date);

create index workout_sessions_user_started_idx
  on public.workout_sessions(user_id, started_at desc);

create index exercise_sessions_user_idx
  on public.exercise_sessions(user_id, created_at desc);

create trigger planned_workouts_set_updated_at
  before update on public.planned_workouts
  for each row execute function public.set_updated_at();

create trigger exercise_sessions_set_updated_at
  before update on public.exercise_sessions
  for each row execute function public.set_updated_at();
```

`weekly_plans` se creó originalmente, pero [`20261014100000_templates_replace_weekly_plans.sql`](supabase/migrations/20261014100000_templates_replace_weekly_plans.sql:40) elimina sus datos, elimina `planned_workouts.weekly_plan_id` y elimina la tabla.

El esquema final añade a `planned_workouts`:

```sql
alter table public.planned_workouts
  add column source_type text not null default 'generated'
    check (source_type in ('generated', 'user_template', 'catalogue_template'));

alter table public.planned_workouts
  add column source_template_id uuid
    references public.user_workout_templates(id) on delete set null;
```

Para racha, `workout_sessions` añade:

```sql
alter table public.workout_sessions
  add column completed_local_date date,
  add column completion_timezone text;

create index workout_sessions_user_completion_date_idx
  on public.workout_sessions(user_id, completed_local_date)
  where status = 'completed'
    and completed_local_date is not null;
```

Fuente: [`supabase/migrations/20261010100000_daily_training_streak.sql`](supabase/migrations/20261010100000_daily_training_streak.sql:14).

### RLS

```sql
alter table public.planned_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_sessions enable row level security;

create policy "Users manage their own planned workouts"
on public.planned_workouts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own workout sessions"
on public.workout_sessions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own exercise sessions"
on public.exercise_sessions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Fuente: [`supabase/migrations/20261008100000_planner_ui_sessions.sql`](supabase/migrations/20261008100000_planner_ui_sessions.sql:78).

### Funciones, RPC y triggers

No hay RPC ni funciones específicas de entrenos. Solo se usa la función genérica `public.set_updated_at()` definida en [`supabase/migrations/20261007000000_initial_schema.sql`](supabase/migrations/20261007000000_initial_schema.sql:3).

No hay triggers que calculen estados, series, crédito de racha ni finalización automáticamente.

### Dónde vive actualmente el estado

El estado de cada ejercicio vive en `exercise_sessions.status`, no en el cliente ni en un JSON:

```text
planned | done | skipped
```

La fila es única por ejercicio y posición dentro de una sesión:

```sql
unique (workout_session_id, position)
```

Los datos prescritos del entreno (`exercises`, `workout_json`) sí están en JSONB dentro de `planned_workouts`, pero el estado de ejecución no.

Tipos TypeScript:

- Sesión planificada: `WorkoutStatus = 'planned' | 'completed' | 'skipped'`.
- Ejercicio planificado: [`src/planner/types.ts`](src/planner/types.ts:47).
- No existe un tipo global de estado de `exercise_sessions` en `src/planner/types.ts`.
- El tipo local de ejecución está en [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1418):

```ts
type ExerciseSession = {
  id: string;
  position: number;
  status: "planned" | "done" | "skipped";
  exercise_id: string;
};

type ActiveSession = {
  id: string;
  status: "in_progress" | "completed" | "skipped";
  started_at: string;
  completed_at: string | null;
  actual_duration_minutes: number | null;
  perceived_exertion: number | null;
  note: string | null;
  exercise_sessions: ExerciseSession[];
};
```

## 2. PERSISTENCIA EN LA VISTA WORKOUT

La ruta está declarada en [`src/app/App.tsx`](src/app/App.tsx:40):

```tsx
<Route path="/workout/:id" element={<RequireAuthenticated><WorkoutPage /></RequireAuthenticated>} />
```

El componente completo está en [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1432).

### Inicio

Al pulsar “Start workout” se inserta una fila en `workout_sessions` y todas las filas iniciales en `exercise_sessions`, con estado `planned`.

Fuente: [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:239).

### Marcar hecho, omitir y deshacer

Cada acción escribe inmediatamente en la base de datos:

```ts
export async function setExerciseStatus(
  userId: string,
  exerciseSessionId: string,
  status: 'planned' | 'done' | 'skipped',
) {
  const result = await client()
    .from('exercise_sessions')
    .update({ status })
    .eq('user_id', userId)
    .eq('id', exerciseSessionId);

  throwOnError(result);
}
```

Fuente: [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:264).

La vista llama a esta función para hecho, omitido y deshacer. Después de cada acción ejecuta `reload()`, que vuelve a consultar sesión y ejercicios desde Supabase.

### Recarga a mitad del entreno

`loadActiveSession()` vuelve a consultar la última sesión para ese `planned_workout_id` y sus `exercise_sessions`.

Fuente: [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:257).

Se restaura el estado de sesión, hora de inicio, estados `planned/done/skipped`, duración, RPE y nota si ya existieran. No se restaura ningún estado de series porque actualmente no existe.

### Finalización normal

El botón actual solo se habilita cuando todos los ejercicios tienen estado distinto de `planned`:

```ts
const allExercisesHandled =
  Boolean(active?.exercise_sessions.length) &&
  handledCount === active.exercise_sessions.length;
```

Fuente: [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1519).

El backend exige además que haya al menos un ejercicio `done` antes de completar.

Al finalizar se actualizan `workout_sessions` y `planned_workouts`. Se guarda la duración real calculada desde `started_at`, RPE, nota, fecha local y zona horaria.

Fuentes: [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1545) y [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:269).

### “Finalizar como omitido”

“End session as skipped” cambia `workout_sessions.status` a `skipped`, escribe `completed_at`, cambia `planned_workouts.status` a `skipped`, no escribe `completed_local_date` y navega a `/today`.

Fuente: [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:286) y [`PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1569).

## 3. RACHA E HISTORIAL

[`src/lib/historyData.ts`](src/lib/historyData.ts:222) consulta solo sesiones con `status = 'completed'` e incluye `exercise_sessions(status)`.

La condición exacta de crédito es:

```ts
function isActivityCredit(session: CompletedWorkoutHistoryRow) {
  return Boolean(
    session.completed_local_date &&
    session.exercise_sessions?.some(
      (exercise) => exercise.status === 'done'
    )
  );
}
```

Fuente: [`src/lib/historyData.ts`](src/lib/historyData.ts:100).

El crédito exige:

1. `workout_sessions.status = 'completed'` por el filtro de consulta.
2. `completed_local_date` no nulo.
3. Al menos un `exercise_sessions.status = 'done'`.

No exige que todos los ejercicios estén hechos y no usa `planned_workouts.status` para decidir el crédito.

`HistoryPage` muestra calendario y un modal por día. El detalle muestra nombre del entreno y duración, pero no el estado individual de cada ejercicio. La pantalla de resumen de `/workout/:id` sí muestra `Done`, `Skipped` o `Planned` para cada ejercicio.

Fuentes: [`src/features/history/HistoryPage.tsx`](src/features/history/HistoryPage.tsx:96) y [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1640).

## 4. PRUEBAS

[`tests/history.test.ts`](tests/history.test.ts:6) cubre resumen semanal/mensual, minutos activos, racha, días duplicados, sesiones con algún `done`, sesiones solo `skipped`, ausencia de `completed_local_date`, zonas horarias y calendario.

Los tests pasan datos directamente a `summarizeWorkoutHistory`; no mockean Supabase.

No hay actualmente tests específicos de `WorkoutPage`, inicio, marcar hecho, omitir, deshacer, habilitación del botón, completar o finalizar como omitido.

[`tests/planner-ui.test.tsx`](tests/planner-ui.test.tsx:9) mockea `completeWorkout`, `loadActiveSession`, `setExerciseStatus` y `startWorkout`, pero solo renderiza `TodayPage`.

## 5. IMPACTO DE LA NUEVA FUNCIÓN

### A) Series y estado por serie solo en cliente; persistir “hecho alguna vez” por ejercicio

Archivos principales:

- [`src/features/planner/PlannerPages.tsx`](src/features/planner/PlannerPages.tsx:1432): estado de serie actual, reinicio visual y nueva habilitación del botón.
- [`src/features/planner/plannerData.ts`](src/features/planner/plannerData.ts:264): evitar que deshacer o reiniciar sobrescriban `done` persistido.
- [`src/planner/types.ts`](src/planner/types.ts:47): opcional, si se hacen públicos los tipos de serie.

No requiere migración si `exercise_sessions.status = 'done'` se conserva como indicador de “hecho alguna vez”.

La racha seguiría funcionando porque ya busca cualquier ejercicio con `status = 'done'`.

El riesgo es que la columna actual `status` no puede representar a la vez el estado de la serie actual y el estado histórico. Si el reinicio escribe `planned`, o el deshacer posterior escribe `planned`, se pierde el único indicador persistido de que se hizo el ejercicio. La solución es tratar `done` como monotónico durante la sesión y mantener separado en React el estado visual de la serie actual.

La recarga conservaría “hecho alguna vez” si sigue en DB, pero perdería el número de serie y estados visuales incompletos si estos son solo de cliente.

**Esfuerzo: medio.** No cambia el esquema, pero separa dos conceptos que ahora comparten una columna.

### B) Guardar cuántas series se completaron

Requiere una migración sobre `workout_sessions`, por ejemplo:

```sql
alter table public.workout_sessions
  add column completed_sets integer not null default 0
    check (completed_sets >= 0);
```

También requiere actualizar carga, escritura, UI y tests. La racha no tendría que cambiar.

Hay que definir si una serie parcialmente hecha cuenta y cómo se trata una serie con ejercicios omitidos.

**Esfuerzo: medio.**

### C) Guardar estado por ejercicio y por serie

Requiere una tabla nueva con, al menos, `workout_session_id`, `exercise_id`, `series_number`, `status`, claves foráneas, índice, RLS y trigger.

También requiere nuevos tipos, consultas, mutaciones, lógica de completar serie, tests y probablemente decidir cómo migrar sesiones existentes.

La racha tendría que consultar la tabla nueva o conservar una columna resumen de “hecho alguna vez”.

**Esfuerzo: alto.** Es la opción más completa y auditable.

### Casos de pérdida de crédito con A

| Caso | Resultado con el código actual |
|---|---|
| Marcar hecho en serie 1 | Se persiste `done`; da crédito si se termina como completado. |
| Reiniciar escribiendo `planned` | Se pierde el `done` persistido. |
| Deshacer en serie 2 escribiendo `planned` | Se pierde el `done` persistido. |
| Marcar omitido en serie 2 sobrescribiendo `done` | Se pierde el `done` persistido. |
| Terminar en serie 2 manteniendo `done` en DB | Conserva crédito. |
| Recargar después de serie 1 | Conserva crédito si `done` sigue en DB, pero no necesariamente el estado visual de serie. |
| Finalizar como omitido | No hay crédito: la sesión queda `skipped` y no tiene `completed_local_date`. |

Conclusión: A es viable sin migración solo si `done` pasa a significar “hecho en alguna serie” y el estado de la serie actual queda separado en el cliente.

## 6. CONFLICTOS Y PREGUNTAS ABIERTAS

1. ¿“Deshacer” deshace solo la serie actual o también elimina el hecho histórico del ejercicio? Para conservar crédito debería afectar solo a la serie actual.
2. Si el número de serie es solo cliente, una recarga lo pierde. Hay que decidir si se acepta, si se usa `localStorage` o si se persiste en servidor.
3. ¿Se puede finalizar con una serie incompleta en cuanto haya algún ejercicio `done`?
4. ¿Una serie con todos los ejercicios omitidos cuenta como completada y permite avanzar?
5. Actualmente finalizar como omitido elimina el crédito incluso si hubo ejercicios `done` antes. Hay que decidir si eso debe cambiar.
6. El resumen actual muestra el estado persistido final de cada ejercicio. Con A ese estado representaría “hecho alguna vez”, no necesariamente el estado de la última serie.
7. `exercise_sessions` ya tiene `sets_completed`, `reps_completed` y `duration_seconds`, pero la vista no los escribe ni muestra; no representan estados independientes por serie.
8. No existen tests específicos de workout; habrá que añadir cobertura para series, recarga, deshacer, habilitación temprana y racha.
