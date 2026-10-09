# Grupo C — Cambiar el entrenamiento de hoy

> Leer `00_PHASE2_OVERVIEW.md`. La función base ya existe: Today y Week pueden regenerar un día con `regenerateWorkout` y el servicio persiste el plan actualizado. La CTA de Today ya funciona en un toque.

## Objetivo

Permitir adaptar la sesión planificada de hoy sin romper las restricciones permanentes del perfil ni afectar otras fechas.

## Capacidades y datos disponibles

El generador trabaja con plantillas de entrenamiento y sus bloques; usa disponibilidad, duración habitual, equipamiento, preferencias, acceso exterior, ejercicios excluidos, nivel e historial reciente. Los ejercicios contienen categoría, dificultad, impacto, duración/repeticiones por defecto, `is_outdoor`, músculos y requisitos de equipamiento agrupados (las opciones dentro de un grupo representan alternativas). No existe duración estimada validada por ejercicio ni clasificación binaria interior/exterior: `is_outdoor=false` no prueba que un ejercicio sea exclusivamente interior.

La API pura actual es `regenerateWorkout(date, currentPlan, history, input, options)`. Solo reemplaza sesiones `planned`, mantiene las completadas y respeta las exclusiones; la regeneración no recibe filtros de duración/equipamiento/zona por sesión. `regenerateDay` persiste el resultado. El esquema no guarda el entrenamiento original tras reemplazarlo ni marca el origen manual; las sesiones activas/completadas están relacionadas con el `planned_workout`.

## Entrega incremental

### C1. Interfaz

Mantener la CTA secundaria actual. La configuración en bottom sheet es una mejora opcional, no una dependencia para preservar el cambio en un toque. Si se implementa, todos los filtros parten del perfil y solo afectan a esa sesión. Ofrecer únicamente filtros que el generador pueda aplicar de forma demostrable.

### C2. Filtros viables con el catálogo actual

- Duración: elegir entre valores que el conjunto de plantillas pueda aproximar; filtrar por `workout_templates.default_duration_minutes` con tolerancia documentada. No estimar una duración a partir de series/repeticiones si el generador selecciona plantillas completas.
- Equipamiento: reutilizar las reglas de grupos alternativos del planificador y el equipamiento disponible en el perfil. Una elección puntual puede reducir el conjunto temporalmente, pero «sin equipamiento» debe mapear al equipo bodyweight según el modelo existente.
- Exterior: permitir exterior solo si el perfil lo autoriza. No ofrecer una opción que fuerce interior/exterior hasta que la semántica de plantillas/ejercicios sea suficiente para garantizarla.
- Zona muscular: podría derivarse de `exercise_muscles`, pero las plantillas pueden contener varios grupos. Añadir solo cuando se defina si significa incluir, priorizar o excluir músculos y se pueda validar el resultado.

Nunca relajar exclusiones, disponibilidad de equipo o seguridad en un fallback silencioso. Si no hay candidato válido, conservar la sesión actual y explicar que no hay alternativa.

### C3. Sustitución y persistencia

Primero extender la entrada pura del planificador con restricciones opcionales por fecha; mantener compatibilidad para los consumidores de semana completa y añadir pruebas deterministas. Garantizar que solo cambia la fecha solicitada y que las fechas bloqueadas/completadas/en curso no se reemplazan.

Antes de ofrecer «Deshacer», diseñar persistencia que sobreviva a recarga: por ejemplo, una tabla aditiva de cambios de workout con snapshot original, nuevo `planned_workout`, usuario, fecha y estado; con RLS y política de retención. No depender solo del estado de React o de `workout_json`, ni sobrescribir una sesión con historial asociado. Una alternativa es limitar «Deshacer» a la misma sesión del navegador y documentar esa limitación, si producto acepta ese alcance.

No crear un endpoint HTTP propuesto: el cliente actual usa Supabase JS y la función pura. Usar Edge Function solo si aparece una necesidad de autorización/transacción que no se resuelva con RLS y el modelo actual.

## Aceptación

- El cambio solo reemplaza el planificado de la fecha elegida; otras fechas y sesiones protegidas quedan intactas.
- Se mantienen filtros permanentes del perfil, en especial exclusiones.
- No se muestran filtros que no puedan cumplirse a partir de la BD actual.
- Falla sin cambios destructivos cuando no hay alternativa válida.
- Si se añade restauración, sobrevive a recarga y no borra información de sesiones existentes.
- Todo control y estado nuevo está traducido y funciona con ambos temas.

## Fuera de alcance

Generación con IA, presets, aprendizaje por valoración y entrenamiento extra tras completar el día. No añadir campos `outdoor_friendly` o `duration_estimate` hasta que un caso de producto y el catálogo seed los respalden.

## Pendientes

- Definir si el bottom sheet añade valor frente al botón de regeneración de un toque.
- Elegir alcance de «Deshacer» y su modelo persistente antes de modificar la base de datos.
- Confirmar si el filtro muscular se prioriza o se exige estrictamente.
