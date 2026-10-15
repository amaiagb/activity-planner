# Contexto de proyecto para rediseño visual

## Alcance

Personal Fitness Planner es una PWA privada, mobile-first, para reducir la fricción de decidir qué ejercicio hacer cada día. Este documento resume el estado real del repositorio para una consultoría de UI/UX. El rediseño debe limitarse a presentación, composición y claridad de uso; no se solicita cambiar la lógica de negocio.

## 1. Stack y sistema visual

- Frontend: React 19 + TypeScript 5.8, construido con Vite 6.
- Routing: react-router-dom 7, con createBrowserRouter y rutas anidadas.
- Estilos: Tailwind CSS 4 importado desde src/styles/index.css, combinado con CSS propio basado en clases semánticas. No hay una librería de componentes externa.
- Datos y autenticación: Supabase JS; Auth con PKCE y sesión persistente; PostgreSQL/RLS en Supabase.
- PWA: vite-plugin-pwa en dependencias y configuración en vite.config.ts.
- Testing/calidad: Vitest, Testing Library, ESLint y TypeScript.
- Tema e idioma: I18nProvider gestiona inglés/español y guarda preferencias en localStorage y, si hay sesión, en profiles. El tema admite system, light y dark mediante data-theme en html.
- Tokens actuales: fondo #f6f7f4, superficies blancas, tinta verde oscura, acento lima #d8f27a, bordes claros, radios de control de 13 px y tarjetas de 24 px. Inter/system sans; foco visible de 3 px. Hay variables equivalentes para modo oscuro.
- Layout: contenedor principal de 980 px, contenido de página normalmente de 680 px, tarjetas con borde/sombra, formularios apilados, botones primario/secundario/quiet y navegación inferior fija de cinco elementos.

## 2. Estructura y organización

    src/
      app/                 shell, router y fallback
      components/          componentes compartidos
      features/
        auth/              provider, guards y login
        onboarding/        configuración inicial
        planner/           hoy, rutinas, recursos y workout
        exercises/         catálogo y detalle
        history/           historial y calendario
        profile/           ajustes, campos y mediciones
      lib/                 Supabase, i18n y acceso a datos
      planner/             tipos y algoritmo determinista
      styles/              hoja global
      types/               tipos de perfil
    public/                iconos e imágenes de ejercicios
    supabase/              migraciones, tests y función de cuenta
    tests/                 pruebas de lógica y UI
    docs/                   especificación y fases

AppShell envuelve todas las rutas con topbar, contenido y navegación inferior. El catálogo de ejercicios usa un overlay anidado para el detalle. Las páginas de feature contienen la composición de cada vista; no existe un sistema de design components separado.

## 3. Rutas y propósito

- /login: inicio de sesión o alta con email y contraseña; ruta pública.
- /onboarding: configuración inicial del perfil y mediciones opcionales.
- /today: pantalla principal Train; crear un workout para hoy y acceder a la ejecución.
- /templates: rutinas favoritas y recursos guardados; también crear workout.
- /templates/collection: colección completa de plantillas con búsqueda, orden y favoritas.
- /templates/new: crear plantilla seleccionando ejercicios.
- /templates/:templateId: detalle de plantilla y CTA para entrenar.
- /resources/collection: colección de recursos con búsqueda, proveedor, orden y favoritas.
- /resources/:resourceId: detalle con embed y enlace a la plataforma original.
- /workout/:id: ejecutar sesión, marcar ejercicios y completar con RPE/notas.
- /history: racha, métricas, calendario, detalle y registro manual.
- /exercises: catálogo filtrable agrupado alfabéticamente.
- /exercises/:exerciseId: detalle superpuesto con media, instrucciones y exclusión.
- /profile: resumen de ajustes, idioma/tema y acciones de cuenta.
- /profile/personal: datos personales y objetivos.
- /profile/training: preferencias, disponibilidad, equipamiento y exclusiones.
- /profile/measurements: historial de mediciones con alta, edición y borrado.
- /: redirección a /today; otras rutas autenticadas muestran PlaceholderPage.

El acceso está condicionado por AuthProvider, PublicOnly y RequireAuthenticated. Una sesión nueva pasa por onboarding. Las rutas de detalle de ejercicio desactivan topbar y navegación inferior mientras el overlay está abierto.

### Racha de actividad: comportamiento existente

- La racha se calcula con días que tienen crédito de actividad (`activityDates`). Se incluyen sesiones de workout completadas que contienen al menos un ejercicio marcado como `done`, y actividades manuales registradas como `training`, `walking` o `padel`. Las fechas se deduplican y se comparan en la zona horaria del usuario.
- `currentStreak` cuenta días consecutivos hacia atrás desde hoy. Si hoy no tiene actividad, empieza por ayer; un día sin actividad corta la racha. `bestStreak` es la mayor secuencia consecutiva encontrada en todo el historial disponible.
- El periodo de cálculo respeta `trackingStartedOn`, inicializado desde `profiles.streak_tracking_started_on` (o desde hoy si no existe) y adelantado a la fecha de la primera actividad manual si esta es anterior. No hay puntos, niveles, recompensas, mascota, bosque, casa ni desbloqueos implementados.
- La información se carga en `src/lib/historyData.ts` y se muestra únicamente en `/history` (`HistoryPage`). La cabecera presenta `currentStreak` como “Your streak” con un badge circular; debajo hay tres tarjetas con racha actual, mejor racha y días activos del mes.
- La misma pantalla muestra un calendario mensual: cada fecha puede estar activa, inactiva, sin datos anteriores al inicio del tracking o futura. Una fecha activa abre el detalle de actividades; una fecha pasada no activa permite registrar actividad manual.

## 4. Componentes compartidos y patrones actuales

- AppShell y BottomNavigation definen el marco global: Train, Templates, History, Exercises y Profile.
- Se reutilizan card, form-card, section-heading-row, button, button-primary, button-secondary, field-label, form-notice y form-error.
- Jerarquía repetida: eyebrow en mayúsculas espaciadas, h1 grande de tracking negativo y page-intro muted.
- Formularios: fieldsets, grids, check-option, selects y diálogos con dialog-backdrop.
- Planner: tarjetas de plantillas/recursos, favoritos con estrella, borrado, filtros y selector modal de ejercicios.
- Workout: lista numerada, estados Done/Skipped, detalles colapsables y formulario de finalización.
- Exercise catalogue: filas con miniatura, búsqueda, filtros, grupos por letra e índice alfabético; detalle como diálogo.
- History: hero de racha, tres tarjetas de métricas y calendario con estados.
- Profile: tarjeta de usuario, lista de ajustes, controles segmentados de idioma/tema, formularios y diálogo de cambios sin guardar.
- Accesibilidad: aria-label, roles de diálogo/status/alert, foco visible, inert en overlays y teclado en el detalle de ejercicios.

## 5. Funcionalidades e interacciones que deben permanecer intactas

- Auth de Supabase, sesión persistente, guards y redirecciones de onboarding.
- Generación determinista según disponibilidad, duración, preferencias, equipamiento, historial y exclusiones. Objetivos y mediciones son informativos y no cambian la generación en el MVP.
- Inicio, marcado individual hecho/saltado, finalización con duración/RPE/notas y cierre como sesión saltada.
- Navegación inferior, enlaces de vuelta, deep links y estado returnTo desde workout al detalle de ejercicio.
- Crear, listar, buscar, ordenar, marcar favorita y borrar plantillas y recursos; modal de recursos y embeds de YouTube/Instagram/TikTok.
- Catálogo: búsqueda, filtros, salto por letra, media con fallback y detalle cerrable con botón/Escape.
- Exclusión de ejercicios desde detalle y reinclusión desde perfil.
- Historial: calendario con estados, detalle y registro manual de training/walking/padel.
- Perfil: guardado por sección, mediciones históricas, confirmación de cambios sin guardar, borrado de cuenta, idioma ES/EN y tema system/light/dark.
- Estados de carga, error, vacío, botones deshabilitados durante guardado y mensajes accesibles.

## 6. Convenciones y restricciones técnicas

- TypeScript/TSX con componentes funcionales y hooks; lint y typecheck forman parte de los checks.
- El algoritmo de src/planner debe seguir independiente de React y Supabase.
- No introducir IA en el planner ni servicios externos para generar entrenamientos.
- Usar useI18n().t para textos visibles; contemplar traducciones de src/lib/i18n.tsx.
- Respetar tipos de src/planner/types.ts y modelos de plannerData.ts, profileData.ts y historyData.ts.
- Conservar variables de tema y contraste, foco visible, semántica de formularios, inert/focus trap de overlays y responsive desde 320 px.
- No exponer secretos. .env contiene configuración local; solo VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY se leen desde el cliente.
- Las imágenes se sirven desde public/images/flat; no asumir media disponible para todos los ejercicios.

## 7. Archivos a consultar por vista

- Marco y navegación: src/app/App.tsx, src/app/AppShell.tsx, src/components/BottomNavigation.tsx, src/styles/index.css
- Login y guards: src/features/auth/LoginPage.tsx, AuthProvider.tsx, RouteGuards.tsx, useAuth.ts
- Onboarding: src/features/onboarding/OnboardingPage.tsx, src/features/profile/ProfileFields.tsx, src/types/profile.ts, src/lib/profileData.ts
- Hoy, rutinas y workout: src/features/planner/PlannerPages.tsx, plannerData.ts, src/planner/index.ts, src/planner/types.ts
- Plantillas: src/features/planner/TemplatePages.tsx y PlannerPages.tsx
- Recursos: src/features/planner/PlannerPages.tsx y plannerData.ts
- Historial: src/features/history/HistoryPage.tsx, src/lib/historyData.ts, src/lib/userTimeZone.ts
- Catálogo: src/features/exercises/ExercisePages.tsx, exerciseData.ts, exerciseCatalogueLogic.ts, src/lib/catalogueTranslations.ts
- Perfil: src/features/profile/ProfilePage.tsx, ProfileFields.tsx, MeasurementManager.tsx, src/lib/profileData.ts
- Internacionalización/tema: src/lib/i18n.tsx, src/styles/index.css
- Datos y seguridad: src/lib/supabase.ts, supabase/migrations/, supabase/config.toml

## 8. Oportunidades de mejora exclusivamente visual

- Hacer más explícita la jerarquía de “qué hacer hoy” en /today y reducir la competencia entre creación rápida, plantillas y recursos.
- Unificar tarjetas, iconos, estrellas, menús y estados entre templates, resources, history y profile.
- Mejorar legibilidad de listas largas del catálogo y de la ejecución de workout mediante densidad y agrupación más claras.
- Reforzar estado activo y comprensión de la navegación inferior en pantallas pequeñas.
- Dar estructura visual más clara a formularios extensos de onboarding/profile mediante pasos y ayudas, sin cambiar campos ni reglas.
- Hacer más orientativos y consistentes los estados vacíos, carga, error y confirmación.
- Refinar overlays y diálogos para distinguir contexto, acción principal y cierre.
- Revisar contraste, tamaños táctiles, foco, responsive y modo oscuro con una misma escala.
- Sustituir glifos emoji/texto por iconografía coherente si se mantiene el mismo significado accesible.
- Explorar escala tipográfica y espaciado más consistente entre historial, planner y ajustes.

## Inventario prioritario para compartir con Claude

### Producto y arquitectura

- README.md
- docs/PROJECT.md
- src/app/App.tsx
- src/app/AppShell.tsx
- src/components/BottomNavigation.tsx

### Sistema visual e internacionalización

- src/styles/index.css
- src/lib/i18n.tsx
- src/main.tsx

### Flujos principales

- src/features/planner/PlannerPages.tsx
- src/features/planner/TemplatePages.tsx
- src/features/history/HistoryPage.tsx
- src/features/profile/ProfilePage.tsx
- src/features/profile/ProfileFields.tsx
- src/features/profile/MeasurementManager.tsx
- src/features/onboarding/OnboardingPage.tsx

### Catálogo

- src/features/exercises/ExercisePages.tsx
- src/features/exercises/exerciseData.ts
- src/features/exercises/exerciseCatalogueLogic.ts
- src/lib/catalogueTranslations.ts

### Reglas de negocio

- src/planner/index.ts
- src/planner/types.ts
- src/features/planner/plannerData.ts
- src/lib/historyData.ts
- src/lib/profileData.ts
- src/features/auth/RouteGuards.tsx

### Datos y seguridad

- supabase/migrations/ (solo migraciones relevantes)
- src/lib/supabase.ts
- vite.config.ts

No compartir .env, claves, tokens, datos de usuario ni el contenido completo de node_modules, dist o catálogos voluminosos salvo que Claude necesite un ejemplo puntual.
