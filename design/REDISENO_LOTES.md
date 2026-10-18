# Rediseño: lotes de ajuste para Codex

Guardar en el repo como `design/REDISENO_LOTES.md`. Complementa a `design/PROMPT_CODEX.md`. **Si hay conflicto, este documento manda.**

## Reglas de trabajo (ahorrar cuota)
- No explores el repo: edita solo los archivos indicados o los que importen directamente.
- Un lote por hilo. Lint y typecheck **una sola vez al final**; tests solo de lo afectado.
- Un commit por lote. Responde con un resumen de máximo 8 líneas, sin pegar diffs.
- Si algo exige tocar lógica, datos, rutas o configuración, detente y avisa.

## Correcciones al prompt anterior (según la app real)
- **Finalizar sesión:** la duración es **planificada y no editable** (texto "Duración planificada: 30 min"); el esfuerzo percibido es **opcional y de 1 a 5**. No añadas campo de duración ni escala 1-10. Se puede mostrar el 1-5 como 5 botones de 48 px en lugar de `<select>`, con los mismos valores y "sin valor" por defecto (opcional).
- **Calendario de Racha:** no tiene navegación de mes; no la añadas.
- **CTA primario:** **sin sombra dura blanca** (solo se ve sobre lima y crea incoherencia). La sombra dura queda únicamente en el botón central "Hoy".
- **Títulos de pantalla (H1):** Archivo Black en **minúscula/frase** ("Datos personales", no "DATOS PERSONALES"), `font-size: clamp(28px, 9vw, 34px)` para que quepa a 320 px. Mayúsculas solo en etiquetas de botón y CTAs.

---

## LOTE 1: cimientos (el de mayor impacto)

1. **Iconos.** Crea un componente `Icon` (SVG de línea 2.5 px, `currentColor`) y sustituye todos los glifos de texto: `★ ☆`→star, `⋮`→more, `✓`→check, `▶`→play, `II` (saltar)→skip, `×`→close, `>` `→`→chevron, `◐ ☀ ☾`→system/sun/moon, `+`, ordenar, buscar. Estrella activa: relleno `#FFE14D` con contorno de tinta. Mantén los `aria-label`.
2. **Botones.**
   - Primario: plano, sin sombra.
   - Secundario: contorno 2 px sin relleno.
   - Texto: subrayado, ≥ 44 px.
   - **Deshabilitado:** el comportamiento actual es correcto y no se toca (Guardar cambios sin cambios pendientes; Completar entrenamiento hasta marcar o saltar todos los ejercicios). No cambies su estilo.
3. **Campos.** Regla única: sobre fondo beige, campo blanco sin borde; dentro de una tarjeta blanca, campo con fondo beige sin borde. Aplica a `input`, `select`, `textarea` y buscador (hoy el buscador no tiene borde y los selects sí). Oculta los spinners nativos del input numérico.
4. **`CheckOption` único** para todos los checkbox con aspecto de opción (perfil, equipamiento, Hoy): no seleccionado = campo; seleccionado = fondo lima `#C6FF3D`, texto `#111`, check de tinta. **Elimina el naranja** del estado seleccionado (reservado a la racha). Arregla el texto recortado por arriba en la primera fila ("Barbell", "Banco"): `min-height: 52px`, `line-height: 1.25`, sin `overflow: hidden`. Úsalo también en el formulario de Hoy (ahora tiene checkboxes nativos sin estilo).
5. **Tipografía.** Elimina `text-transform: capitalize` de títulos y del calendario (produce "Actividad De Entrenamiento", "Octubre De 2026"). Aplica la regla de H1 de arriba a todas las pantallas.
6. **`Modal` base** (lo usarán todos los diálogos):
   - Anatomía: cabecera con título a la izquierda y **botón X de 44 px con icono SVG** a la derecha; cuerpo; pie con acción primaria a ancho completo y secundaria como botón de texto debajo.
   - Variantes: *dialog* centrado (formularios cortos y confirmaciones) y *sheet* inferior (contenido largo, como detalle de ejercicio). Misma anatomía en ambas.
   - Scrim `rgba(17,17,17,.6)`, radio 28, cabecera sticky **con fondo sólido que cubra también el padding superior y `env(safe-area-inset-top)`** (hoy el contenido se ve por encima de la cabecera en el detalle de ejercicio).
   - Mantén `role="dialog"`, `aria-modal`, `inert`, focus trap, Escape y devolución del foco.
7. **Navegación inferior.** La marca lima de "activo" se ve cortada y pegada al borde: colócala dentro de la barra (`top: 0` del ítem, 28×4, radio inferior 4) sin recorte. Marca **Rutinas** activa también en `/resources/*` y `/templates/*`; **Racha** en `/history`. Usa `aria-current="page"`.
8. **`ListRow`** con chevron SVG (hoy hay `>` de texto en Perfil y Ejercicios, y SVG en Atajos).
9. **Copy e i18n:** "1 día seguido" / "N días seguidos" (hoy "1 días"); "Ver todas" para plantillas y "Ver todos" para recursos; proveedores con su nombre correcto (YouTube, Instagram, TikTok, hoy en minúscula); etiquetas "volver" que nombren el destino real (en la colección de plantillas y en el detalle de recurso hoy dicen "Plantillas": debe decir "Rutinas").

## LOTE 1B: acentos de color y tramas (cohesión cromática)

**Objetivo:** que lima, amarillo y fucsia, y las tramas de las tarjetas de recursos, den identidad a toda la app sin recargarla.

**Tokens** (claro / oscuro)
- Acentos: `--accent-lime #C6FF3D`, `--accent-yellow #FFE14D`, `--accent-pink #FF4FA3` (iguales en ambos temas).
- Tintes suaves: `--lime-soft #F1FFCB`, `--yellow-soft #FFF6C2`, `--pink-soft #FFDCEE` / oscuro `#27330E`, `#3A3212`, `#3A1629`.
- **Retira el azul `#3D5AFE` como color decorativo** (hoy en el icono de "Rutinas favoritas" y en los tiles de plantillas). Queda solo para el anillo de foco.

**Tramas (CSS puro, sin degradados de color):** tinta `#111` al 14 % (10 % en heros): lima = **puntos**, fucsia = **diagonales**, amarillo = **rayas horizontales**. Utilidades `.pat-dots`, `.pat-diag`, `.pat-lines`.

**Componentes**
- `AccentTile` (props: `accent`, `icon`, `size` 40/56/72, `pattern` opcional). `FallbackCard` pasa a ser un caso de `AccentTile`.
- `accentForId(id)` determinista (el hash ya definido).
- Constante `ENTITY_ACCENT`: plantillas = fucsia, recursos = amarillo, ejercicios = lima, racha/actividad = lima (llama en naranja).

**Reglas anti-sobrecarga**
1. Un solo bloque grande lima por pantalla.
2. Fucsia y amarillo solo en tiles, chips, insignias, estados y tramas; nunca en CTAs ni en fondos de pantalla completa.
3. Una sola zona con trama visible a la vez (además de miniaturas), ≤ 25 % del alto de su contenedor y nunca detrás de texto corrido.
4. Texto siempre en `#111` sobre neón.

**Aplicación por pantalla (hazlo dentro del LOTE 3 y del LOTE 2)**
- **Hoy:** Atajos con `AccentTile` fucsia (Rutinas favoritas) y amarillo (Recursos). Hero lima con trama de puntos al 10 % solo en la esquina superior derecha (≈ 35 % del ancho), sin tocar el texto.
- **Racha:** hero lima con la silueta de llama + puntos; en el bloque de datos, tile amarillo (mejor racha, icono de trofeo) y fucsia (días activos del mes, icono de calendario). Hoy con anillo de tinta.
- **Rutinas y colecciones:** tile de plantilla fucsia con diagonales; recurso sin miniatura en amarillo; chips seleccionados lima; estrella activa amarilla.
- **Detalle de plantilla:** `AccentTile` fucsia de 56 px junto al título; números de la lista en círculo lima.
- **Ejercicios:** sin imagen → `AccentTile` determinista (lima/amarillo/fucsia); filtro activo en lima.
- **Detalle de ejercicio:** etiquetas: grupo muscular lima, equipamiento amarillo, categoría (Fuerza…) fucsia.
- **Workout:** hecho = lima (como ahora), **omitido = amarillo suave** con etiqueta "Omitido", pendiente = neutro, "Ahora" lima.
- **Modales:** tile de 40 px junto al título con el acento de su entidad (Añadir recurso = amarillo; selector de ejercicios de plantilla = fucsia; Finalizar sesión, Registrar actividad = lima). Los destructivos (borrar cuenta, eliminar) sin tile.
- **Perfil:** tiles de 40 px en las filas (Datos personales fucsia, Entrenamiento lima, Mediciones amarillo); segmentados con seleccionado lima.
- **Login y onboarding:** hero lima con trama de puntos, con la misma regla.

## LOTE 2: modales y overlays (sobre el `Modal` base)

- **Añadir recurso:** acción primaria a ancho completo, "Cancelar" como botón de texto debajo; el placeholder largo del título se recorta ("Añade un título para encontrarlo despué…"): usa un placeholder corto y mueve la ayuda a un texto bajo el campo.
- **Finalizar sesión:** campos reales (duración planificada, esfuerzo 1-5 opcional, nota). "Completar entrenamiento" primario; "Finalizar como omitido" como botón de texto.
- **Registrar actividad manual, cambios sin guardar, borrar cuenta, formulario de mediciones, selector de ejercicios de plantilla:** misma anatomía. La acción destructiva (borrar cuenta, eliminar) nunca con estilo de CTA negro: secundario con texto en `#C2410C`.
- **Detalle de ejercicio (sheet):**
  - Cabecera: espacio entre flecha y texto ("←Ejercicios" hoy va pegado); la etiqueta "Fuerza" pasa a etiqueta lima junto al título.
  - Media 16:10 sin barras blancas laterales: fondo del color de la ilustración (`#D6EEFB`) y `object-fit: contain`, o `cover` si no recorta el movimiento.
  - **Instrucciones numeradas** (círculo lima con número en `#111`; hoy no se ven los números).
  - "Consejos": viñetas o párrafos con separación (hoy son líneas pegadas).
  - "Músculos trabajados", "Equipamiento" y "Detalles del movimiento": una sola superficie con filas o etiquetas, en vez de tres tarjetas con borde.
  - **"Excluir de los planes": botón secundario con contorno, no CTA negro.** El aviso de estado en neutro (coral solo para errores).
  - Créditos de fuente en 12 px muted.
- **Modal "Ver ejercicio" en Workout:** según la sección 5.6 del prompt anterior, sin "Excluir".

## LOTE 3: pantallas

- **Hoy:** el formulario "Crear entrenamiento" se abre como `Modal` (dialog/sheet) en lugar de desplegarse debajo del hero. Así hay un único CTA visible, no se desplaza "Atajos" y el submit va a ancho completo. Equipamiento con `CheckOption`; "Cancelar" como botón de texto. Racha: las 7 barras con `aria-label` por día y hoy marcado de forma distinta; copy "Sigue la racha" para rachas de 1-2 días y "Racha on fire" desde 3.
- **Racha:** cifra con pluralización correcta; etiqueta "Días activos este mes" (hoy "Este mes"); la **leyenda debe reutilizar los estilos reales** de las celdas (círculo lima = actividad; círculo con borde discontinuo = sin actividad; atenuado = sin datos; hoy con borde de tinta). Hoy la leyenda muestra un cuadrado naranja que no existe en el calendario.
- **Rutinas y colecciones:** "Nueva plantilla" y "Añadir recurso" como botón de texto compacto, no como botón negro grande (hoy compite con el título). Filtros en dos filas: buscador a ancho completo y debajo chips (Favoritas) y el control de orden. El orden pasa a ser un control con etiqueta ("Recientes / A–Z"), porque hoy es un icono lima ambiguo junto a "AZ". El selector de plataforma con el mismo estilo de campo que el buscador.
- **Detalle de plantilla:** alinea "30 min" con el título (hoy tiene 10 px de sangría extra); quita la tarjeta dentro de tarjeta; mueve el CTA "Entrenar" **encima de la lista** o hazlo fijo, porque en rutinas largas queda fuera de pantalla.
- **Catálogo de ejercicios:**
  - **Índice alfabético:** mantén su scroll propio. Solo corrige que tapa los chevrons y el borde de los selects: reserva `padding-right: 40px` en filtros, cabeceras y listas, y coloca el índice en esa columna reservada (`position: sticky`, por debajo de los filtros y por encima de la navegación), nunca encima del contenido.
  - Quita las tildes del índice (la "Á" aparece como letra propia).
  - Letra activa del índice en lima (se actualiza con el scroll); cabeceras de letra como círculo lima de 36 px con la inicial en `#111`.
  - Limita la línea de meta a 2 líneas (`line-clamp`).
- **Workout:**
  - Nombres en 2 líneas en vez de truncarlos con "…".
  - Icono de saltar propio (hoy "II" parece pausa).
  - "Ver ejercicio" como botón de texto discreto o toque sobre el nombre, no un enlace subrayado repetido en cada fila.
  - "Completar entrenamiento" sigue deshabilitado hasta que todos los ejercicios estén hechos u omitidos (correcto, no lo cambies). Añade una línea de ayuda bajo el botón mientras esté deshabilitado: "Marca o salta todos los ejercicios para completar."
- **Perfil y subpáginas:**
  - Controles segmentados de idioma y tema: seleccionado = lima con texto `#111`; el borde azul solo en `:focus-visible`; iconos SVG.
  - Entrenamiento: título "Preferencias de entrenamiento" repetido dos veces, y doble separador antes de Exclusiones.
  - Mediciones: "Añadir medición" como botón compacto de una línea; evita repetir "Mediciones" e "Historial de mediciones".
  - Datos personales: campos con la regla de campo (beige dentro de tarjeta blanca).

## Fuera del alcance visual (necesita tu aprobación antes de tocarlo)
- **Etiquetas en inglés:** equipamiento y músculos aparecen sin traducir ("No Equipment", "Barbell", "Adductors", "Compound", "Kettlebell"…) en el catálogo, los filtros, el formulario de Hoy y Perfil. Revisar `src/lib/catalogueTranslations.ts`. Es contenido, no lógica, pero hay que decidir el diccionario.
- **Avatar de Perfil (emoji de mapache):** no lo toques salvo indicación.
