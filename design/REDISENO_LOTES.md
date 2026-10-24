# Rediseño: tareas de ajuste para Codex (v2)

Guardar como `design/REDISENO_LOTES.md`. Complementa a `design/PROMPT_CODEX.md`. **Si hay conflicto, este documento manda.**
Se ejecuta **una tarea por hilo**. No empieces una tarea sin que se te pida expresamente.

## 0. Reglas obligatorias
1. **Nunca reescribas un archivo entero.** Modifica solo los bloques necesarios. No reformatees, no reordenes, no cambies saltos de línea (CRLF) ni borres CSS existente: si un bloque debe sustituirse, edítalo con el cambio mínimo.
2. **Reutiliza lo que ya existe:** `src/components/UiIcon.tsx` (iconos), `AccentTile.tsx` y `CheckOption.tsx`. Si su API no basta, extiéndelos sin romper los usos actuales.
3. **No toques lógica de negocio, datos, rutas, Supabase, `src/planner`, tests de lógica** ni el comportamiento de los botones deshabilitados (es correcto).
4. Si un punto no se puede hacer como está descrito, **no lo sustituyas por otra cosa**: indícalo en el informe.
5. Lint y typecheck una sola vez, al final. Tests solo de lo afectado.
6. Todo texto visible por `useI18n().t`, con ES y EN.

### Informe final (siempre, con estas 5 secciones)
1. **HECHO:** cada punto de la tarea, con archivo y línea.
2. **NO HECHO / PARCIAL:** qué punto, por qué y qué falta.
3. **DESVIACIONES:** cualquier cosa distinta a lo pedido o fuera del alcance.
4. **ARCHIVOS:** modificados y creados, con líneas añadidas y borradas (`git diff --stat`).
5. **COMPROBACIONES:** salida literal de los comandos de la tarea, lint y typecheck.
Si una sección está vacía, escribe "ninguno". Nada se marca como hecho sin evidencia. Si una comprobación no cumple, corrígelo antes de responder.

## 1. Decisiones de diseño fijas
- **Acentos:** `--accent-lime #C6FF3D`, `--accent-yellow #FFE14D`, `--accent-pink #FF4FA3`. Tintes: `--lime-soft #F1FFCB`, `--yellow-soft #FFF6C2`, `--pink-soft #FFDCEE` (oscuro: `#27330E`, `#3A3212`, `#3A1629`). El azul `#3D5AFE` solo para el anillo de foco (`:focus-visible`).
- **Tramas** (CSS puro, tinta `#111` al 14 %, 10 % en heros): lima = puntos (`.pat-dots`), fucsia = diagonales (`.pat-diag`), amarillo = rayas horizontales (`.pat-lines`).
- **Color por entidad:** plantillas = fucsia, recursos = amarillo, ejercicios y racha = lima (llama en naranja).
- **Anti-sobrecarga:** un solo bloque grande lima por pantalla; fucsia y amarillo solo en tiles, chips, insignias, estados y tramas (nunca en CTAs ni fondos completos); una sola zona con trama a la vez (además de miniaturas), ≤ 25 % de su contenedor y nunca detrás de texto; texto en `#111` sobre neón.
- **Botones:** primario plano y sin sombra; secundario con contorno de 2 px; texto subrayado ≥ 44 px. La sombra dura solo en el botón central "Hoy".
- **Campos:** sobre beige, blancos sin borde; dentro de tarjeta blanca, fondo beige sin borde. Sin spinners nativos.
- **H1:** Archivo Black en minúscula/frase, `clamp(28px, 9vw, 34px)`. Mayúsculas solo en botones.
- **Finalizar sesión (app real):** duración planificada no editable; esfuerzo opcional de 1 a 5 (puede mostrarse como 5 botones de 48 px con los mismos valores). El calendario de Racha no tiene navegación de mes.

---

## T1. Tokens y tramas
Añade al CSS los tokens, tintes, `.pat-dots/.pat-diag/.pat-lines` y modo oscuro. Retira el azul decorativo.
- Comprobación: `grep -c "pat-dots\|pat-diag\|pat-lines\|--accent-" src/styles/index.css`; `grep -rn "3D5AFE\|3d5afe" src` (solo el anillo de foco).

## T2. Iconos
Sustituye todos los glifos de texto por `UiIcon`: `★ ☆`→star (activa: relleno `#FFE14D` con contorno de tinta), `⋮`→more, `✓`→check, `▶`→play, `II` (saltar)→skip, `×`→close, `>` `→`→chevron, `◐ ☀ ☾`→system/sun/moon, `+`, ordenar, buscar. Mantén `aria-label`.
- Comprobación: `grep -rnE "[★☆⋮✓▶×]" src --include=*.tsx` (vacío salvo tests).

## T3. AccentTile aplicado
Reutiliza `AccentTile` (y `accentForId` determinista) en: Atajos de Hoy (Rutinas favoritas fucsia, Recursos amarillo); filas de plantillas (fucsia, diagonales); recurso sin miniatura (amarillo); `FallbackCard` como caso de `AccentTile`; filas de Perfil (Datos personales fucsia, Entrenamiento lima, Mediciones amarillo); datos de Racha (mejor racha amarillo con trofeo, días activos fucsia con calendario); detalle de plantilla (tile fucsia de 56 px junto al título).
- Comprobación: `grep -rn "<AccentTile" src --include=*.tsx | wc -l` (≥ 8) y lista de archivos que lo usan.

## T4. Botones, campos y CheckOption
Aplica las reglas de botones y campos. `CheckOption` único para todas las opciones tipo checkbox (perfil, equipamiento, formulario de Hoy): seleccionado = lima con texto `#111` y check de tinta, **sin naranja**; arregla el texto recortado ("Barbell", "Banco") con `min-height: 52px`, `line-height: 1.25`, sin `overflow: hidden`. Segmentados de Perfil (idioma, tema): seleccionado lima, borde azul solo en `:focus-visible`.
- Comprobación: `grep -rn "<CheckOption" src --include=*.tsx | wc -l`; `grep -n "box-shadow" src/styles/index.css | grep -i "cta\|primary"` (sin sombra dura en el CTA).

## T5. Tipografía y copy
Elimina `text-transform: capitalize` de títulos y calendario; aplica la regla de H1. Copy: "1 día seguido" / "N días seguidos"; "Ver todas" (plantillas) y "Ver todos" (recursos); proveedores YouTube / Instagram / TikTok; etiquetas "volver" con el destino real ("Rutinas" en la colección de plantillas y en el detalle de recurso).
- Comprobación: `grep -n "capitalize" src/styles/index.css` (vacío).

## T6. Navegación inferior
Marca activa lima dentro de la barra (`top: 0` del ítem, 28×4, radio inferior 4, sin recorte). Rutinas activa en `/templates/*` y `/resources/*`; Racha en `/history`; `aria-current="page"`. Orden: Ejercicios, Rutinas, Hoy, Racha, Perfil.
- Comprobación: `grep -rn "aria-current" src/components/BottomNavigation.tsx`.

## T7. Modal base y primeros modales
Crea `Modal` con cabecera (título + botón X de 44 px con icono), cuerpo y pie (acción primaria a ancho completo; secundaria como botón de texto). Variantes *dialog* centrado y *sheet* inferior. Scrim `rgba(17,17,17,.6)`, radio 28, cabecera sticky con fondo sólido que cubra el padding superior y `env(safe-area-inset-top)`. Conserva `role="dialog"`, `aria-modal`, `inert`, focus trap, Escape y devolución del foco. Tile de 40 px junto al título con el acento de su entidad. Migra **Añadir recurso** (placeholder corto y ayuda bajo el campo) y **Finalizar sesión**.
- Comprobación: `grep -rn "<Modal" src --include=*.tsx | wc -l`.

## T8. Resto de modales
Migra al `Modal`: registrar actividad manual, cambios sin guardar, borrar cuenta, mediciones (alta y edición), selector de ejercicios de plantilla. Las acciones destructivas nunca como CTA negro (secundario con texto `#C2410C`, sin tile).
- Comprobación: `grep -rn "dialog-backdrop\|role=\"dialog\"" src --include=*.tsx` (solo dentro de `Modal`).

## T9. Detalle de ejercicio y modal "Ver ejercicio" en Workout
Detalle (sheet): espacio entre flecha y "Ejercicios"; categoría como etiqueta; media 16:10 sin barras laterales (fondo `#D6EEFB`, `object-fit: contain`); **instrucciones numeradas** (círculo lima con número `#111`); consejos con viñetas o párrafos separados; músculos, equipamiento y detalles en una sola superficie; etiquetas: músculo lima, equipamiento amarillo, categoría fucsia; **"Excluir de los planes" como botón secundario**; aviso neutro; créditos en 12 px muted.
Workout: "Ver ejercicio" abre el mismo detalle en un modal **sin salir de `/workout/:id` y sin "Excluir"**, cerrable con X, scrim y Escape; dos ilustraciones que alternan cada ~800 ms con fundido de ~120 ms, etiqueta "1 / 2" y botón pausa de 44 px; `prefers-reduced-motion` arranca pausado; con una sola ilustración, estática y sin pausa; sin ilustración, `AccentTile`; precarga la segunda al abrir. Reutiliza el contenido del detalle (extrae un componente compartido).
- Comprobación: `grep -rn "Excluir" src/features/planner` (no debe aparecer en el modal de Workout).

## T10. Catálogo de ejercicios
Índice alfabético: **primero comprueba si existe** (`grep -rniE "alphabet|letter|rail|jump" src/features/exercises src/styles`). Si existe, ajústalo; si no, reconstrúyelo y dímelo. Reglas: columna reservada con `padding-right: 40px` en filtros, cabeceras y listas; índice `position: sticky` bajo los filtros y sobre la navegación; scroll propio; sin tildes (la "Á" no es letra aparte); letra activa lima (scrollspy); cabeceras de letra como círculo lima de 36 px con la inicial. Filtro activo en lima; sin imagen → `AccentTile` determinista; meta con `line-clamp: 2`. No cambies los 3 filtros ni `exerciseCatalogueLogic.ts`.
- Comprobación: salida del `grep` anterior y confirmación explícita de qué letra del índice no tapa ningún chevron.

## T11. Hoy
"Crear entrenamiento" abre el formulario en un `Modal` (no desplegado bajo el hero): un solo CTA visible, "Atajos" no se desplaza, submit a ancho completo, equipamiento con `CheckOption`, "Cancelar" como botón de texto. Hero lima con trama de puntos al 10 % solo en la esquina superior derecha (≈ 35 % del ancho). Racha: 7 barras con `aria-label` por día y hoy distinto; "Sigue la racha" para 1-2 días y "Racha on fire" desde 3.
- Comprobación: `grep -rn "Racha on fire\|Sigue la racha" src`.

## T12. Racha, Rutinas y detalle de plantilla
- **Racha:** etiqueta "Días activos este mes"; la leyenda reutiliza los estilos reales de las celdas (lima = actividad, borde discontinuo = sin actividad, atenuado = sin datos, hoy con anillo de tinta); hero con silueta de llama y puntos.
- **Rutinas y colecciones:** "Nueva plantilla" y "Añadir recurso" como botón de texto compacto; filtros en dos filas (buscador a ancho completo; debajo chips y un control de orden con etiqueta "Recientes / A–Z"); selector de plataforma con el estilo de campo; chips seleccionados lima.
- **Detalle de plantilla:** alinea "30 min" con el título, quita la tarjeta dentro de tarjeta, CTA "Entrenar" encima de la lista o fijo.
- Comprobación: lista de archivos y líneas modificados por cada punto.

## T13. Workout
Nombres en 2 líneas (sin "…"); icono de saltar propio; "Ver ejercicio" discreto (botón de texto o toque sobre el nombre); omitido = amarillo suave con etiqueta "Omitido", hecho = lima, pendiente = neutro, "Ahora" lima; línea de ayuda bajo "Completar entrenamiento" mientras esté deshabilitado: "Marca o salta todos los ejercicios para completar." (no cambies la condición).
- Comprobación: `grep -rn "Marca o salta" src`.

## T14. Perfil y subpáginas
Entrenamiento: quita el título "Preferencias de entrenamiento" duplicado y el doble separador antes de Exclusiones. Mediciones: "Añadir medición" compacto de una línea; evita repetir "Mediciones" e "Historial de mediciones". Datos personales: campos con la regla de campo. No toques el avatar.
- Comprobación: lista de archivos y líneas.

## Fuera del alcance (requiere aprobación)
Etiquetas en inglés de equipamiento y músculos (`src/lib/catalogueTranslations.ts`): no las modifiques.
