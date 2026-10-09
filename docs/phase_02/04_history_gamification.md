# Grupo D — History y motivación

> Leer `00_PHASE2_OVERVIEW.md`. History ya muestra resúmenes semanal/mensual, actividad reciente y una racha básica. No existe mascota, puntuación, nivel, colección ni eventos de puntos persistidos.

## Estado y regla actual de racha

`loadWorkoutHistory` consulta `planned_workouts` y sesiones completadas. `summarizeWorkoutHistory` calcula `currentStreak` en cliente recorriendo fechas planificadas hasta hoy en orden descendente: suma cada fecha con estado `completed` y se detiene ante la primera que no está completada. Los descansos (fechas sin workout) no aparecen en esa secuencia; una sesión omitida o pendiente sí interrumpe. Los duplicados por fecha se cuentan una vez. La fecha local se deriva del dispositivo y la zona horaria de usuario no está guardada.

Por tanto, describir la racha existente como robusta ante zona horaria o basada en una regla de negocio aprobada sería incorrecto. Antes de persistir gamificación, fijar y probar la semántica de fechas, descansos, omisiones, reprogramaciones y sesiones regeneradas. Mantener el cálculo puro como base testeable; moverlo a servidor no es obligatorio mientras la fuente y el límite de fecha sean coherentes.

## Entregas recomendadas

1. Documentar la regla de racha y mejorar la vista actual con datos ya disponibles (p. ej. mejor racha calculada del historial consultado, solo si se consulta suficiente historia).
2. Añadir estados semanales/calendario solo con datos de `planned_workouts` y sesiones, distinguiendo descanso, planificado, completado y omitido. No inferir un «fallado» retroactivo si no existe estado persistido equivalente.
3. Probar zona horaria y límite de «hoy». Considerar guardar una zona horaria IANA por usuario antes de interpretar eventos diarios de manera estable entre dispositivos.
4. Evaluar mascota y puntos como incremento separado. Acordar concepto, tono y coste de assets. Si se adopta puntos, crear eventos idempotentes por sesión/acción con restricción única; un total derivado debe poder reconciliarse desde eventos.
5. Recompensas e inventario requieren catálogo traducible y persistencia adicional; no mezclar con el primer rediseño de History.

## Modelo de datos antes de gamificar

Los datos existentes permiten identificar sesiones finalizadas (`workout_sessions.status`, `completed_at`) vinculadas a un planificado. `planned_workouts` también conserva el estado y `workout_json`; completar escribe ambos. Definir qué fecha concede el crédito (fecha planificada o timestamp local de finalización) y cómo se trata una repetición/reintento antes del backfill.

Si se añaden tablas, migración aditiva, RLS por usuario y unicidad/idempotencia deben estar especificadas. Backfill debe poder repetirse sin duplicar puntos y reportar qué historial no se puede reconstruir. No inventar puntos para entrenamientos que no tengan una sesión completada verificable.

## Diseño de la vista

Conservar las métricas útiles existentes y evolucionarlas sin ocultar sesiones recientes. Primera iteración posible: resumen actual, racha con explicación clara y calendario accesible. Mascota pequeña y celebraciones son opcionales y deben respetar reduced motion; los estados de ánimo deben evitar culpa o mensajes que diagnostiquen «racha en peligro» sin datos suficientes.

## Criterios de aceptación para cada incremento

- Regla de racha especificada y cubierta por casos de descansos, días no planificados, entrenamiento omitido, semana/día limítrofe y cambio de zona horaria.
- Los valores se derivan de sesiones completadas verificables y no se duplican ante retries.
- La UI distingue estados también con texto/iconos, no solo color; está localizada y funciona en ambos temas.
- Todo backfill se ejecuta de forma segura y repetible, con política RLS y compatibilidad de datos existentes.

## Decisiones abiertas

- Regla y mejor racha: incluir todos los años de historial, descansos neutros, cambio de plan y reprogramaciones.
- Fuente de día: fecha de plan o fecha local de finalización y cómo determinar zona horaria.
- Si la mascota, puntos y recompensas pertenecen a Fase 2 o a una fase posterior; el roadmap inicial las trataba como alcance, pero no hay todavía diseño ni esquema acordados.
