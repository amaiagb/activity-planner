# Grupo C — Crear o cambiar el entrenamiento de hoy

> Estado: implementado en Today sobre `weekly_plans`, `planned_workouts` y `workout_sessions`. La sustitución no crea una entidad de entrenamiento paralela; el resultado usa el flujo estándar de inicio, seguimiento, finalización e historial.

## Objetivo

Desde Today, permitir adaptar el entrenamiento del día, tanto si existe una sesión planificada como si es un día de descanso o el generador no pudo programar una sesión. El cambio sustituye únicamente el entrenamiento planificado para hoy. El resto de la semana y las preferencias permanentes del perfil se mantienen.

## Flujo funcional

1. La persona pulsa **Cambiar entrenamiento de hoy** o, si no existe sesión, **Crear un entrenamiento para hoy**.
2. La primera pregunta es si puede entrenar al aire libre hoy.
3. Si responde sí, se propone **Easy walk / Caminata ligera**, se solicita el tiempo disponible y se ocultan los selectores de músculos y equipamiento. La duración se aplica directamente a la prescripción temporal del ejercicio `walk_easy`.
4. Si responde no, se solicita el tiempo disponible y se ofrecen como filtros opcionales un grupo muscular y equipamiento del perfil. No se muestra ni selecciona equipamiento que no esté guardado en el perfil.
5. La app genera y guarda un plan para la fecha actual. Si no hay candidato que respete todas las condiciones, conserva el plan actual y muestra el motivo.
6. La sesión creada se inicia y registra con las pantallas existentes. Se pueden completar u omitir ejercicios, finalizar la sesión y consultar el resultado en el historial.

La elección exterior es específica de esta solicitud. No cambia `can_go_outside` ni otros datos del perfil. La exclusión permanente de ejercicios sigue aplicándose también a la caminata; si `walk_easy` está excluido, se informa de que la caminata no está disponible y no se crea un entrenamiento.

## Reglas del generador

- Solo se aceptan fechas dentro de la semana actual y duraciones disponibles entre 5 y 240 minutos en incrementos de 5; la interfaz ofrece esos valores para admitir los tiempos configurables en el perfil.
- Para solicitudes interiores, el límite de tiempo es estricto: la duración estimada de la sesión no puede superar el tiempo indicado. No se ofrece un filtro exterior/inferior ambiguo basado en `is_outdoor=false`; al responder no, se descartan sesiones que incluyan ejercicios marcados como exteriores.
- Los ejercicios deben estar activos, cumplir los requisitos OR de equipamiento y no estar excluidos por el perfil. El equipamiento elegido es adicionalmente una preferencia que el resultado debe utilizar; las demás restricciones de equipamiento disponible siguen vigentes.
- El grupo muscular seleccionado es obligatorio para la sesión resultante: al menos un grupo muscular de la propuesta debe coincidir exactamente con el grupo elegido. No es una priorización silenciosa.
- La ruta exterior no depende de `can_go_outside` del perfil, ya que la respuesta de hoy es consentimiento explícito. Mantiene las exclusiones permanentes y usa el ejercicio individual de caminata ligera con duración exacta.
- No se altera la disponibilidad semanal ni la duración habitual del perfil. Al crear en un día de descanso aumenta `requested_sessions`; al cubrir un día ya registrado como no programado se elimina esa incidencia sin contarla dos veces.
- No se modifica una sesión completada, omitida o con una sesión asociada (en curso, completada u omitida). El servicio vuelve a consultar sesiones asociadas antes de guardar. En caso de no poder generar o persistir, la acción muestra un error y conserva el estado presentado.
- El registro original de un entrenamiento planificado reemplazado no se mantiene como historial. La sesión original aún no había empezado y el modelo actual no guarda snapshots de sustitución. No se ofrece deshacer.

## Persistencia y arquitectura

El generador puro `generateTodayWorkout` aplica los parámetros puntuales a las plantillas/catalogo existentes. La acción `createTodayWorkout` actualiza el `WeeklyPlan` de la semana mediante el servicio de datos actual. `saveWeeklyPlan` conserva el identificador del día cuando sustituye una fila planificada y crea la fila del día cuando no existía. No se requiere migración ni endpoint HTTP.

La protección contra sesiones asociadas usa una consulta de comprobación previa, coherente con el resto de operaciones del planificador. La aplicación actual no ofrece una transacción que serialice simultáneamente el inicio y la sustitución desde clientes concurrentes; si se habilitan múltiples sesiones de usuario o concurrencia significativa, convendrá trasladar ambas operaciones a RPC transaccionales.

Todos los controles, estados y errores añadidos están traducidos mediante el catálogo ES/EN y respetan los estilos de superficie y controles existentes en ambos temas.

## Criterios de aceptación

- Today permite cambiar la sesión planificada de hoy y crear una desde un descanso o una incidencia no programada.
- La pregunta exterior aparece primero. Un sí ofrece Caminata ligera con duración elegida y no muestra músculos/equipamiento.
- Un no genera una sesión interior dentro del tiempo máximo y aplica los filtros musculares/equipamiento seleccionados junto a las restricciones del perfil.
- Solo cambia la fecha actual; no se modifica disponibilidad ni preferencias persistentes.
- No se reemplazan sesiones iniciadas, completadas u omitidas. Si no hay opción válida, se conserva el plan sin borrado previo.
- La sesión usa el flujo habitual de seguimiento y se refleja en el historial tras completarla.
- La interfaz y los mensajes están disponibles en español e inglés.

## Fuera de alcance

Deshacer tras recargar, guardar snapshots de planes reemplazados, cambiar entrenamientos de otros días desde el asistente, generar con IA, filtrar por grupos del catálogo o por ejercicios individuales, ampliar metadatos del catálogo y cambiar las preferencias del perfil desde esta acción.
