# Prompt para Codex: rediseño visual "Opción C" de la app

## 0. Cómo trabajar
Lee `PROJECT_CONTEXT.md` y contrasta cada afirmación con el código antes de tocarlo. Este prompt es autosuficiente: si se adjuntan los prototipos HTML de referencia (hoy, racha, rutinas, ejercicios, workout), úsalos solo como guía visual y no copies su HTML. Trabaja en commits pequeños, una pantalla cada vez. **Si algo exige cambiar lógica de negocio, datos, rutas o configuración fuera de lo descrito aquí, detente y pregunta.** Al terminar cada paso lista lo que verificaste y lo que no pudiste verificar.

## 1. Alcance y límites
- Permitido: presentación, composición, copy, y los 3 cambios de comportamiento de la sección 2.
- **No tocar:** `src/planner` (algoritmo), modelo de datos, Supabase/RLS, migraciones, guards, `exerciseCatalogueLogic.ts`, `historyData.ts` (solo reutilizar), rutas existentes (`/history` se mantiene; solo cambia la etiqueta visible), tests de lógica.
- Todo texto visible por `useI18n().t`, con ES y EN en `src/lib/i18n.tsx`.
- Mantener: foco visible de 3 px, `inert` y focus trap en overlays, responsive desde 320 px, temas system/light/dark, estados de carga/error/vacío, botones deshabilitados durante guardado.
- Sin mascota, jardín, puntos, niveles ni otra gamificación. Sin nuevas dependencias salvo necesidad justificada. No añadir campos, columnas ni migraciones.

## 2. Cambios de comportamiento aprobados
1. **Claim de racha en `/today`.** Línea compacta (no tarjeta) bajo la fecha, con `currentStreak` y si hoy tiene crédito de actividad (`activityDates`), reutilizando la lógica existente de `historyData.ts` sin duplicarla. Estados: hoy sin actividad y racha > 0 → "¡No pierdas la racha!"; hoy con actividad → "Racha on fire" o "Sigue la racha"; racha 0 → "Empieza una racha hoy". Incluye 7 barras de los últimos 7 días con `aria-label`. Si la carga falla o tarda, no bloquear el CTA.
2. **Navegación inferior.** Orden izquierda→derecha: **Ejercicios, Rutinas, Hoy, Racha, Perfil**. "Hoy" al centro, elevado y destacado. "Historial" pasa a llamarse **Racha / Streak** (icono de llama). `/` debe redirigir a `/today` (verificar que ya ocurre). Unifica el nombre de la pantalla principal ("Hoy"; el contexto la llama "Train").
3. **"Ver ejercicio" en Workout abre un modal** con el detalle del ejercicio, sin salir de `/workout/:id` (ver sección 6.5). Sustituye a la navegación actual al detalle con `returnTo` **desde Workout**. Comprueba si otros puntos de entrada usan `returnTo` antes de retirar nada.

## 3. Sistema de diseño (dirección C: juvenil y rebelde, con jerarquía clara)
**Principios**
- Una sola acción primaria por pantalla y un solo bloque de color fuerte por pantalla.
- El recuadro con sombra dura es un privilegio: solo el CTA primario y el botón central "Hoy".
- Listas con filas y separador fino de 1 px en una sola superficie; nunca una tarjeta con borde por elemento.
- El color vivo indica acción, selección, progreso o identificación (proveedor), no decoración.
- Texto de relleno mínimo: un titular, una frase y la acción.

**Tokens (claro / oscuro)**
| Token | Claro | Oscuro |
|---|---|---|
| fondo | `#F6F3EC` | `#0E0E10` |
| superficie | `#FFFFFF` | `#1A1A1E` |
| tinta | `#111111` | `#F4F1EA` |
| muted | `#5C5951` | `#B4B0A6` |
| línea | `#E6E2D8` | `#2B2B31` |
| lima (acción, hero, hoy, seleccionado) | `#C6FF3D` | igual |
| naranja llama (icono/barras) | `#FF6A1A` | igual |
| naranja texto | `#C2410C` | `#FF8A4C` |
| azul `#3D5AFE`, amarillo `#FFE14D`, rosa `#FF4FA3` | solo iconos pequeños, insignias y tarjeta sustituta | igual |

Texto sobre lima, amarillo y rosa siempre `#111`. Expón los tokens como variables CSS en `src/styles/index.css` (con las equivalentes del modo oscuro y `data-theme`).

**Tipografía:** Archivo Black en mayúsculas solo para titulares y cifras grandes; Space Grotesk 500-700 para todo lo demás. Carga por Google Fonts con fallback `Impact` / `system-ui`. Tamaños base: cuerpo 16, secundario 13-14, etiquetas de sección 13 en mayúsculas con 0.08em, H1 de pantalla 34, hero 44, cifra de racha 96.

**Forma:** radios 12 (iconos/tiles), 14-16 (controles, miniaturas), 18-20 (CTA, listas), 24-28 (hero, calendario, modal). Sombra dura `4px 4px 0` (CTA, color `#fff` en claro) y `3px 3px 0` (botón Hoy, `#111` en claro, `#fff`/lima en oscuro); al pulsar el CTA se desplaza 3 px. Fuera de eso, sin sombras ni degradados.

**Iconos:** SVG de línea 2.5 px, extremos y uniones redondeados, rejilla 24 px, `currentColor`. Sustituye emojis y glifos de texto. Mantén el significado accesible (`aria-label` o texto visible).

**Interacción:** objetivos táctiles ≥ 44 px (excepción: letras del índice alfabético, ≥ 24 px). Foco visible de 3 px (azul `#3D5AFE` sobre fondos claros). Estados: hover más oscuro, seleccionado en lima, deshabilitado al 45 %, carga con esqueleto neutro, error con icono y frase accionable. Animaciones solo con `prefers-reduced-motion` respetado.

## 4. Componentes compartidos (créalos reutilizables)
- **BottomNavigation:** rejilla `1fr 1fr 1.3fr 1fr 1fr`, fondo del tema, borde superior 1 px, `padding-bottom: env(safe-area-inset-bottom)`. Ítems con icono 22 px y etiqueta 11 px en mayúsculas. Activo (no central): tinta + marca lima de 28×4 px en la parte superior. **Hoy:** botón de 62×62, radio 20, fondo lima, borde 2 px `#111`, sombra `3px 3px 0`, elevado 22 px sobre la barra, icono de rayo.
- **PrimaryCTA:** 64 px de alto, radio 18, fondo `#111`, texto lima en Archivo Black 20 mayúsculas, borde 2 px, sombra dura. Solo uno por pantalla.
- **SecondaryButton / TextButton:** secundario = contorno 2 px sin relleno ni sombra; texto = subrayado, ≥ 44 px.
- **Chip:** 44 px, píldora, superficie; seleccionado en lima.
- **SearchField:** 52 px, superficie, radio 16, sin borde, `type="search"`.
- **FilterSelect:** control tipo select (etiqueta + valor), 48 px; valor ≠ "Todos" resaltado en lima.
- **ListRow / List:** una superficie radio 20 con filas ≥ 64-72 px y separador de 1 px.
- **StarToggle:** botón 44 px con `aria-pressed`; activo = relleno amarillo con contorno de tinta.
- **Thumbnail + FallbackCard:** miniatura con `object-fit: cover` y radio 14. **FallbackCard** (sin imagen, error o proveedor sin miniatura): fondo neón del sistema (lima, amarillo o rosa), patrón de rayas diagonales o puntos al 14-20 % de `#111`, icono centrado en `#111`; color y patrón **deterministas por id** (hash estable, sin aleatoriedad). Mientras carga, esqueleto neutro; `onError` cambia a FallbackCard. Nunca una imagen rota.
- **ProgressBar:** 10 px, radio 6, relleno lima con contorno interior de 1.5 px, `role="progressbar"`.
- **Overlay / Modal:** fondo del tema (pantalla completa) o hoja inferior con radio 28 sobre scrim `rgba(17,17,17,.6)`; `role="dialog"`, `aria-modal`, fondo `inert`, focus trap, foco inicial en cerrar, devuelve el foco al disparador, cierre con X (44 px) y Escape.
- **Banner de estado:** bloque lima con `role="status"` para confirmaciones.

## 5. Pantallas: composición
### 5.1 `/today`
Fecha (13 px, mayúsculas) → línea de racha (llama + texto en naranja texto + 7 barras de 8×18 px: hecho naranja, pendiente hoy con borde discontinuo) → **hero lima** (radio 28, titular "Hoy toca moverse" en Archivo Black 44, una frase corta, PrimaryCTA "Crear entreno") → sección "Atajos" con una lista de dos filas: **Rutinas favoritas** y **Recursos guardados** (tile de color 40 px, título, contador solo si el dato ya existe, flecha), cada una navega a su sección. No añadir más bloques.

### 5.2 `/history` (visible como "Racha")
Hero lima con la cifra `currentStreak` en Archivo Black 96, "días seguidos", claim en píldora negra con texto lima, y una silueta de llama decorativa al 10 % de opacidad como **hueco reservado para una futura ilustración de progreso** (no implementar nada más). Debajo, un bloque de dos datos (mejor racha, días activos del mes). Calendario mensual en superficie blanca con estados distinguibles **sin depender solo del color**: activo = círculo lima relleno; inactivo pasado = círculo con borde discontinuo; hoy = borde de tinta; sin datos y futuro = atenuados y deshabilitados. Fila de detalle del día con acción "Registrar" como botón de texto (solo en días pasados sin actividad). Sin CTA negro en esta pantalla. Mantén toda la lógica de calendario, detalle y registro manual.

### 5.3 `/templates`, `/templates/collection`, `/resources/collection`
- **`/templates`:** título, PrimaryCTA "Crear entreno", "Nueva" como botón de texto, y dos listas con filas (Favoritas, Recursos guardados) con enlace "Ver todas / Ver todos".
- **Colecciones:** barra superior con volver y acción de texto ("Nueva" / "Añadir"), SearchField, chip de filtro (plantillas: Favoritas; recursos: Todos/YouTube/Instagram/TikTok), selector de orden, lista en una superficie. Fila con StarToggle y botón "⋯" para acciones existentes (p. ej. borrar). Estado vacío con frase breve.
- **Miniaturas en recursos:** miniatura cuadrada 72 px a la izquierda, `object-fit: cover` (vale para horizontal y vertical), título hasta 2 líneas (`line-clamp`), fila de 92 px, proveedor como texto bajo el título. La miniatura real **nunca** lleva neón encima. El neón aparece solo en la **insignia de proveedor** (círculo de 26 px en la esquina inferior derecha de la miniatura: YouTube amarillo, Instagram rosa, TikTok lima; icono de 14 px en `#111`; anillo de 2 px del color de la superficie; oculta a lectores para no duplicar el texto del proveedor) y en la **FallbackCard**. Instagram no tiene miniatura reconocible: usa siempre FallbackCard con su variación determinista.
- **Datos:** YouTube y TikTok ya guardan miniatura; localiza el campo en `plannerData.ts` y reutilízalo. Las URL externas pueden caducar; revisa caché de `vite-plugin-pwa` y la CSP y **avisa antes de cambiar configuración**.

### 5.4 `/exercises` y `/exercises/:exerciseId`
- **Búsqueda y filtros (mantener los 3, sin cambiar `exerciseCatalogueLogic.ts`):** buscador por nombre; filtro por grupo muscular; filtro por equipamiento. Los dos filtros van en una fila bajo el buscador como dos FilterSelect a partes iguales ("Músculo: Todos ▾", "Equipamiento: Todos ▾"), `<select>` nativo estilizado o equivalente accesible por teclado. Se combinan con AND como hoy. Las opciones salen de los datos, no se hardcodean. Con algún filtro activo, botón de texto "Limpiar" que restablece los tres.
- **Lista:** agrupada por letra con cabeceras fijas (`position: sticky; top: env(safe-area-inset-top, 0px)`, fondo del tema), una superficie por grupo con separador fino. Fila: miniatura 56 px (radio 14), nombre, "músculo · equipamiento" en muted, flecha; ≥ 72 px. Conserva el índice alfabético lateral (solo letras presentes con los filtros actuales, `aria-label` por letra). Sin imagen o con error: FallbackCard.
- **Sin resultados:** frase breve que sugiera cambiar búsqueda o filtros, con acceso a "Limpiar".
- **Detalle (overlay a pantalla completa):** conserva el comportamiento actual (sin topbar ni navegación, cierre con botón y Escape, `inert`, focus trap, foco que vuelve a la fila, `returnTo` donde aún aplique). Contenido: botón cerrar 44 px, media 16:10 radio 24 con el mismo fallback, título, etiqueta lima del grupo muscular y etiqueta neutra del equipamiento, instrucciones numeradas (círculo lima con número en `#111`) y, al final, **"Excluir de mis entrenos"** como SecondaryButton (nunca CTA). Tras excluir, estado "Excluido" y aviso de que puede reincluirse desde Perfil, como hoy.

### 5.5 `/workout/:id`
- **Cabecera:** flecha de volver (a Hoy), título "Entreno de hoy" en dos líneas, y barra de progreso fija (`position: sticky`) con texto "X de N". El progreso cuenta ejercicios hechos **y** saltados.
- **Lista (una superficie):** cada fila ≥ 72 px con: botón circular 44 px para **Hecho** (`aria-pressed`, relleno lima con check), nombre con "músculo · series/repeticiones" (usa solo los datos que el planner ya entrega), y botón **Saltar** 44 px (`aria-pressed`, fondo gris al activarse). Estados no dependientes del color: hecho = check + nombre atenuado; saltado = nombre tachado + etiqueta "Saltado"; pendiente = círculo con contorno; el primer pendiente lleva la etiqueta lima "Ahora". Al tocar el nombre se despliega un detalle breve con el enlace **"Ver ejercicio"** (botón de texto, abre el modal de 6.5). Marcar o saltar es un toque y no mueve el scroll ni el foco.
- **Finalizar:** un único PrimaryCTA "Finalizar entreno" al final de la lista (no fijo, para no competir con el botón Hoy). Abre un overlay a pantalla completa con: duración (min, `inputmode="numeric"`), RPE 1-10 en rejilla de 5 columnas con botones de 48 px (seleccionado en lima; etiquetas "1 · Muy suave" y "10 · Máximo"), notas opcionales, PrimaryCTA "Guardar entreno" y, debajo, un TextButton **"Cerrar como sesión saltada"** (nunca con estilo de CTA). Mantén exactamente la lógica y validaciones actuales de finalización; durante el guardado deshabilita los botones; los errores se muestran con `role="alert"`. Tras guardar, banner lima con `role="status"`. Sin animación de celebración en esta fase.

### 5.6 Modal "Ver ejercicio" dentro de Workout
- Se abre desde "Ver ejercicio" **sin cambiar de ruta**: el progreso, lo marcado y lo saltado no se tocan. Hoja inferior en móvil (radio 28 arriba, `max-height: 90vh`, scroll interno) y centrada en pantallas ≥ 600 px, sobre scrim `rgba(17,17,17,.6)`.
- **Cierre:** X siempre visible (sticky arriba, 44 px), clic en el scrim y Escape. Fondo `inert`, focus trap, foco inicial en la X y devolución del foco al enlace "Ver ejercicio".
- **Contenido:** el mismo detalle del catálogo, **sin el botón "Excluir"**: media, título, etiquetas (grupo muscular en lima, equipamiento en neutro), instrucciones numeradas. Reutiliza el componente de contenido del detalle del catálogo (extráelo si hace falta) en lugar de duplicarlo; el overlay del catálogo conserva su botón de excluir.
- **Media (dos ilustraciones que simulan un GIF):** en `public/images/flat` y `exerciseData.ts` cada ejercicio tiene dos ilustraciones; **confirma cómo se identifican** antes de implementar y reutiliza esa convención. Alterna entre ellas cada ~800 ms con un fundido de ~120 ms, con una etiqueta "1 / 2" y un botón pausa/reanudar de 44 px siempre visible (`aria-label` "Pausar animación" / "Reanudar animación"). Con `prefers-reduced-motion` arranca pausado y un toque en la imagen cambia de posición. **Si un ejercicio solo tiene una ilustración**, se muestra estática y sin botón de pausa ni etiqueta. **Si no tiene ninguna**, se usa la FallbackCard neón. **Precarga la segunda ilustración al abrir el modal** para evitar parpadeos; si falla la carga de una, mostrar la otra estática o la FallbackCard.

## 6. Resto de pantallas (mismo sistema, sin cambiar campos ni reglas)
- **Login:** una columna, titular en Archivo Black, formulario sobre superficie, PrimaryCTA de enviar, enlace de alta como TextButton.
- **Onboarding y `/profile/*`:** secciones con título de 13 px en mayúsculas, campos de 52 px sobre superficie, ayudas en muted, estructura por pasos o grupos visibles sin cambiar campos, orden ni validaciones. Guardado por sección con un único PrimaryCTA por vista; diálogo de cambios sin guardar con título, acción principal y cierre claros. Controles segmentados de idioma/tema con seleccionado en lima.
- **`/profile`:** tarjeta de usuario simple y lista de ajustes en filas; acciones de cuenta destructivas (borrar cuenta) como SecondaryButton, con confirmación existente.
- **`/profile/measurements`:** lista con filas y acciones de texto; alta/edición en overlay.
- **`/templates/new`, `/templates/:templateId`, `/resources/:resourceId`:** mismas reglas (un CTA primario, listas de filas, embed con radio 24, fallback en media).
- **Estados vacío / carga / error / confirmación** en todas las pantallas: icono + una frase accionable, esqueleto neutro en carga, banner lima para confirmaciones.

## 7. Copy (ES / EN) — añadir a `i18n.tsx`
| Clave | ES | EN |
|---|---|---|
| nav.exercises / routines / today / streak / profile | Ejercicios / Rutinas / Hoy / Racha / Perfil | Exercises / Routines / Today / Streak / Profile |
| streak.atRisk | ¡No pierdas la racha! | Don't lose your streak! |
| streak.safe | Racha on fire | Streak on fire |
| streak.keep | Sigue la racha | Keep the streak going |
| streak.none | Empieza una racha hoy | Start a streak today |
| today.title | Hoy toca moverse | Time to move |
| today.cta | Crear entreno | Create workout |
| workout.finish | Finalizar entreno | Finish workout |
| workout.save | Guardar entreno | Save workout |
| workout.skipSession | Cerrar como sesión saltada | Close as skipped session |
| workout.viewExercise | Ver ejercicio | View exercise |
| workout.now | Ahora | Now |
| media.pause / media.resume | Pausar animación / Reanudar animación | Pause animation / Resume animation |
| filters.muscle / equipment / clear | Músculo / Equipamiento / Limpiar | Muscle / Equipment / Clear |

## 8. Orden de trabajo
1. Tokens, tipografía y componentes base en `src/styles/index.css` y `src/components` (con modo oscuro).
2. `BottomNavigation` + i18n + comprobar redirección `/` → `/today`.
3. `/today` y claim de racha.
4. `/history` (Racha).
5. Componentes Thumbnail y FallbackCard; `/templates` y las dos colecciones con miniaturas de recursos.
6. `/exercises` (3 filtros) y detalle.
7. `/workout/:id`, finalización y modal "Ver ejercicio" (con precarga y estados de una/ninguna ilustración).
8. Resto de pantallas, de una en una.

## 9. Criterios de aceptación
- `npm run lint`, typecheck y tests pasan; los tests de lógica (`planner`, `historyData`, `exerciseCatalogueLogic`) no cambian.
- Contraste AA en claro y oscuro; objetivos táctiles ≥ 44 px; sin scroll horizontal a 320 px; foco visible en todo control.
- Un único CTA primario visible por pantalla; el recuadro con sombra dura solo en CTA y botón Hoy.
- Navegación: orden Ejercicios, Rutinas, Hoy, Racha, Perfil; "Hoy" destacado; `/` abre `/today`.
- `/today` muestra los 3 estados del claim de racha con datos reales y sin duplicar lógica.
- Ejercicios: los 3 filtros funcionan combinados con los mismos resultados que antes.
- Recursos y ejercicios: ninguna fila muestra imagen rota; el mismo elemento mantiene siempre el mismo aspecto de FallbackCard.
- Workout: el modal "Ver ejercicio" no cambia de ruta ni altera el estado de la sesión; cierra con X, scrim y Escape; no incluye "Excluir"; alterna dos ilustraciones con pausa accesible, respeta `prefers-reduced-motion`, y cubre los casos de una o ninguna ilustración.
- Todos los textos pasan por i18n en ES y EN.

## 10. Verificaciones previas que debes reportar antes de implementar
1. Si `activityDates` / "hoy tiene actividad" se puede reutilizar desde `/today` sin duplicar lógica.
2. Si los contadores de Rutinas y Recursos existen como datos (si no, omítelos).
3. Cómo se identifican las dos ilustraciones de cada ejercicio y cuántos ejercicios tienen una o ninguna.
4. Qué campo guarda la miniatura de recursos y si hay caducidad de URL; implicaciones para caché PWA y CSP.
5. Si otros puntos de entrada al detalle de ejercicio usan `returnTo`.
6. Qué datos de series/repeticiones entrega hoy el planner por ejercicio.
