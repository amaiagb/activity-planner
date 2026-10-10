# Grupo D — Historial y motivación para moverse cada día

> Propuesta funcional revisada para el repositorio actual. No hay cambios de código ni de esquema en esta entrega. La prioridad del producto es fomentar que se complete al menos una actividad de entrenamiento cada día, sin requisito de duración mínima.

## Evaluación del estado actual

La pantalla History muestra resúmenes semanal y mensual, actividad reciente y una racha calculada en cliente. `loadWorkoutHistory` lee `planned_workouts` y sesiones `completed`; `summarizeWorkoutHistory` recorre hacia atrás las fechas con entrenamiento planificado y suma las que tienen estado `completed` hasta encontrar una pendiente u omitida. Las fechas sin entrenamiento programado no forman parte del cálculo. El cálculo deduplica fechas, pero depende del historial de planes que se haya consultado y de la fecha local del dispositivo.

El significado actual no coincide del todo con el objetivo de actividad diaria:

- La racha mide cumplimiento de días planificados, no días con entrenamiento completado. No cuenta una sesión creada para un día de descanso si no estaba originalmente programada.
- `workout_sessions.actual_duration_minutes` se calcula con el tiempo transcurrido entre iniciar y completar, no representa la cantidad de entrenamiento realizado. No debe intervenir en la racha.
- El flujo actual permite finalizar una sesión tras marcar todos los ejercicios como omitidos. El estado `completed` por sí solo no prueba que se completara alguna actividad de entrenamiento.
- El esquema actual no guarda una zona horaria del usuario. El cliente localiza fechas con el dispositivo, por lo que viajes, cambios de dispositivo o ajustes horarios pueden cambiar el día atribuido.
- No existen mascotas, puntos, niveles, colecciones, recompensas ni registros de eventos de gamificación.

En consecuencia, la racha actual debe considerarse una métrica provisional de adherencia al plan. No se debe renombrar como racha diaria de entrenamiento hasta corregir el criterio de crédito.

## Enfoque de producto recomendado

### Racha de entrenamiento diario

La unidad de crédito es un **día local en el que se completó al menos una actividad de entrenamiento**. No hay duración mínima: una sesión breve cuenta si se completó una actividad. Varias actividades o sesiones en un mismo día siguen contando como un único día para la racha.

El crédito no depende de que el día estuviera planificado ni del objetivo del perfil. Una sesión generada desde Today en un día de descanso cuenta si se completa. El criterio inicial recomendado con el esquema existente es una fila `workout_sessions` con `status = completed` y al menos una fila `exercise_sessions` con `status = done`. La duración planificada y `actual_duration_minutes` no afectan al crédito. Una sesión finalizada con todos los ejercicios omitidos no cuenta como actividad completada.

El crédito se deriva del registro de finalización y de los ejercicios marcados como hechos; no se pide estimar ni registrar minutos. No se introduce un registro manual genérico en el primer incremento, porque una actividad que no se inicia ni se completa en la app no queda representada en las tablas actuales. Si se quiere incluir entrenamiento realizado fuera de la app, debe diseñarse como una entrada explícita de actividad completada (tipo/fecha, sin duración obligatoria) y quedar claramente diferenciada de sesiones verificadas por el flujo guiado.

### Tratamiento amable de la racha

- La racha se calcula sobre días de calendario consecutivos con al menos una actividad de entrenamiento completada, incluidos días de descanso del plan.
- El día actual aún no terminado no rompe la racha. Si la última actividad fue ayer, la racha sigue vigente durante el día de hoy. Si fue antes de ayer y no hay actividad ayer, la racha actual es cero.
- Un día sin crédito interrumpe la secuencia matemática, pero la interfaz evita lenguaje de pérdida, culpa o urgencia. La persona puede volver a empezar cualquier día.
- No se incluyen vidas, congeladores de racha, recordatorios de cuenta atrás ni mensajes del tipo «no la pierdas». No se penaliza la actividad ligera.
- La métrica se llama «días de entrenamiento seguidos» o «racha de entrenamiento», no «racha de minutos». Se explica el criterio: «Completa una actividad de entrenamiento para contar el día».

Esta regla coincide con el objetivo declarado de realizar actividad de entrenamiento cada día. Si producto decidiera que los días de descanso deben ser neutros, ya no sería una racha diaria de entrenamiento: sería una racha de adherencia al calendario. No conviene mezclar ambos conceptos en una sola métrica.

## Alcance y entregas

### D1. Aclarar y separar las métricas de History

- Mantener los resúmenes semanal/mensual de sesiones, pero presentarlos como sesiones o entrenamientos del plan.
- Sustituir gradualmente la racha provisional por la racha diaria de entrenamiento cuando la fuente de finalizaciones y ejercicios hechos esté disponible de manera fiable.
- Añadir un calendario semanal o mensual accesible que marque días con crédito, sin actividad registrada, futuros y sin datos históricos. Los días sin registro no se etiquetan como fracaso.
- Añadir «mejor racha» y «días activos este mes» solo cuando se consulte historial completo o un agregado persistente confiable. No calcular récords sobre un límite de 25 sesiones recientes.
- Mantener duración planificada y tiempo transcurrido como datos informativos, sin usarlos como criterio de racha.

### D2. Registrar actividades de entrenamiento completadas

- El flujo de Workout debe distinguir completar una actividad de simplemente cerrar una sesión. Para conceder crédito debe existir al menos un ejercicio marcado `done`; una sesión con todos los ejercicios omitidos no cuenta.
- Decidir el comportamiento de «Finalizar sesión» si todos los ejercicios están omitidos: recomendación, impedir que se marque como entrenamiento completado y ofrecer volver a la sesión o salir registrándola como omitida. No exigir completar todos los ejercicios: basta con haber completado al menos uno.
- La finalización de un entrenamiento creado para hoy desde Today queda vinculada a su sesión normal y puede conceder el crédito del día aunque el día fuese descanso o no programado originalmente.
- Si se incorpora el registro de actividad realizada fuera de la app, especificar una entrada manual mínima (tipo y fecha, sin duración requerida), etiquetarla como autodeclarada y evitar que se confunda con una sesión guiada. No forma parte de la primera entrega recomendada.
- Reintentos de finalización no pueden crear más de un crédito diario; múltiples sesiones completadas en el mismo día se agregan como un único día para la racha.

### D3. Racha, calendario y celebraciones pequeñas

- Calcular la racha desde los días acreditados, no desde `planned_workouts`.
- Dar feedback discreto al completar la primera actividad del día y al superar hitos razonables (por ejemplo, 3, 7, 14 y 30 días). Celebrar la constancia, no el número de sesiones, volumen o intensidad.
- Mantener feedback accesible, localizado y sobrio; respetar `prefers-reduced-motion`, contraste y anuncios de estado con lectores de pantalla. La información no dependerá solo del color o de animaciones.
- Mascota y colección quedan como posible experimento posterior. Primero validar que el registro y la regla de crédito ayudan sin provocar presión o actividad excesiva.

### D4. Puntos y recompensas: no incluir en la primera versión

Los puntos no son necesarios para cumplir el objetivo de crear un hábito diario y pueden incentivar sesiones repetidas o entrenar de más. Si una prueba posterior demuestra valor, premiar como máximo el primer crédito diario; no multiplicar puntos por duración, intensidad o número de sesiones. Recompensas, inventario, niveles y mascota requieren definición visual, contenido traducible, persistencia y una forma de reconciliar eventos; no son dependencia del primer incremento de racha.

## Fechas, zona horaria e idempotencia

La fecha de crédito debe ser la fecha local del usuario cuando completó la sesión, no necesariamente la fecha planificada ni el día UTC. Añadir una preferencia IANA de zona horaria (por ejemplo, `Europe/Madrid`) y guardar también la fecha local calculada y la zona efectiva para que el historial no se desplace al viajar o cambiar la configuración. Definir el efecto de cambiar la zona: la zona nueva se aplica a finalizaciones futuras, no reescribe fechas ya guardadas. Se recomienda añadir esos campos a `workout_sessions` (o una tabla derivada equivalente) en una migración aditiva.

Para sesiones guiadas, conservar `completed_at` como instante UTC de auditoría y guardar la fecha local de crédito y la zona efectiva. Para una futura entrada manual fuera de la app, conservar igualmente el instante de registro, la fecha local, la zona usada, el tipo de actividad y `user_id`; no requiere campo de minutos para determinar la racha.

No es necesario crear una tabla genérica de actividad para la primera entrega: `workout_sessions` y `exercise_sessions` ya registran las sesiones y sus ejercicios. History puede derivar el crédito diario filtrando sesiones completadas que contengan al menos un ejercicio `done` y agrupándolas por fecha local. No se debe sumar duración ni tratar varias sesiones del día como varios créditos. Una tabla/entrada específica solo sería necesaria si se decide registrar actividades hechas fuera del flujo guiado, o se requiere guardar una instantánea/auditoría del crédito diario.

Si se persiste fecha local/zona o se añade registro manual, acordar contrato de escrituras, idempotencia, RLS, política de edición/borrado y backfill antes de migrar. No crear un endpoint HTTP nuevo mientras Supabase/RPC resuelva estas garantías.

## Backfill y compatibilidad con el historial existente

El historial anterior permite aproximar sesiones con actividad usando `workout_sessions` y `exercise_sessions`, pero no atribuye con certeza el día local de finalización si solo se usa `planned_workouts.workout_date`. No conceder crédito solo por `status = completed`: comprobar que hay al menos un ejercicio `done`. `actual_duration_minutes` no se usa.

La fecha planificada y la fecha real de finalización pueden diferir. Se recomienda atribuir a la fecha local de finalización porque el objetivo es que ese día se haya completado actividad. Los registros previos tienen `completed_at`, pero no guardan la zona horaria efectiva en el momento de completar la sesión; convertirlos todos usando la zona actual puede desplazar fechas históricas.

**Lanzamiento recomendado:** empezar el cálculo de la nueva racha con sesiones cuya fecha local y zona se hayan guardado desde el despliegue de la migración. Mantener el resumen anterior como métrica de días planificados o mostrar la nueva racha como iniciada desde su lanzamiento. No deducir una fecha histórica fiable desde la zona actual del usuario.

## Experiencia y tono

La pantalla History conserva las sesiones recientes, pero diferencia con claridad:

- **Entrenamiento diario:** días con una o más actividades completadas, racha actual, mejor racha y calendario de actividad cuando haya datos suficientes.
- **Entrenamientos planificados:** sesiones completadas/planificadas, duración y esfuerzo percibido, sin convertir su porcentaje de cumplimiento en calificación personal.

Usar mensajes positivos y neutrales: «Hoy has completado una actividad», «Llevas 4 días entrenando seguidos» y «Puedes retomar hoy». Evitar «fallaste», «perdiste», «última oportunidad» o avisos de racha en riesgo. La mascota puede ser decorativa más adelante, pero nunca debe enfermar, entristecerse o perder progreso por descansar.

## Criterios de aceptación

- Una sesión completada con al menos un ejercicio marcado `done` da un crédito para su fecha local de finalización, sin umbral de duración.
- Varias sesiones completadas el mismo día dan un único crédito de racha.
- Una sesión completada en un día de descanso o no programado cuenta; una sesión planificada sin ejercicios completados no cuenta automáticamente.
- Una sesión con todos los ejercicios omitidos no concede racha por el solo estado `completed`.
- El cálculo de racha cubre ayer/hoy, un día interrumpido, días de descanso, cambio de semana/mes/año, horario de verano, zona horaria cambiada y registros duplicados.
- La duración planificada y el tiempo transcurrido no se usan como umbral ni como prueba de actividad completada.
- El backfill no infiere actividad inexistente; los límites del historial anterior son visibles/documentados.
- Los días sin registro no se muestran como fracaso y la métrica distingue sesiones planificadas de movimiento diario.
- Las nuevas columnas heredan el acceso RLS de `workout_sessions`; la finalización es idempotente y una sesión solo genera un crédito aunque History la consulte repetidamente. Si se añade una tabla para fecha/crédito, definir su RLS y borrado por cascada.
- Textos, calendario, errores y celebraciones están localizados en español e inglés, son accesibles y respetan ambos temas y movimiento reducido.

## Decisiones de producto recomendadas

1. Aprobar el criterio de al menos una actividad de entrenamiento completada por fecha local, sin duración mínima.
2. Usar zona IANA fija del perfil para atribución futura, guardar fecha local en el evento y no reescribir el historial por cambios posteriores de zona.
3. No añadir mascota, puntos ni tienda en el primer incremento; validar primero la racha y la visualización semanal/mensual.
4. Usar el historial de sesiones y ejercicios hechos cuando la fecha local pueda derivarse con fiabilidad; de lo contrario, iniciar el contador nuevo en el despliegue.
5. Mantener los resúmenes de entrenamientos planificados como métricas independientes para no confundir cumplimiento del plan con movimiento diario.
