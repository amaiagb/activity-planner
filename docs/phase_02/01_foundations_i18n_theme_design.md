# Grupo A — Fundaciones: i18n, tema y sistema visual

> Leer `00_PHASE2_OVERVIEW.md`. La app usa CSS propio con variables de color y componentes basados en clases; Grupo A está en implementación parcial y los puntos marcados abajo reflejan el código actual.

## A1. Internacionalización es/en

### Estado actual y decisión

La base funcional ya incluye inglés/español para la interfaz y el catálogo sembrado. Inglés sigue siendo el idioma de los perfiles existentes (`language = 'en'`); para perfiles nuevos se detecta el idioma del navegador cuando todavía no hay preferencia local o remota. El cambio de idioma se aplica sin recargar la página.

Decisión de implementación: conservar el contexto React propio (`src/lib/i18n.tsx`) en vez de añadir `i18next`. La app solo admite dos idiomas y el proveedor necesita resolver junto con el idioma una preferencia de tema; mantener el catálogo pequeño evita otra dependencia y centraliza caché, carga remota y fallback. El inglés es el fallback determinista. Para usuarios nuevos se detecta el idioma del navegador; la preferencia local se aplica al arrancar y la del perfil autenticado la sustituye cuando se carga. Sin sesión, los cambios se mantienen en memoria y caché local. Un fallo remoto no revierte el cambio local y se comunica desde Perfil.

### Entregas

1. **Implementado:** migración aditiva `20261009100000_user_display_preferences.sql` para `language` y `theme` en `profiles`, con valores permitidos y defaults `en`/`system`; las columnas existentes se conservan y las filas anteriores reciben esos defaults. Las políticas RLS existentes de perfil limitan la escritura al propietario. La migración está en el repositorio, pendiente de aplicarse en cada entorno.
2. **Implementado:** traducciones de las pantallas activas, navegación, formularios, errores genéricos, estados, accesibilidad, confirmaciones y plantillas de entrenamiento. El proveedor no devuelve claves inexistentes: avisa en desarrollo y muestra el inglés como fallback. No se exponen detalles técnicos de errores remotos en la interfaz.
3. **Implementado:** traducciones españolas de nombre, descripción e instrucciones de los 47 ejercicios semilla en `src/lib/catalogueTranslations.ts`, indexadas por slug estable. Equipamiento y datos descriptivos de movimiento se localizan en la capa de presentación. No se duplican filas ni se alteran IDs, slugs, categorías almacenadas, relaciones o reglas del planificador. El contenido multimedia cargado desde el catálogo conserva atribución y transcript de origen; las etiquetas, alt text y captions generados por la app se localizan.
4. **Implementado:** fechas con `Intl` y locale activo. Se mantienen las unidades métricas actuales (`weight_kg`, medidas en cm); no se añade conversión kg/lb.
5. **Implementado:** prueba que comprueba las claves literales usadas por `t()` y que compara el mapa de traducciones con los slugs del seed. Hay pruebas de cambio de idioma/tema, caché local y persistencia remota fallida. No hay un entorno E2E visual configurado.

### Aceptación

El usuario puede cambiar entre es/en sin recarga; la preferencia autenticada se guarda en perfil y la caché local permite aplicar idioma y tema temprano. Catálogo y UI usan traducción con fallback determinista. Las traducciones no cambian identificadores de dominio ni las reglas del planificador. La verificación del despliegue de la migración por entorno sigue siendo operativa y manual.

## A2. Tema

**Implementado:** «Sistema», «Claro» y «Oscuro» se guardan en la misma migración aditiva, en caché local y en `html[data-theme]`. En Sistema, CSS sigue `prefers-color-scheme`; la opción explícita prevalece sobre la media query. La preferencia local aparece de inmediato y la remota prevalece tras cargar el perfil.

**Implementado parcialmente:** se ampliaron los tokens existentes para texto, superficies, fondo, bordes, foco, colores semánticos, radios, espaciado, sombra y movimiento, y se aplican en los temas claro/oscuro. Se conservan las clases y componentes existentes. Queda pendiente una auditoría formal WCAG AA y una revisión manual de todos los estados en ambos temas; el CSS de Sistema reacciona a cambios de `prefers-color-scheme`.

## A3. Sistema visual

Extender las variables CSS de `src/styles/index.css` para superficies, texto, bordes, foco, estados semánticos, espaciado, radios, sombras y movimiento. Antes de cambiar la paleta global, presentar opciones y aplicar una de ellas en la implementación. Favorecer los patrones ya usados (`card`, `button`, formularios, navegación); extraer componentes solo cuando haya repetición real.

No se requiere crear Accordion, Toast, Skeleton, ProgressRing o componentes sin consumidor. El rediseño se concreta por pantalla, con una CTA principal y evitando rediseño global de golpe. Para confeti/mascota usar CSS/SVG liviano solo si el grupo D aprueba el concepto; respetar movimiento reducido.

## Preguntas por resolver

- Modelo de traducción del catálogo y responsable de mantener las cadenas traducidas.
- Preferencia de paleta y tipografía, si se quiere cambiar la identidad visual actual.
- Confirmar cómo se comporta la app sin sesión durante onboarding y recuperación de sesión.
