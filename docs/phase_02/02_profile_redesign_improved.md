# Grupo B — Reorganización de Perfil

> **Estado:** implementación realizada; verificación automatizada completada (10 de octubre de 2026).  
> **Alcance:** UX, navegación, comportamiento y criterios de aceptación de Perfil.  
> **Decisión de implementación:** implementada a petición del usuario y refinada después: la tarjeta abre Datos personales; el objetivo secundario permanece oculto; las exclusiones individuales se gestionan desde el catálogo; el modo Sistema se conserva junto a Claro y Oscuro.

## 1. Propósito

Reorganizar la sección **Perfil** para que la configuración relacionada con el entrenamiento sea fácil de encontrar y editar, mientras que las preferencias generales de la aplicación ocupen un lugar compacto y secundario. La experiencia debe seguir patrones familiares de ajustes en aplicaciones móviles modernas: resumen claro, filas de navegación con títulos y descripciones breves, pantallas de edición enfocadas y navegación de vuelta predecible.

La reorganización es principalmente de presentación y navegación. No debe alterar las reglas del planificador, los datos existentes, las operaciones seguras de cuenta ni los contratos funcionales ya establecidos.

## 2. Estado de la revisión y contraste con el producto existente

Esta propuesta se basa en los requisitos del documento original del Grupo B y en el inventario funcional del proyecto compartido durante la revisión. Antes de implementar, Codex debe confirmar los nombres y rutas exactos de los archivos y contrastar cada punto con la rama de trabajo actual; no se deben dar por verificados nombres de componentes o rutas que no se hayan inspeccionado.

| Área | Comportamiento existente que debe conservarse | Cambio propuesto |
|---|---|---|
| Perfil | Formulario de perfil con guardado explícito | Convertir Perfil en una pantalla resumen con tarjeta superior y filas de navegación a subpantallas |
| Datos personales | Nombre opcional, objetivo principal, objetivo secundario opcional y nivel de experiencia | La tarjeta de perfil abre **Datos personales**; el objetivo secundario no se muestra ni se altera |
| Entrenamiento | Días disponibles, duración habitual, preferencias de actividad, disponibilidad exterior, dependencia del tiempo, equipamiento y ejercicios excluidos | Agruparlos en **Entrenamiento**, separar Equipamiento y Exclusiones; gestionar exclusiones individuales desde el catálogo |
| Mediciones | Gestor de registros históricos con fecha, peso, altura, cintura, pecho, cadera, brazo, muslo y nota | Mantener la gestión histórica en **Mediciones**, opcional y visualmente discreta |
| Idioma y tema | Preferencias añadidas en el Grupo A; idioma español/inglés y tema Sistema/Claro/Oscuro | Mostrar controles compactos al final de Perfil y aplicar/guardar automáticamente |
| Plan semanal | La regeneración es explícita en Semana; las sesiones completadas o en curso están protegidas | Guardar Perfil no regenera el plan ni modifica sesiones |
| Cuenta | Cierre de sesión y eliminación de cuenta/datos ya disponibles | Cerrar sesión queda al final de Perfil; eliminar cuenta se ubica al final de Datos personales |
| Modelo de datos | No hay soporte confirmado para fecha de nacimiento, género, avatar almacenado, ubicación habitual, unidades configurables ni métricas derivadas | No añadir campos, migraciones ni funciones de ese tipo como parte de esta propuesta |

### Fuentes que deben cotejarse durante la implementación

- Documento original del Grupo B dentro de `docs/phase_02/` (localizar el nombre exacto; no sobrescribirlo).
- `docs/phase_02/00_PHASE2_OVERVIEW.md`.
- Pantalla y componentes actuales de Perfil, formulario de entrenamiento y gestor de Mediciones.
- Persistencia y validación de las preferencias de perfil y de idioma/tema.
- Flujos actuales de cierre de sesión y eliminación de cuenta.
- Pantalla Semana y lógica de regeneración/protección de sesiones.
- Pruebas existentes relacionadas con perfil, preferencias, Mediciones, autenticación y planificador.

**Referencias de implementación verificadas:** `src/features/profile/ProfilePage.tsx`, `ProfileFields.tsx`, `MeasurementManager.tsx`, `src/lib/profileData.ts`, `src/app/App.tsx`, `src/lib/i18n.tsx` y `src/styles/index.css`. Las pruebas de UI están en `tests/profile-ui.test.tsx`; las comprobaciones de traducciones, en `tests/i18n.test.tsx`.

## 3. Decisiones confirmadas

- La pantalla principal seguirá llamándose **Perfil**.
- En la parte superior habrá una tarjeta de usuario con avatar visual, nombre y datos personales breves disponibles.
- La tarjeta no mostrará peso, medidas ni otros valores corporales.
- Las subpantallas serán **Entrenamiento**, **Datos personales** y **Mediciones**. La tarjeta enlaza a Datos personales y sustituye la fila duplicada.
- La configuración de la aplicación aparecerá debajo de esas filas, al final de Perfil y con poco peso visual.
- El idioma se representará con un selector compacto `ES | EN`, sin banderas.
- El tema ofrecerá **Sistema**, **Claro** y **Oscuro**, mediante iconos compactos y etiquetas accesibles.
- Guardado híbrido: los formularios de Datos personales, Entrenamiento y Mediciones conservarán guardado explícito; idioma y tema se aplicarán y persistirán automáticamente.
- Las Mediciones serán opcionales, históricas y discretas.
- Cerrar sesión y eliminar cuenta/datos seguirán disponibles. Cerrar sesión queda al final de Perfil y eliminar cuenta, al final de Datos personales, en un bloque separado.
- Los objetivos y Mediciones son informativos y no deben cambiar la planificación.
- Cambiar o guardar preferencias no debe regenerar la semana de forma silenciosa.
- La auditoría completa de conformidad WCAG AA de contraste de color se aplaza a la fase final de branding, cuando se hayan definido los colores definitivos. La estructura y las interacciones deben seguir siendo accesibles desde esta fase.

## 4. Arquitectura de información y navegación

### 4.1 Pantalla principal: Perfil

Orden visual recomendado:

1. **Tarjeta de usuario**, clicable y enlazada a **Datos personales**.
2. Lista de ajustes de uso frecuente:
   - **Entrenamiento** — resumen breve de que aquí se configuran disponibilidad y preferencias de actividad.
   - **Mediciones** — historial opcional, sin mostrar cifras en la fila.
3. Separador y sección **Configuración de la app**:
   - Idioma: selector `ES | EN`.
   - Tema: selector compacto de Sistema / Claro / Oscuro.
4. Cerrar sesión como última acción de Perfil.
5. Eliminar cuenta y datos al final de Datos personales, en un bloque separado y con confirmación.

Las filas de navegación deben tener área de toque cómoda, título explícito, indicador visual de navegación y, si aporta claridad, una descripción secundaria breve. No usar pestañas para estas tres áreas: son destinos de edición distintos y una lista de ajustes resulta más reconocible, especialmente en móvil.

### 4.2 Tarjeta de usuario

- Mostrar el nombre si existe; si está vacío, usar un texto de sustitución neutro y localizado.
- Usar un icono animal decorativo como placeholder fijo. No añadir carga ni selección persistente de avatar hasta que exista un campo de almacenamiento aprobado.
- Mostrar solo información personal ya disponible y útil para identificar el perfil. No duplicar todos los campos ni mostrar métricas corporales.
- La tarjeta no debe convertirse en un resumen de rendimiento ni en un panel de estadísticas.
- Debe adaptarse a pantallas estrechas sin truncar acciones importantes ni causar desplazamiento horizontal.

### 4.3 Navegación entre pantallas

- Cada subpantalla tendrá un título inequívoco y una forma consistente de volver a Perfil.
- Al entrar en una subpantalla, mantener el contexto de navegación habitual de la aplicación.
- No usar acordeones como sustituto de estas subpantallas.
- Si se intenta abandonar una pantalla con cambios sin guardar, mostrar una decisión clara para guardar, descartar o continuar editando. No descartar cambios silenciosamente.
- La vuelta a Perfil no debe provocar una regeneración del plan ni una escritura adicional no solicitada.

## 5. Subpantalla Entrenamiento

### Contenido

Agrupar los ajustes de entrenamiento existentes, sin añadir categorías nuevas:

- Días disponibles de lunes a domingo.
- Duración habitual, con el rango existente de 5 a 240 minutos.
- Preferencias de actividad existentes: fuerza, cardio, caminar, HIIT y movilidad.
- Disponibilidad para entrenar al aire libre.
- Equipamiento seleccionado, usando el catálogo existente.
- Ejercicios excluidos, usando el catálogo existente.

### Interacción y validación

- Mantener un botón de guardado explícito y claramente identificado.
- Distinguir el estado guardado del estado modificado; mientras existan cambios pendientes, indicarlo sin depender solo del color.
- Validar el rango de duración y cualquier otra regla ya vigente antes de persistir.
- Mantener selecciones, catálogos, identificadores y relaciones actuales; no duplicar catálogos ni recrear datos.
- Mostrar errores junto al campo afectado y un resumen accesible cuando resulte necesario.
- Si el guardado falla, conservar las ediciones y comunicar que no se guardaron.
- No añadir un botón de regeneración del plan aquí salvo que una decisión futura lo apruebe explícitamente.

## 6. Subpantalla Datos personales

### Campos incluidos

- Nombre opcional.
- Objetivo principal. (el objetivo secundario no se va a usar de momento, así que no hay que mostrarlo)
- Nivel de experiencia.

Los valores y opciones deben provenir del modelo y catálogos existentes. No introducir fecha de nacimiento, género, altura como dato de perfil, avatar subido, ubicación ni otros campos no soportados por el modelo actual.

### Interacción y validación

- Guardado explícito.
- Conservar las reglas de validación actuales y hacer comprensibles los errores.
- Los objetivos y el nivel de experiencia describen las preferencias del usuario; guardar cambios no debe alterar por sí mismo sesiones ya generadas.
- No inferir ni calcular datos sensibles o métricas a partir de estos campos.

## 7. Subpantalla Mediciones

### Contenido y comportamiento

Conservar el gestor de registros históricos existente. Cada registro puede incluir los campos que ya soporte el modelo:

- Fecha.
- Peso y altura.
- Cintura, pecho, cadera, brazo y muslo.
- Nota.

No añadir medidas, gráficos, tendencias, comparaciones, objetivos corporales, alertas ni métricas derivadas en esta reorganización, salvo aprobación específica posterior.

### Tratamiento de la experiencia

- La pantalla es opcional y debe tener una presentación neutral, sin lenguaje que juzgue el cuerpo ni mensajes que sugieran que registrar medidas es obligatorio.
- No mostrar valores ni resúmenes corporales en la tarjeta de Perfil, en la fila de navegación ni en otras áreas no solicitadas.
- La lista debe identificar los registros históricos por fecha sin convertir la pantalla en un mecanismo de presión o comparación.
- Añadir, editar y eliminar registros debe conservar las semánticas actuales de historial.
- Las operaciones destructivas sobre un registro deben seguir las confirmaciones y protecciones existentes.
- Guardar o editar Mediciones no debe cambiar la planificación, los objetivos de entrenamiento ni las sesiones completadas.

## 8. Configuración de la app

Esta sección se coloca **después** de Entrenamiento, Datos personales y Mediciones. Debe ser compacta, pero los controles han de seguir siendo fáciles de identificar y usar.

### 8.1 Idioma

- Opciones: `ES` y `EN`, sin banderas.
- Cambio inmediato de idioma en la interfaz.
- Persistencia automática usando el mecanismo ya incorporado en el Grupo A.
- Mantener la sincronización con el perfil cuando haya sesión y el comportamiento local existente cuando corresponda.
- Un fallo al persistir no debe dejar al usuario sin indicación del estado; manejar el error con el patrón ya usado por la aplicación.
- Todos los textos nuevos deben integrarse en el sistema de internacionalización existente. No añadir textos de interfaz sin traducir.

### 8.2 Tema

- Opciones: **Claro** y **Oscuro**. (el del sistema no se va a usar como opción, que sea por defecto el del sistema, pero en cuanto se seleccione uno de los dos claro/oscuro será el que se muestre)
- Presentación compacta con iconos apropiados (por ejemplo, sol y luna) y nombre accesible para cada opción.
- El icono por sí solo no es suficiente: controles y estado seleccionado deben exponerse con nombre y semántica accesibles.
- Aplicación y persistencia automáticas usando el mecanismo del Grupo A.
- Respetar la opción Sistema como seguimiento de la preferencia del sistema operativo.
- No reducir la elección a un simple interruptor claro/oscuro: se deben conservar los tres modos.

## 9. Guardado híbrido y estados de la interfaz

| Área | Comportamiento |
|---|---|
| Entrenamiento | Edición local hasta pulsar Guardar; validación y persistencia explícitas |
| Datos personales | Edición local hasta pulsar Guardar; validación y persistencia explícitas |
| Mediciones | Conservar el flujo explícito actual para crear/editar/eliminar registros |
| Idioma | Aplicar al seleccionar y persistir automáticamente |
| Tema | Aplicar al seleccionar y persistir automáticamente |

Requisitos transversales:

- Los botones de guardado deben indicar cuándo hay cambios pendientes y evitar envíos duplicados mientras se procesa una petición.
- Durante el guardado, exponer un estado de carga comprensible; al terminar, confirmar éxito con el patrón de la aplicación.
- Si una operación falla, no borrar el formulario ni mostrar un éxito falso.
- Al navegar con cambios pendientes, ofrecer guardar, descartar o seguir editando. La opción por defecto no debe destruir datos sin avisar.
- Para idioma y tema, no añadir un botón Guardar: son preferencias de aplicación de respuesta inmediata.
- Evitar escrituras redundantes si se vuelve a seleccionar la preferencia que ya está activa.

## 10. Contratos funcionales que no deben cambiar

1. **Planificador:** los datos de Perfil y Mediciones no pasan a ser entradas nuevas del planificador como parte de esta tarea.
2. **Semana:** regenerar el plan sigue siendo una acción explícita desde el flujo existente de Semana.
3. **Sesiones protegidas:** no modificar ni reemplazar sesiones completadas o en curso al guardar Perfil.
4. **Persistencia:** conservar identificadores, relaciones, catálogos y reglas de validación existentes.
5. **Historial:** las Mediciones siguen siendo registros históricos, no un único conjunto de campos sobrescribibles.
6. **Cuenta:** mantener el mecanismo seguro actual de cierre de sesión y eliminación de cuenta/datos, incluidas confirmaciones y tratamiento de errores.
7. **Preferencias de app:** reutilizar la persistencia de idioma y tema incorporada en el Grupo A; no crear una segunda fuente de verdad.
8. **Compatibilidad:** la reorganización visual no debe exigir migración de datos. No añadir migraciones ni columnas para funciones no aprobadas.

## 11. Seguridad, privacidad y accesibilidad

- No registrar datos personales o Mediciones en logs de depuración ni exponerlos en mensajes de error.
- Mantener la autorización y el alcance de usuario de las operaciones de lectura, escritura y eliminación existentes.
- No confiar en la interfaz como única barrera de seguridad; conservar las comprobaciones del lado servidor ya existentes.
- Eliminar cuenta/datos debe seguir siendo una acción explícita, con explicación clara de su alcance y confirmación; nunca ejecutarla con un único toque accidental.
- Cerrar sesión debe permanecer separado visual y funcionalmente de eliminar cuenta.
- Usar etiquetas asociadas a los campos, nombres accesibles, foco visible, orden de tabulación lógico, estados de selección anunciables y errores vinculados a sus campos.
- No comunicar estados únicamente mediante color. Mantener objetivos táctiles adecuados y compatibilidad con ampliación/reflow.
- Tras navegar o guardar, gestionar el foco de forma predecible y anunciar los mensajes de estado a tecnologías de asistencia.
- **WCAG AA de contraste de color:** la auditoría completa se aplaza a la fase final de branding, cuando los colores sean definitivos. Esta postergación no aplaza etiquetas, teclado, foco, semántica, lectura por pantalla ni otros requisitos de accesibilidad estructural de esta propuesta.

## 12. Criterios de aceptación

### Perfil y navegación

- [x] Perfil muestra la tarjeta de usuario enlazada a Datos personales y las filas Entrenamiento y Mediciones.
- [ ] La tarjeta no muestra peso, altura ni otras Mediciones.
- [ ] Si no hay nombre, se muestra una alternativa neutra y traducida; no aparece texto roto ni `undefined`.
- [x] La tarjeta y cada fila abren su destino; existe una navegación de vuelta coherente y no se muestra el rótulo repetido «Perfil» en subpantallas.
- [x] Configuración de la app aparece después de Entrenamiento y Mediciones y ocupa menos peso visual que ellas.
- [x] Cerrar sesión aparece al final de Perfil; eliminar cuenta aparece separada al final de Datos personales.

### Entrenamiento y Datos personales

- [x] Se pueden consultar y editar todos los campos existentes de Entrenamiento; Equipamiento y Exclusiones aparecen en secciones separadas.
- [x] Exclusiones empieza plegada, resume el número de ejercicios excluidos y permite retirarlos desde el perfil.
- [x] El detalle del catálogo permite excluir o incluir individualmente un ejercicio para futuros planes.
- [x] Se pueden consultar y editar nombre, objetivo principal y nivel de experiencia. El objetivo secundario no se muestra ni se modifica desde esta pantalla, conforme a la decisión expresa del apartado 6; su dato existente se conserva.
- [ ] El rango de duración de 5–240 minutos se valida en los límites y fuera de ellos.
- [ ] Guardar persiste los valores válidos y muestra confirmación de éxito.
- [ ] Si el guardado falla, las ediciones se conservan y se muestra un error entendible.
- [ ] Cambiar de pantalla con cambios pendientes no los descarta silenciosamente.
- [ ] No se incorporan campos no soportados por el modelo ni catálogos duplicados.

### Mediciones

- [ ] Se puede crear, consultar, editar y eliminar el historial según las capacidades actuales.
- [ ] Cada edición conserva los demás registros históricos.
- [ ] Los errores de validación son visibles y están asociados al campo correspondiente.
- [ ] No se muestran valores corporales en Perfil ni en la fila Mediciones.
- [ ] No se introducen cálculos, objetivos, gráficos ni mensajes que conviertan el registro en una obligación.
- [ ] Operar con Mediciones no cambia el plan semanal ni las sesiones.

### Idioma y tema

- [ ] El selector de idioma muestra ES y EN sin banderas y cambia la interfaz inmediatamente.
- [ ] El idioma elegido persiste automáticamente con el mecanismo existente.
- [x] El tema ofrece Sistema, Claro y Oscuro; cada opción se puede seleccionar y se anuncia de forma accesible.
- [ ] El tema se aplica y persiste automáticamente.
- [ ] Las nuevas cadenas están traducidas a los idiomas admitidos.
- [ ] La selección actual se distingue sin depender únicamente del color.

### Planificador y seguridad

- [ ] Guardar cualquier subpantalla de Perfil no regenera la semana.
- [ ] Guardar Perfil no altera sesiones completadas ni en curso.
- [ ] La regeneración continúa siendo explícita en el flujo existente de Semana.
- [ ] Cerrar sesión mantiene el comportamiento y manejo de errores actuales.
- [ ] Eliminar cuenta/datos conserva el mecanismo seguro y las confirmaciones actuales; no puede activarse accidentalmente.
- [ ] No se han añadido migraciones ni cambios de esquema para esta reorganización.

### Accesibilidad y calidad

- [ ] Se puede recorrer la experiencia con teclado, con foco visible y orden lógico.
- [ ] Los controles tienen etiquetas/nombres accesibles y estados seleccionados comprensibles.
- [ ] Los errores y confirmaciones se anuncian de manera accesible.
- [ ] La interfaz funciona en anchuras móviles y de escritorio sin desbordamientos horizontales.
- [ ] La auditoría completa de contraste WCAG AA queda registrada como pendiente de la fase final de branding, no como condición para cerrar esta fase.
- [ ] Las pruebas existentes siguen pasando y se añaden pruebas para navegación, guardado híbrido, persistencia de preferencias y no-regresión del planificador.

## 13. Plan de pruebas recomendado

Codex debe adaptar este plan al marco de pruebas existente, sin introducir dependencias nuevas salvo aprobación.

1. **Pruebas unitarias:** validaciones de campos, estados de cambios pendientes y mapeo de preferencias.
2. **Pruebas de componentes:** navegación entre Perfil y subpantallas; estado de selección de idioma/tema; errores y confirmaciones.
3. **Pruebas de integración:** persistencia de los formularios y de idioma/tema; recuperación de errores; operaciones históricas de Mediciones.
4. **No-regresión del planificador:** comprobar que guardar perfil, entrenamiento o Mediciones no llama a regeneración ni cambia sesiones completadas/en curso.
5. **Seguridad de cuenta:** verificar que las confirmaciones y el mecanismo existente de eliminación se mantienen sin debilitar permisos.
6. **Accesibilidad estructural:** etiquetas, nombres accesibles, teclado, foco, mensajes de error/estado y navegación.
7. **Verificación manual responsive:** anchuras estrechas y amplias, idioma ES/EN y los tres modos de tema.

## 14. Decisiones cerradas y límites para futuras mejoras

Las decisiones de implementación para este rediseño quedan cerradas así:

1. La tarjeta muestra nombre, resumen breve de objetivo/nivel y un icono animal fijo; no hay selector ni subida de avatar.
2. Los formularios conservan guardado explícito y diálogo de guardar/descartar/seguir editando.
3. Las exclusiones individuales se escriben de inmediato desde el detalle del catálogo y pueden retirarse desde Entrenamiento.
4. No hay exclusiones por grupos en esta fase. Para añadirlas, definir primero una taxonomía explícita (por ejemplo, posición/entorno) y su semántica para el planificador; no inferir grupos incompletos de categoría/equipamiento.
5. No se requieren migraciones para las exclusiones individuales: se reutiliza `excluded_exercises`.

## 15. Fuera de alcance

- Implementar el rediseño en código antes de aprobar esta propuesta.
- Sobrescribir o eliminar el documento original del Grupo B.
- Cambiar el esquema de base de datos o crear migraciones para esta reorganización.
- Añadir avatar subido, fecha de nacimiento, género, ubicación, preferencias de unidades o nuevos campos de perfil.
- Añadir nuevas mediciones, métricas derivadas, gráficos, objetivos corporales o análisis.
- Cambiar el algoritmo del planificador o hacer que las Mediciones afecten al plan.
- Regenerar automáticamente la semana al guardar.
- Rehacer el branding o cerrar la auditoría completa de contraste WCAG AA antes de la fase final de branding.

## 16. Cierre de implementación y seguimiento

La implementación se contrastó con el código existente. El resultado automatizado registrado para el cierre es `npm run typecheck`, `npm test`, `npm run lint` y `npm run build`. Las pruebas de UI cubren el resumen, las secciones, guardado aislado, errores, navegación con cambios pendientes, historial de medidas e idioma. La auditoría completa de contraste WCAG AA y la verificación manual responsive siguen siendo tareas de la fase final de branding.

Para cualquier trabajo adicional sobre esta propuesta:

1. Identificar las rutas exactas del documento original y de `00_PHASE2_OVERVIEW.md`.
2. Citar los archivos y componentes actuales que implementan Perfil, Entrenamiento, Mediciones, preferencias de idioma/tema, cuenta y regeneración de Semana.
3. Marcar cada contrato como **confirmado en código**, **confirmado solo por documentación** o **pendiente de verificar**.
4. Señalar cualquier contradicción entre el código, el documento original y esta propuesta.
5. Solicitar aprobación explícita si la auditoría descubre una decisión que cambie alcance, modelo de datos, seguridad o comportamiento del planificador.

No se han añadido migraciones, dependencias ni cambios de esquema. El documento original del Grupo B permanece intacto.
