import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../features/auth/useAuth'

export type Language = 'en' | 'es'
export type ThemePreference = 'system' | 'light' | 'dark'
type Preferences = { language: Language; theme: ThemePreference }
type I18nContextValue = Preferences & {
  setLanguage: (language: Language) => Promise<void>
  setTheme: (theme: ThemePreference) => Promise<void>
  t: (english: string) => string
}

const translations: Record<string, string> = Object.assign({}, {
  'Today': 'Hoy', 'Week': 'Semana', 'History': 'Historial', 'Exercises': 'Ejercicios', 'Profile': 'Perfil',
  'Main navigation': 'Navegación principal', 'Personal Fitness Planner home': 'Inicio de Personal Fitness Planner',
  'A little movement, every day': 'Un poco de movimiento cada día', 'YOUR DAILY PLAN': 'TU PLAN DE HOY',
  'YOUR TRAINING SCHEDULE': 'TU PLAN DE ENTRENAMIENTO', 'YOUR ACTIVITY': 'TU ACTIVIDAD', 'YOUR SETTINGS': 'TUS AJUSTES',
  'View week': 'Ver semana', 'Your week': 'Tu semana', 'Regenerate week': 'Regenerar semana',
  'Finding another workout…': 'Buscando otro entrenamiento…', "Change today's workout": 'Cambiar entrenamiento de hoy',
  'Create a workout for today': 'Crear un entrenamiento para hoy', 'Easy walk': 'Caminata ligera', 'Can you exercise outdoors today?': '¿Puedes entrenar al aire libre hoy?',
  'Yes, outdoors': 'Sí, al aire libre', 'No, indoors': 'No, en interior', 'We’ll suggest an easy walk. Muscle and equipment choices are not needed.': 'Te propondremos una caminata ligera. No hace falta elegir músculos ni equipamiento.',
  'Available time': 'Tiempo disponible', 'Muscle group': 'Grupo muscular', 'Any muscle group': 'Cualquier grupo muscular', 'Equipment': 'Equipamiento',
  'No equipment is saved in your profile; bodyweight workouts are still available.': 'No tienes equipamiento guardado en tu perfil; también hay entrenamientos con peso corporal.',
  'Creating workout…': 'Creando entrenamiento…', 'Create workout': 'Crear entrenamiento', 'No workout matches these choices.': 'Ningún entrenamiento coincide con estas opciones.',
  'Easy walk is unavailable.': 'La caminata ligera no está disponible.', 'This workout can no longer be changed.': 'Este entrenamiento ya no se puede cambiar.', 'This workout already has a session.': 'Este entrenamiento ya tiene una sesión.',
  'Upper Back': 'Espalda alta', 'Quadriceps': 'Cuádriceps', 'Hamstrings': 'Isquiotibiales', 'Glutes': 'Glúteos', 'Calves': 'Gemelos', 'Triceps': 'Tríceps', 'Shoulders': 'Hombros', 'Biceps': 'Bíceps', 'Core': 'Zona media', 'Hip Flexors': 'Flexores de la cadera', 'Back': 'Espalda',
  'Start workout': 'Empezar entrenamiento', 'Open your week': 'Abrir tu semana', 'Rest day': 'Día de descanso',
  'No workout could be planned': 'No se pudo planificar un entrenamiento',
  'THIS WEEK': 'ESTA SEMANA', 'THIS MONTH': 'ESTE MES', 'CURRENT STREAK': 'RACHA ACTUAL',
  'BEST STREAK': 'MEJOR RACHA', 'training day': 'día de entrenamiento', 'training days': 'días de entrenamiento',
  'Complete one training activity to count the day.': 'Completa una actividad de entrenamiento para contar el día.',
  'Days with a completed training activity.': 'Días con una actividad de entrenamiento completada.', 'Training activity': 'Actividad de entrenamiento',
  'Training activity calendar': 'Calendario de actividad de entrenamiento', 'Calendar legend': 'Leyenda del calendario',
  'Completed activity': 'Actividad completada', 'No completed activity': 'Sin actividad completada', 'No data yet': 'Aún sin datos',
  'calendar-active': 'Actividad completada', 'calendar-inactive': 'Sin actividad completada', 'calendar-unknown': 'Sin datos anteriores al seguimiento', 'calendar-future': 'Día futuro',
  'Recent workouts': 'Entrenamientos recientes', 'Completed workouts will appear here.': 'Aquí aparecerán los entrenamientos completados.',
  'active minutes': 'minutos de actividad', 'active time': 'de actividad', 'completion': 'completado',
  'Completed scheduled training days in a row.': 'Días de entrenamiento programados completados seguidos.',
  'Perceived exertion:': 'Esfuerzo percibido:', 'Sign out': 'Cerrar sesión',
  'Save profile': 'Guardar perfil', 'Saving…': 'Guardando…', 'Delete account and data': 'Eliminar cuenta y datos',
  'This permanently removes your account and its saved profile, measurements, plans, and workout history.': 'Esto eliminará permanentemente tu cuenta, perfil, mediciones, planes e historial de entrenamientos.',
  'Delete account permanently': 'Eliminar cuenta permanentemente', 'Deleting account…': 'Eliminando cuenta…',
  'App preferences': 'Preferencias de la aplicación', 'Language': 'Idioma', 'Theme': 'Tema',
  'English': 'Inglés', 'Spanish': 'Español', 'System': 'Sistema', 'Light': 'Claro', 'Dark': 'Oscuro',
  'Changing language…': 'Cambiando idioma…', 'Changing theme…': 'Cambiando tema…',
  'Loading your profile…': 'Cargando tu perfil…', 'Profile data is unavailable.': 'Los datos del perfil no están disponibles.',
  'Your profile has been saved.': 'Tu perfil se ha guardado.', 'Choose at least one day you are available.': 'Elige al menos un día en el que tengas disponibilidad.',
  'Measurement history': 'Historial de mediciones', 'Each entry is saved by date. New measurements do not replace older entries.': 'Cada registro se guarda por fecha. Las mediciones nuevas no sustituyen a las anteriores.',
  'Add measurement': 'Añadir medición', 'Edit measurement': 'Editar medición', 'New measurement': 'Nueva medición',
  'Date': 'Fecha', 'Notes': 'Notas', 'Save measurement': 'Guardar medición', 'Cancel': 'Cancelar', 'No measurements saved yet. Adding them is optional.': 'Aún no hay mediciones. Añadirlas es opcional.', 'Edit': 'Editar', 'Delete': 'Eliminar',
  'About you': 'Sobre ti', 'Name': 'Nombre', '(optional)': '(opcional)', 'Primary goal': 'Objetivo principal',
  'Choose a goal': 'Elige un objetivo', 'Secondary goal': 'Objetivo secundario', 'None': 'Ninguno', 'Fitness level': 'Nivel de forma física',
  'Choose your level': 'Elige tu nivel', 'When you’re available': 'Disponibilidad', 'Choose at least one day.': 'Elige al menos un día.',
  'Usual workout time': 'Duración habitual', 'minutes': 'minutos', 'What you enjoy': 'Actividades que te gustan',
  'Choose any activities you tend to like.': 'Selecciona las actividades que te gustan.', 'Strength': 'Fuerza', 'Cardio': 'Cardio', 'Walking': 'Caminar', 'Mobility': 'Movilidad',
  'I can exercise outdoors': 'Puedo entrenar al aire libre', 'Outdoor exercise depends on the weather': 'El entrenamiento al aire libre depende del tiempo',
  'Equipment and exclusions': 'Equipamiento y exclusiones', 'Choose the equipment you can use. No equipment is a valid option.': 'Elige el equipamiento que puedes usar. También puedes no seleccionar ninguno.',
  'Exercises you want to exclude': 'Ejercicios que quieres excluir', 'The exercise catalogue will be available in the next project phase. You can add exclusions to this profile later.': 'El catálogo de ejercicios estará disponible en la siguiente fase. Después podrás añadir exclusiones al perfil.',
  'Lose weight': 'Perder peso', 'Improve strength': 'Mejorar la fuerza', 'Improve endurance': 'Mejorar la resistencia',
  'Stay active': 'Mantenerse activo', 'General health': 'Salud general', 'Other': 'Otro',
  'Beginner': 'Principiante', 'Intermediate': 'Intermedio', 'Advanced': 'Avanzado',
  'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles', 'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo',
  'Weight': 'Peso', 'Height': 'Altura', 'Waist': 'Cintura', 'Chest': 'Pecho', 'Hips': 'Cadera', 'Arm': 'Brazo', 'Thigh': 'Muslo',
  'Loading your history…': 'Cargando tu historial…', 'Workout history is unavailable.': 'El historial de entrenamientos no está disponible.',
  'workouts': 'entrenamientos', 'workout': 'entrenamiento', 'planned workout day': 'día de entrenamiento planificado', 'planned workout days': 'días de entrenamiento planificados',
  'day': 'día', 'days': 'días', 'Loading your plan…': 'Cargando tu plan…', 'Could not load your plan.': 'No se pudo cargar tu plan.',
  'Outdoor': 'Exterior', 'Indoor': 'Interior', 'Tutorial': 'Tutorial',
  'No workout is scheduled for today. Your next planned session is in your week.': 'Hoy no tienes un entrenamiento programado. Tu próxima sesión está en la semana.',
  'Regenerating…': 'Regenerando…', 'Open workout': 'Abrir entrenamiento', 'View session': 'Ver sesión', 'Completed': 'Completado',
  'Skipped': 'Omitido', 'Planned': 'Planificado', 'Rest': 'Descanso', 'Not scheduled': 'Sin programar',
  'Skip this workout?': '¿Omitir este entrenamiento?', 'will be recorded as skipped.': 'quedará registrado como omitido.',
  'Confirm skip': 'Confirmar omisión', 'Keep workout': 'Mantener entrenamiento', 'Change': 'Cambiar', 'Skip': 'Omitir',
  'Regenerate this week’s plan?': '¿Regenerar el plan de esta semana?', 'The week was regenerated.': 'Se ha regenerado la semana.', 'Your week was regenerated.': 'Tu semana se ha regenerado.',
  'Workout unavailable': 'Entrenamiento no disponible', 'This workout is not part of your current weekly plan.': 'Este entrenamiento no forma parte del plan semanal actual.',
  'Return to your week': 'Volver a tu semana', 'SESSION SAVED': 'SESIÓN GUARDADA', 'Workout complete': 'Entrenamiento completado',
  'Planned duration:': 'Duración planificada:', 'Actual duration:': 'Duración real:', 'Effort:': 'Esfuerzo:', 'Back to your week': 'Volver a tu semana',
  'movements. You can mark each one done or skip it; no logging is required.': 'movimientos. Puedes marcar cada uno como hecho u omitirlo; no hace falta registrar nada.',
  'Starting…': 'Empezando…', 'exercises done or skipped': 'ejercicios hechos u omitidos', 'Exercise tutorial': 'Tutorial del ejercicio',
  'Done': 'Hecho', 'Rest ': 'Descanso ', 'sec': 's', 'Equipment:': 'Equipamiento:', 'How to do it': 'Cómo hacerlo',
  'Finish session': 'Finalizar sesión', 'Perceived exertion': 'Esfuerzo percibido', 'Note': 'Nota', 'Complete workout': 'Completar entrenamiento', 'Saving session…': 'Guardando sesión…',
  'Mark as done': 'Marcar como hecho', 'No exercise completed': 'No has completado ningún ejercicio',
  'Mark at least one exercise as done to complete a training activity.': 'Marca al menos un ejercicio como hecho para completar una actividad de entrenamiento.',
  'End session as skipped': 'Finalizar como omitido', 'End this session without completing an exercise?': '¿Quieres finalizar esta sesión sin completar ningún ejercicio?',
  'Could not save this session as skipped.': 'No se pudo guardar la sesión como omitida.',
  'Complete at least one exercise before finishing your workout.': 'Completa al menos un ejercicio antes de finalizar el entrenamiento.',
  'Welcome back': 'Te damos la bienvenida', 'Create your account': 'Crea tu cuenta', 'Sign in with your email and password.': 'Inicia sesión con tu correo y contraseña.',
  'Create an account with your email and a password.': 'Crea una cuenta con tu correo y una contraseña.', 'Email address': 'Correo electrónico', 'Password': 'Contraseña',
  'Sign in': 'Iniciar sesión', 'Create account': 'Crear cuenta', 'Already have an account?': '¿Ya tienes una cuenta?', 'Need an account?': '¿Necesitas una cuenta?',
  'Page not found': 'Página no encontrada', 'The page you requested does not exist.': 'La página solicitada no existe.',
  'LET’S GET STARTED': 'EMPECEMOS', 'Set up your profile': 'Configura tu perfil', 'A few details help your planner fit your routine. Your goals and measurements are profile information only.': 'Algunos datos ayudan a adaptar el plan a tu rutina. Tus objetivos y mediciones solo forman parte de tu perfil.',
  'Optional measurements': 'Mediciones opcionales', 'Measurements are private tracking records and do not affect your plan. You can skip this section.': 'Las mediciones son privadas y no afectan a tu plan. Puedes omitir esta sección.',
  'Measurement date': 'Fecha de medición', 'Saving your profile…': 'Guardando tu perfil…', 'Save and continue': 'Guardar y continuar',
  'MOVEMENT LIBRARY': 'CATÁLOGO DE MOVIMIENTOS', 'Search exercises': 'Buscar ejercicios', 'Filter by body part': 'Filtrar por zona del cuerpo',
  'Filter by equipment': 'Filtrar por equipamiento', 'Any body part': 'Cualquier zona', 'Any equipment': 'Cualquier equipamiento',
  'Clear search and filters': 'Borrar búsqueda y filtros', 'Loading exercises…': 'Cargando ejercicios…', 'Try again': 'Intentar de nuevo',
  'No exercises found': 'No se encontraron ejercicios', 'No active exercises': 'No hay ejercicios activos', 'No exercises match these filters.': 'Ningún ejercicio coincide con estos filtros.',
  'The exercise catalogue is empty.': 'El catálogo de ejercicios está vacío.', 'Clear filters': 'Borrar filtros', 'exercises': 'ejercicios',
  'Jump to exercise name letter': 'Ir a la letra del ejercicio', 'Jump to ': 'Ir a ',
  'Loading exercise…': 'Cargando ejercicio…', 'Exercise unavailable': 'Ejercicio no disponible', 'This exercise is inactive or no longer exists.': 'Este ejercicio está inactivo o ya no existe.',
  'Instructions': 'Instrucciones', 'Written instructions are not available yet.': 'Las instrucciones aún no están disponibles.', 'Muscles worked': 'Músculos trabajados',
  'Movement details': 'Detalles del movimiento', 'Video transcript': 'Transcripción del vídeo', 'Back to workout': 'Volver al entrenamiento', 'Back to exercises': 'Volver a ejercicios',
  'Illustration not yet available for ': 'La ilustración aún no está disponible para ', 'Illustration coming soon': 'Ilustración próximamente',
  'Source:': 'Fuente:', 'License:': 'Licencia:', 'Exercise details': 'Detalles del ejercicio',
  'Generated': 'Generadas', 'of': 'de', 'requested sessions.': 'sesiones solicitadas.', 'Week of': 'Semana del',
  'strength': 'fuerza', 'cardio': 'cardio', 'walking': 'caminar', 'mobility': 'movilidad', 'recovery': 'recuperación',
  'level': 'nivel', 'impact': 'impacto', 'View ': 'Ver ', 'Name, muscle, equipment…': 'Nombre, músculo, equipamiento…',
  'Please wait…': 'Espera…', 'New here? ': '¿Eres nuevo? ', 'Already have an account? ': '¿Ya tienes una cuenta? ',
  'Could not save language preference.': 'No se pudo guardar el idioma.', 'Could not save theme preference.': 'No se pudo guardar el tema.',
  'or': 'o', '(optional, 1–5)': '(opcional, 1–5)',
}, {
  'PERSONAL FITNESS PLANNER': 'PLANIFICADOR PERSONAL DE EJERCICIO', 'Foundation': 'Fundamentos',
  'Could not load your account': 'No se pudo cargar tu cuenta', 'Loading your account': 'Cargando tu cuenta',
  'Checking your saved profile…': 'Comprobando tu perfil guardado…', 'Checking your account…': 'Comprobando tu cuenta…',
  'Setup required': 'Configuración necesaria', 'Please try again.': 'Inténtalo de nuevo.',
  'Authentication is not configured yet. Set ': 'La autenticación aún no está configurada. Añade ',
  'Connect a Supabase project before signing in.': 'Conecta un proyecto de Supabase antes de iniciar sesión.',
  'Account created. Check your email and confirm your address before signing in.': 'Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión.',
  'Authentication failed. Please try again.': 'No se pudo autenticar. Inténtalo de nuevo.',
  'Could not load your profile.': 'No se pudo cargar tu perfil.', 'Could not save your profile. Please try again.': 'No se pudo guardar tu perfil. Inténtalo de nuevo.',
  'Could not save your profile.': 'No se pudo guardar tu perfil.', 'Could not delete your account.': 'No se pudo eliminar la cuenta.',
  'Could not save this measurement.': 'No se pudo guardar la medición.', 'Could not delete this measurement.': 'No se pudo eliminar la medición.',
  'Enter at least one measurement, or skip this step.': 'Introduce al menos una medición u omite este paso.',
  'Delete this measurement record?': '¿Eliminar este registro de medición?',
  'Permanently delete your account and all of your profile, measurement, plan, and workout data? This cannot be undone.': '¿Eliminar permanentemente la cuenta y todos los datos del perfil, mediciones, planes y entrenamientos? Esta acción no se puede deshacer.',
  'Could not load your profile options…': 'Cargando las opciones del perfil…', 'Could not load your profile options.': 'No se pudieron cargar las opciones del perfil.',
  'Loading your profile options…': 'Cargando las opciones del perfil…',
  'Could not load your plan.': 'No se pudo cargar tu plan.', 'Could not change today’s workout.': 'No se pudo cambiar el entrenamiento de hoy.',
  'Could not change this workout.': 'No se pudo cambiar este entrenamiento.', 'Could not regenerate your week.': 'No se pudo regenerar la semana.',
  'Could not skip this workout.': 'No se pudo omitir este entrenamiento.', 'Could not load this workout.': 'No se pudo cargar este entrenamiento.',
  'Could not start this workout.': 'No se pudo iniciar este entrenamiento.', 'Could not save this exercise.': 'No se pudo guardar el ejercicio.',
  'Could not complete this session.': 'No se pudo completar esta sesión.',
  'Could not load this exercise.': 'No se pudo cargar este ejercicio.', 'Could not save language preference.': 'No se pudo guardar el idioma.',
  'Could not save theme preference.': 'No se pudo guardar el tema.', 'and': 'y', 'English captions': 'Subtítulos en inglés',
  'Sign-in failed. Check your details and try again.': 'No se pudo iniciar sesión. Comprueba tus datos e inténtalo de nuevo.',
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Could not load the exercise catalogue.': 'No se pudo cargar el catálogo de ejercicios.',
  'Account creation failed. Check your details and try again.': 'No se pudo crear la cuenta. Comprueba tus datos e inténtalo de nuevo.',
  'Could not sign out.': 'No se pudo cerrar la sesión.', 'min': 'min',
  'Authentication is not configured yet. Set': 'La autenticación aún no está configurada. Añade',
  'in your local .env file, then restart the app.': 'al archivo .env local y reinicia la aplicación.',
  'Personal details': 'Datos personales', 'Training': 'Entrenamiento', 'Measurements': 'Mediciones', 'Back to profile': 'Volver al perfil',
  'Your profile': 'Tu perfil', 'Profile settings': 'Ajustes del perfil',
  'Edit personal details': 'Editar datos personales', 'Exclusions': 'Exclusiones', 'Excluded exercises: ': 'Ejercicios excluidos: ',
  'Exclude individual exercises from their detail page in the exercise catalogue.': 'Excluye ejercicios concretos desde su página de detalle en el catálogo de ejercicios.',
  'Open exercise catalogue': 'Abrir catálogo de ejercicios', 'No exercises are excluded.': 'No hay ejercicios excluidos.',
  'Exercise no longer available': 'Ejercicio ya no disponible', 'Include': 'Incluir', 'Could not update exercise exclusions.': 'No se pudieron actualizar las exclusiones de ejercicios.',
  'Plan inclusion': 'Inclusión en el plan', 'Loading exclusion preference…': 'Cargando la preferencia de inclusión…',
  'Your plan': 'Tu plan', 'This preference applies when you create future plans.': 'Esta preferencia se aplica al crear planes futuros.',
  'Include in plans': 'Incluir en los planes', 'Exclude from plans': 'Excluir de los planes',
  'This exercise is excluded from future plans.': 'Este ejercicio está excluido de los próximos planes.',
  'This exercise is available for future plans.': 'Este ejercicio está disponible para los próximos planes.',
  'Configure your availability and activity preferences.': 'Configura tu disponibilidad y tus preferencias de actividad.',
  'Edit your name, primary goal, and experience level.': 'Edita tu nombre, objetivo principal y nivel de experiencia.',
  'Optional private history, saved by date.': 'Historial privado opcional, organizado por fecha.', 'Training preferences': 'Preferencias de entrenamiento',
  'No exercises are available to exclude right now.': 'Ahora mismo no hay ejercicios disponibles para excluir.',
  'You have unsaved changes.': 'Tienes cambios sin guardar.', 'Save changes': 'Guardar cambios', 'Unsaved changes': 'Cambios sin guardar',
  'Save your changes before leaving this screen?': '¿Quieres guardar los cambios antes de salir de esta pantalla?',
  'Could not refresh measurements.': 'No se pudo actualizar el historial de mediciones.',
  'Save and leave': 'Guardar y salir', 'Discard changes and leave': 'Descartar cambios y salir', 'Continue editing': 'Seguir editando',
  'System theme': 'Tema del sistema', 'Account actions': 'Acciones de la cuenta',
  'Your browser cannot play this instructional video.': 'Tu navegador no puede reproducir este vídeo de instrucciones.',
  'A personal fitness planner that makes it easier to decide what to do today.': 'Un planificador personal de ejercicio que te ayuda a decidir qué hacer hoy.',
  'Could not generate this requested session:': 'No se pudo generar la sesión solicitada:',
  'The date is blocked from scheduling.': 'La fecha está bloqueada para programar entrenamientos.', 'No available session fits the requested duration.': 'Ninguna sesión disponible se ajusta a la duración solicitada.',
  'Available equipment does not satisfy any session.': 'El equipamiento disponible no permite realizar ninguna sesión.', 'Exercise exclusions prevent every available session.': 'Las exclusiones de ejercicios impiden realizar las sesiones disponibles.',
  'Outdoor access is required by the available sessions.': 'Las sesiones disponibles requieren acceso al exterior.', 'No active catalogue session satisfies the constraints.': 'Ninguna sesión activa del catálogo cumple los requisitos.',
  'No session satisfies the current planning constraints.': 'Ninguna sesión cumple los requisitos actuales del plan.', 'each side': 'por lado', 'alternating': 'alternando', 'sets': 'series', 'Move at a comfortable pace': 'Muévete a un ritmo cómodo',
  'Generated ': 'Se han generado ', ' of ': ' de ', ' requested sessions.': ' sesiones solicitadas.',
  'Regenerate this week’s plan? ': '¿Regenerar el plan de esta semana? ', ' completed session': ' sesión completada',
  ' completed sessions': ' sesiones completadas', ' will remain unchanged.': ' no cambiarán.', 'will remain unchanged.': 'no cambiarán.',
  'The week was regenerated. ': 'La semana se ha regenerado. ', ' was left unchanged.': ' se mantuvo sin cambios.', ' were left unchanged.': ' se mantuvieron sin cambios.',
  'YOUR DAILY PLAN': 'TU PLAN DE HOY', 'YOUR TRAINING SCHEDULE': 'TU PLAN DE ENTRENAMIENTO', 'YOUR ACTIVITY': 'TU ACTIVIDAD',
  'Loading your plan…': 'Cargando tu plan…', 'No workout is scheduled for today. Your next planned session is in your week.': 'Hoy no tienes un entrenamiento programado. Tu próxima sesión está en la semana.',
  'No workout history could be found.': 'No se encontró el historial de entrenamientos.',
  'Lose weight': 'Perder peso', 'Improve strength': 'Mejorar la fuerza', 'Improve endurance': 'Mejorar la resistencia', 'Stay active': 'Mantenerse activo', 'General health': 'Salud general',
  'Upper back': 'Espalda alta', 'Quadriceps': 'Cuádriceps', 'Glutes': 'Glúteos', 'Core': 'Zona media', 'Hamstrings': 'Isquiotibiales', 'Calves': 'Gemelos', 'Chest': 'Pecho', 'Triceps': 'Tríceps', 'Shoulders': 'Hombros', 'Biceps': 'Bíceps', 'Back': 'Espalda', 'Hips': 'Caderas', 'Hip flexors': 'Flexores de cadera',
  'Equipment': 'Equipamiento', 'Bodyweight (no equipment)': 'Peso corporal (sin equipamiento)', 'Resistance band': 'Banda elástica', 'Exercise mat': 'Esterilla', 'Chair or sturdy step': 'Silla o escalón firme', 'Stationary bike': 'Bicicleta estática',
  'HIIT': 'HIIT',
  'Full-body strength A': 'Fuerza de cuerpo completo A', 'Full-body strength B': 'Fuerza de cuerpo completo B', 'Upper-body strength': 'Fuerza de tren superior', 'Lower-body strength': 'Fuerza de tren inferior',
  'Low-impact cardio': 'Cardio de bajo impacto', 'Mixed cardio': 'Cardio mixto', 'Easy walk · 20 min': 'Paseo suave · 20 min', 'Brisk walk · 30 min': 'Caminata ligera · 30 min', 'Walk intervals · 45 min': 'Intervalos caminando · 45 min', 'Mobility · 15 min': 'Movilidad · 15 min', 'Mobility · 30 min': 'Movilidad · 30 min', 'Recovery · 15 min': 'Recuperación · 15 min',
})

const languageKey = 'activity-planner.language'
const themeKey = 'activity-planner.theme'
// eslint-disable-next-line react-refresh/only-export-components -- Exposes the translation resource check to tests.
export function hasSpanishTranslation(key: string) { return Boolean(translations[key]) }
function validLanguage(value: unknown): value is Language { return value === 'en' || value === 'es' }
function validTheme(value: unknown): value is ThemePreference { return value === 'system' || value === 'light' || value === 'dark' }
function browserLanguage(): Language { return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en' }
function cachedPreferences(): Preferences {
  try {
    const language = localStorage.getItem(languageKey)
    const theme = localStorage.getItem(themeKey)
    return { language: validLanguage(language) ? language : browserLanguage(), theme: validTheme(theme) ? theme : 'system' }
  } catch {
    return { language: browserLanguage(), theme: 'system' }
  }
}

function cachePreferences(value: Preferences) {
  try {
    localStorage.setItem(languageKey, value.language)
    localStorage.setItem(themeKey, value.theme)
  } catch { /* Keep the current in-memory preference when browser storage is unavailable. */ }
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [preferences, setPreferences] = useState<Preferences>(() => cachedPreferences())

  useEffect(() => {
    document.documentElement.lang = preferences.language
    document.documentElement.dataset.theme = preferences.theme
    cachePreferences(preferences)
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = translations['A personal fitness planner that makes it easier to decide what to do today.'] ?? description.content
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const colorScheme = window.matchMedia?.('(prefers-color-scheme: dark)')
    const updateThemeColor = () => {
      const darkTheme = preferences.theme === 'dark' || (preferences.theme === 'system' && colorScheme?.matches === true)
      if (themeColor) themeColor.content = darkTheme ? '#101a17' : '#f6f7f4'
    }
    updateThemeColor()
    if (preferences.theme === 'system') colorScheme?.addEventListener('change', updateThemeColor)
    return () => colorScheme?.removeEventListener('change', updateThemeColor)
  }, [preferences])

  useEffect(() => {
    let active = true
    if (!userId || !supabase) return () => { active = false }
    void supabase.from('profiles').select('language, theme').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (!active || error || !data) return
      setPreferences((current) => ({
        language: validLanguage(data.language) ? data.language : current.language,
        theme: validTheme(data.theme) ? data.theme : current.theme,
      }))
    })
    return () => { active = false }
  }, [userId])

  const update = useCallback(async (next: Partial<Preferences>) => {
    const previous = preferences
    const updated = { ...previous, ...next }
    setPreferences(updated)
    cachePreferences(updated)
    if (!session || !supabase) return
    const { data, error } = await supabase.from('profiles').update(updated).eq('user_id', session.user.id).select('user_id').maybeSingle()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      const { error: insertError } = await supabase.from('profiles').insert({ user_id: session.user.id, ...updated })
      if (insertError) {
        throw new Error(insertError.message)
      }
    }
  }, [preferences, session])

  const value = useMemo<I18nContextValue>(() => ({
    ...preferences,
    setLanguage: (language) => update({ language }),
    setTheme: (theme) => update({ theme }),
    t: (english) => {
      if (preferences.language === 'en') return english
      const translated = translations[english]
      if (translated) return translated
      if (import.meta.env.DEV) console.error(`Missing es translation: ${english}`)
      return english
    },
  }), [preferences, update])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Context hooks are part of the public i18n API.
export function useI18n() {
  const value = useContext(I18nContext)
  return value ?? {
    language: 'en' as const,
    theme: 'system' as const,
    setLanguage: async () => undefined,
    setTheme: async () => undefined,
    t: (english: string) => english,
  }
}
