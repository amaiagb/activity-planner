# Grupo A — Fundaciones: i18n, tema y sistema visual

> Leer `00_PHASE2_OVERVIEW.md`. La app ya tiene CSS propio con variables de color, componentes basados en clases y tema automático por `prefers-color-scheme`; no hay librería de UI ni i18n.

## A1. Internacionalización es/en

### Estado actual y decisión

La interfaz está escrita en inglés, también los datos visibles de ejercicios, equipamiento y plantillas. No hay `language` en el esquema del perfil ni caché de idioma. Mantener inglés como idioma inicial para usuarios existentes. Detectar idioma del navegador solo para usuarios nuevos; admitir castellano e inglés y usar inglés como fallback. El cambio no debe depender de recargar la página.

Elegir una librería compatible con React y Vite (recomendación: `i18next` + `react-i18next`) antes de añadirla; justificar el peso y configurar detección/fallback. Persistir la elección del usuario autenticado en perfil mediante migración aditiva y cachear la última selección localmente para evitar destellos. Definir qué ocurre en modo anónimo/login y ante caché local obsoleta.

### Entregas

1. Migración aditiva para idioma opcional en `profiles`; validar valor y conservar `en` para filas existentes. La persistencia local no sustituye al valor remoto.
2. Extraer los textos de la aplicación por pantallas; traducir también errores, estados vacíos, formularios, navegación, accesibilidad y confirmaciones. Añadir las claves nuevas en ambos idiomas en la misma entrega.
3. Traducir contenido de catálogo en un incremento separado. Actualmente `exercises.name/description/instructions`, `equipment.name` y `workout_templates.name/description` son campos únicos en inglés. Añadir tabla de traducciones por entidad/idioma o columnas localizadas solo tras elegir y documentar el modelo, claves estables, fallback y forma de mantener seeds. No duplicar filas de ejercicios ni traducir slugs/categorías persistidos.
4. Formatear fechas con `Intl` y el locale seleccionado. Unidades actuales de mediciones son métricas (`weight_kg`, medidas en cm); no añadir conversión kg/lb sin alcance separado.
5. Añadir comprobación automatizada de claves de recursos y cobertura de render de pantallas críticas.

### Aceptación

El usuario puede cambiar entre es/en sin recarga; la preferencia autenticada sobrevive a otras sesiones y la caché local permite aplicar el idioma temprano. Catálogo y UI usan traducción con fallback determinista. Las traducciones no cambian identificadores de dominio ni las reglas del planificador.

## A2. Tema

El tema actual es automático mediante media query, sin opción manual ni persistencia. Mantener ese comportamiento como opción «Sistema» y añadir «Claro» y «Oscuro». Añadir preferencia `theme` opcional al perfil en migración aditiva, caché local y aplicación temprana mediante atributo/clase en `html`. Definir resolución de conflictos entre remoto y caché (remoto prevalece tras cargar perfil).

Auditar colores CSS existentes (incluidos botones, estados, bordes y foco) para migrarlos a tokens; no reemplazar el CSS completo ni introducir un framework visual. Revisar contraste AA de pantallas y gráficos/iconos existentes en ambos temas. Probar el cambio del sistema cuando la opción seleccionada sea «Sistema» y `prefers-reduced-motion`.

## A3. Sistema visual

Extender las variables CSS de `src/styles/index.css` para superficies, texto, bordes, foco, estados semánticos, espaciado, radios, sombras y movimiento. Antes de cambiar la paleta global, presentar opciones y aplicar una de ellas en la implementación. Favorecer los patrones ya usados (`card`, `button`, formularios, navegación); extraer componentes solo cuando haya repetición real.

No se requiere crear Accordion, Toast, Skeleton, ProgressRing o componentes sin consumidor. El rediseño se concreta por pantalla, con una CTA principal y evitando rediseño global de golpe. Para confeti/mascota usar CSS/SVG liviano solo si el grupo D aprueba el concepto; respetar movimiento reducido.

## Preguntas por resolver

- Modelo de traducción del catálogo y responsable de mantener las cadenas traducidas.
- Preferencia de paleta y tipografía, si se quiere cambiar la identidad visual actual.
- Confirmar cómo se comporta la app sin sesión durante onboarding y recuperación de sesión.
