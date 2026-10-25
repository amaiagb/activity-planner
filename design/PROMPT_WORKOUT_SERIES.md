# Prompt para Codex: series en /workout/:id (rediseño + persistencia)

Referencia visual: `design/mockups/workout-series-mockup.html` (cópialo al repo). Sustituye al prompt anterior de `workout-ux-mockups.html`: si ya aplicaste aquel, este lo modifica; si no, impleméntalo todo desde aquí.
Ignora del mockup la nota inferior y la barra de navegación simulada.

## 0. Reglas
- Nunca reescribas un archivo entero ni borres CSS ajeno; edita solo los bloques necesarios, sin reformatear ni cambiar saltos de línea (CRLF).
- No toques `src/planner`, `src/lib/historyData.ts` (la racha) ni el modal de finalizar salvo lo indicado. Todo texto por `useI18n().t` (ES y EN). Tema claro y oscuro.
- Antes de empezar, ejecuta `git status` y dime qué parte del diseño anterior de Workout ya está aplicada.
- No marques nada como hecho sin evidencia (ver informe final).

## 1. Decisiones de producto (cerradas)
1. El entreno tiene SERIES. Las series son independientes: al completarse una, toda la lista vuelve a pendiente (lo omitido en una serie no afecta a la siguiente).
2. Una serie se completa cuando ningún ejercicio queda pendiente Y al menos uno está hecho en esa serie. Una serie con todos omitidos NO se completa ni avanza.
3. "Terminar entreno" se habilita en cuanto CUALQUIER ejercicio se ha marcado como hecho en CUALQUIER serie (aunque la serie actual esté incompleta o reiniciada). Omitir no lo habilita.
4. "Deshacer" afecta solo a la serie actual y nunca elimina un "hecho" de una serie anterior.
5. "Finalizar como omitido" no cambia (sigue sin dar crédito de racha).
6. No hay mensaje de ayuda. No hay botón Deshacer en el aviso de serie completada.

## 2. Arquitectura (confirmada por el informe del repo)
Hoy `exercise_sessions.status` (planned | done | skipped) se escribe en cada acción y `historyData.ts` da crédito de racha si la sesión está `completed` con `completed_local_date` y al menos un ejercicio `done`. Eso no debe cambiar.

**Nuevo significado de `exercise_sessions.status`:** "hecho en alguna serie". Es MONOTÓNICO: un `done` persistido nunca se sobrescribe con `planned` ni `skipped` mientras dure la sesión, salvo el Deshacer descrito abajo. El estado visual de la serie actual vive en el cliente (React), separado del persistido.

**Migración (única, sin tablas nuevas):** crea `supabase/migrations/<timestamp mayor que 20261014100000>_workout_completed_sets.sql`:
```sql
alter table public.workout_sessions
  add column completed_sets integer not null default 0
    check (completed_sets >= 0);
```
Sin cambios de RLS (la política "for all" existente cubre la columna) y sin backfill. Si `supabase/tests` tiene tests por migración, añade uno equivalente. Actualiza `ActiveSession`, `loadActiveSession` (select) y cualquier tipo generado de Supabase.

**Reglas de escritura** (`plannerData.ts`, sin tocar la firma pública de las funciones existentes salvo lo necesario):
- Hecho: persiste `done` (omite la escritura si ya es `done`).
- Omitir: persiste `skipped` SOLO si el estado persistido es `planned`; nunca sobrescribe `done` ni reescribe `skipped`.
- Deshacer: devuelve el estado persistido al que tenía el ejercicio al INICIO de la serie actual (`seriesStartStatus[id]`), solo si difiere del actual. Si ya estaba `done` al inicio de la serie, no escribe nada.
- Al completar una serie: `completed_sets += 1` en `workout_sessions` y reinicio visual de la lista. NUNCA se escribe `planned` en `exercise_sessions` por un reinicio. `seriesStartStatus` pasa a ser una copia de los estados persistidos en ese momento.
- Mantén el patrón actual de guardado y errores (botones deshabilitados mientras guarda, `role="alert"` en error). No hagas depender el estado de la serie de `reload()`; si recargas datos, no pises el estado visual de la serie actual.

**Hidratación al cargar (recarga o vuelta a la app entre series):**
- `completed_sets === 0`: la lista actual se rellena desde los estados persistidos (como hoy).
- `completed_sets > 0`: serie en curso = `completed_sets + 1`, lista visual toda pendiente, `seriesStartStatus` = estados persistidos.
- "Terminar entreno" se habilita si algún ejercicio persistido está `done` o hay alguno hecho en la serie actual.

Extrae la lógica de series a un módulo puro (por ejemplo `src/features/planner/workoutSeries.ts`) que reciba estado + acción y devuelva el nuevo estado y la lista de operaciones de persistencia, para poder testearla sin React ni Supabase.

## 3. Interfaz
1. **Fila "Series"** bajo el título: etiqueta "Series" (13 px, mayúsculas, muted) a la izquierda y a la derecha círculos de 40 px numerados 1, 2, 3 (como mínimo 3; aparece uno más cuando el usuario completa el último: siempre `max(3, completed_sets + 1)`). Son indicadores NO interactivos, en una lista `<ol>`: completada = relleno lima, borde de tinta e icono de check; en curso = borde de tinta (`aria-current="step"`); futura = borde var(--line) y número muted. `aria-label` por círculo ("Serie 2, en curso").
2. **Barra de progreso continua** (no segmentada) con "N de M" referido a la serie ACTUAL (resueltos de la lista).
3. **Aviso de serie completada:** al completar una serie, bloque lima (radio 14, padding 12x14, texto 14 px bold, `role="status"`) con "Serie N completada. Empieza la serie N+1." Sin botones. Desaparece con la siguiente acción del usuario. NO debe renderizarse (ni dejar contenedor vacío) cuando no hay mensaje; si usas `hidden`, comprueba que ningún `display` de la clase lo anula (hay una regla `[hidden]{display:none!important}` en el mockup por esta causa).
4. **Lista de ejercicios** (una superficie, filas separadas por 1 px), exactamente como en el mockup:
   - Círculo de estado de 34 px: pendiente = contorno de tinta; hecho = relleno lima con check; omitido = relleno amarillo con raya.
   - Nombre en hasta 2+ líneas sin truncar y debajo la meta. OCULTA el texto "3 series"; muestra solo las repeticiones ("8–12 repeticiones" / "8–12 reps"), a partir del dato existente.
   - Etiquetas: "Ahora" (lima) en el primer pendiente; "Omitido" (amarillo) en los omitidos de la serie actual.
   - Derecha: pendiente = botón de información 44 px que abre "Ver ejercicio"; hecho u omitido = botón de texto "Deshacer".
   - El ejercicio "Ahora" tiene fondo lima suave (`--lime-soft`) y un bloque desplegado con "Hecho" (botón lima, borde 2 px #111, radio 14, ≥ 50 px, check + texto) y "Omitir" (botón de texto subrayado). Solo un bloque desplegado a la vez; tocar otra fila pendiente cambia el desplegado (`aria-expanded`). Tras Hecho/Omitir se despliega el siguiente pendiente y el foco pasa a su botón "Hecho" (o al botón Terminar entreno si no queda ninguno). Tras completar la serie, foco en el "Hecho" del primer ejercicio.
   - Elimina de la fila: el enlace subrayado "Ver ejercicio" repetido, el botón circular de check y el botón de icono de saltar.
5. **CTA "Terminar entreno"** (antes "Completar entrenamiento"): deshabilitado (aspecto actual) hasta que se cumpla la decisión 3; mientras esté deshabilitado, línea de ayuda debajo: "Marca algún ejercicio como hecho para poder terminar." (desaparece al habilitarse). Al pulsarlo abre el diálogo de finalizar existente, sin cambios (su botón principal sigue siendo "Completar entrenamiento"). Deja espacio inferior suficiente para que la barra de navegación no lo tape.
6. **Resumen final** (si la sesión terminada ya muestra el resumen): añade una línea "Series completadas: N" cuando `completed_sets > 0`. Los estados Hecho/Omitido/Pendiente por ejercicio se mantienen y significan "hecho en alguna serie".
7. Accesibilidad: Hecho y Omitir con nombre accesible que incluya el ejercicio; estado no solo por color (texto oculto "Hecho/Omitido/Pendiente"); objetivos ≥ 44 px; listas largas sin romper el scroll.

## 4. Tests (hoy no hay ninguno para workout)
Crea `tests/workout-series.test.ts` sobre el módulo puro, y ejecuta los existentes. Casos mínimos:
- Hecho en serie 1 persiste `done`.
- Completar la serie incrementa `completed_sets` y reinicia la lista visual sin ninguna escritura `planned`.
- Deshacer en serie 2 no elimina un `done` de la serie 1; sí revierte un `done` hecho en la propia serie 2 al estado de inicio de serie.
- Omitir en serie 2 no sobrescribe un `done`.
- Una serie con todos omitidos no avanza.
- "Terminar entreno" habilitado con algún `done` persistido aunque la serie actual esté reiniciada; deshabilitado si solo hay omitidos.
- Hidratación con `completed_sets` 0 y > 0.
- Regresión: una sesión completada con un `done` sigue dando crédito de racha (extiende `tests/history.test.ts` solo si no está cubierto).

## 5. Comprobaciones e informe
Ejecuta y pega la salida literal de:
- `git diff --stat` y `git status --short`
- `grep -rn "completed_sets" src supabase | head -30`
- `grep -rn "\.update({ status" src/features/planner` y confirma que ninguna ruta escribe `planned` tras reiniciar una serie
- lint, typecheck y `npm test` (solo los tests afectados si hay muchos)

Informe final en 5 secciones: 1. HECHO (archivo y línea) · 2. NO HECHO o PARCIAL · 3. DESVIACIONES · 4. ARCHIVOS (con `git diff --stat`) · 5. COMPROBACIONES. Si una sección está vacía, escribe "ninguno". Si algo exige cambiar `historyData.ts`, el planner o cualquier otro esquema distinto al descrito, detente y avísame.
