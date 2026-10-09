# Grupo B — Perfil reorganizado

> Leer `00_PHASE2_OVERVIEW.md`. La vista actual usa un único formulario con guardado explícito y un gestor separado para medidas.

## Objetivo

Hacer más fácil encontrar y editar los datos existentes sin perder cambios ni cambiar inadvertidamente la generación del plan.

## Campos existentes auditados

- Perfil personal: nombre (opcional), objetivo primario, objetivo secundario (opcional), nivel de forma física.
- Disponibilidad: días de lunes a domingo y duración habitual (5–240 minutos).
- Preferencias: fuerza, cardio, caminar, HIIT, movilidad, disponibilidad exterior y dependencia del clima.
- Equipamiento seleccionado y ejercicios excluidos, ambos de catálogos existentes.
- Mediciones históricas en `body_measurements`: fecha, peso, altura, cintura, pecho, cadera, brazo, muslo y nota. El gestor actual permite gestionar entradas históricas.
- Cerrar sesión y eliminar cuenta/datos ya existen. El borrado usa el mecanismo seguro de servidor; conservar sus confirmaciones.

No existen en el modelo actual fecha de nacimiento, género, avatar, lugar habitual, exclusiones por grupos/movimientos, unidades configurables ni métricas derivadas. No añadirlos como parte del simple rediseño. Los objetivos y las medidas son informativos y no deben alterar el planificador.

## Estructura propuesta

Organizar visualmente en hasta cuatro secciones plegables: «Sobre ti» (nombre, objetivos, nivel), «Disponibilidad y preferencias» (días, duración, preferencias, exterior), «Equipamiento y exclusiones» y «Mediciones». Preferencias de idioma y tema se incorporan cuando Grupo A las persista. Cerrar sesión y eliminar cuenta permanecen al final, claramente separados.

En móvil se puede abrir una sección cada vez, pero no ocultar errores de validación ni cambios sin guardar. Mantener los controles accesibles y los campos de catálogo actuales; el buscador de exclusiones es una mejora opcional si el volumen del catálogo lo justifica.

## Guardado y efecto en el plan

Conservar botón explícito «Guardar perfil», que ya es el patrón existente. Mostrar estado de guardado/error. Al cambiar preferencias no regenerar inmediatamente ni silenciosamente la semana: Week ofrece hoy regeneración explícita y protege sesiones completadas/en curso. Aclarar al usuario que el plan vigente no cambiará hasta regenerarlo; decidir si la regeneración se ofrecerá con una acción posterior claramente confirmada.

La carga inicial, navegación entre secciones y pliegue no deben descartar modificaciones. No hace falta una migración de datos para reordenar la UI; las únicas columnas nuevas previstas son `language` y `theme` del Grupo A.

## Criterios de aceptación

- Todos los campos actuales siguen editables, incluidas exclusiones y disponibilidad exterior.
- Las mediciones siguen siendo históricas, separadas de la generación de entrenamientos.
- Guardado explícito, validaciones y controles de borrado mantienen su comportamiento seguro.
- Diseño plegable usable por teclado/lector de pantalla, con estado `aria-expanded` y errores asociados a campos.
- Guardar cambios de perfil no modifica sesiones completadas ni cambia el plan sin una acción visible del usuario.

## Pendientes

- Determinar si conviene mantener el gestor de medidas en una sección de la misma página o como panel separado; preservar su contrato funcional.
- Decidir si el plan vigente se regenera manualmente desde Week o mediante una CTA de confirmación tras guardar cambios que afecten al plan.
