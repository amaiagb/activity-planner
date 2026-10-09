# Fase 2 — Visión general y objetivos

> Contexto para los siguientes incrementos post-MVP. Antes de implementar cada grupo, comprobar el código y las migraciones actuales; este roadmap no sustituye al estado real del producto.

## Estado de partida verificado (9 oct 2026)

- Frontend: React 19, TypeScript, Vite, React Router 7 y CSS propio sobre Tailwind; no hay biblioteca de componentes ni librería i18n instalada.
- Backend: Supabase Auth/PostgreSQL con RLS. Las migraciones definen perfil, disponibilidad, preferencias, equipamiento, exclusiones, ejercicios, plantillas, planes semanales, sesiones y mediciones históricas.
- Navegación actual: Today, Week, Exercises, History y Profile. La aplicación y el catálogo están en inglés; los nombres/descripciones de ejercicios y plantillas también son texto inglés en la BD.
- El planificador es TypeScript determinista y trabaja con plantillas y catálogo local cargado de Supabase. Ya existe regeneración de un día y de la semana; regenerar el día sustituye el planificado, conserva sesiones completadas y respeta equipamiento, entorno, nivel y exclusiones. No hay filtros puntuales ni restauración del plan original.
- Today ya ofrece «Change today's workout» en un toque. No es aún un modal de configuración. Workout persiste inicio, estado por ejercicio y finalización.
- Profile contiene nombre, objetivos informativos, nivel, días, duración habitual, preferencias de actividad, acceso exterior, equipamiento y ejercicios excluidos. El guardado es explícito; las mediciones se gestionan aparte y son históricas.
- History tiene resúmenes semanales/mensuales, sesiones recientes y una racha básica calculada en cliente. La racha actual cuenta fechas planificadas completadas consecutivas; no tiene mejor racha, mascota, puntos ni recompensas.
- CSS ya usa algunas variables, soporta claro y oscuro según el sistema operativo, y la navegación inferior tiene cinco destinos. No existe selector ni preferencia persistida de tema.

Estas observaciones describen el checkout revisado; verificar diferencias con test/prod antes de migrar datos o asumir que una migración se ha aplicado.

## Objetivo

Hacer la plataforma más cómoda y motivadora conservando su flujo sencillo y el planificador determinista. Mantener el MVP desplegado compatible y entregar mejoras en incrementos pequeños.

## Principios

- Mobile-first, controles táctiles cómodos, contraste accesible y respeto a `prefers-reduced-motion`.
- Reutilizar el planificador puro, las tablas existentes, las vistas y los estilos actuales.
- No introducir IA ni depender de nuevos atributos que el catálogo no tenga.
- Migraciones aditivas, con RLS y estrategia de vuelta atrás/documentación. No asumir que cambiar datos JSON de un plan equivale a un historial auditable.
- Los cambios del perfil conservan el guardado explícito hasta que se decida e implemente una estrategia segura de autoguardado.
- Los textos visibles nuevos se localizan desde el primer incremento de i18n; la extracción completa se planifica por pantallas para mantener cambios revisables.

## Grupos propuestos

| Orden | Grupo | Alcance revisado |
|---|---|---|
| A | Fundaciones | i18n gradual, selector y persistencia; tema manual/sistema; ampliar los tokens CSS existentes y documentar componentes reutilizables. |
| B | Perfil | Reorganizar los campos que realmente existen; mantener guardado explícito y no regenerar planes automáticamente al guardar preferencias. |
| C | Cambio de hoy | Evolucionar el actual botón en una configuración opcional; reutilizar el generador determinista y añadir persistencia/restauración solo si se resuelve el modelo de datos. |
| D | History | Mejorar la racha y añadir progresivamente motivación. Mascota, puntos y recompensas requieren decisiones de producto y persistencia idempotente antes de su implementación. |

A precede a los demás para que los textos nuevos se traduzcan y los patrones visuales se reutilicen. B, C y D no deben asumir que todas las capacidades de A ya existen si su trabajo se divide en entregas.

## Fuera del alcance inicial

IA/LLM, notificaciones push, funciones sociales, tienda/cosméticos extensos, vidas para congelar rachas, nuevos idiomas y nuevos filtros de entrenamiento que no se puedan derivar del catálogo actual.

## Definición de hecho de Fase 2

Cada grupo documenta lo que efectivamente se entregó, las migraciones requeridas y su estado de despliegue, las limitaciones conocidas y las decisiones pendientes. No declarar completa una traducción, persistencia o migración por estar descrita en este roadmap.
