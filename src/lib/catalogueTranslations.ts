import type { CatalogueExercise } from '../features/exercises/exerciseData'
import type { Language } from './i18n'

type ExerciseCopy = Pick<CatalogueExercise, 'name' | 'description' | 'instructions'>

// Copy is keyed by stable catalogue slugs. The source rows, relationships and
// workout references stay in Supabase and remain language-neutral.
const esExercises: Record<string, ExerciseCopy> = {
  bodyweight_squat: { name: 'Sentadilla sin peso', description: 'Sentadilla básica para fortalecer piernas y caderas.', instructions: 'Colócate con los pies separados aproximadamente al ancho de los hombros. Lleva las caderas hacia atrás y flexiona las rodillas hasta donde te resulte cómodo. Después, empuja con todo el pie para volver a ponerte de pie.' },
  goblet_squat: { name: 'Sentadilla goblet', description: 'Sentadilla sujetando una pesa cerca del pecho.', instructions: 'Sujeta una mancuerna o una pesa rusa cerca del pecho. Mantén estable el torso, baja las caderas entre los pies y vuelve a subir con suavidad.' },
  split_squat: { name: 'Sentadilla dividida', description: 'Variante de sentadilla estática a una pierna.', instructions: 'Colócate en una posición escalonada que te resulte cómoda. Baja en vertical hasta donde puedas, manteniendo la rodilla delantera alineada con el pie. Empuja con el pie delantero para volver arriba.' },
  reverse_lunge: { name: 'Zancada hacia atrás', description: 'Zancada controlada hacia atrás para piernas y caderas.', instructions: 'Ponte de pie y da un paso hacia atrás. Flexiona ambas rodillas con suavidad y mantén el equilibrio. Empuja con el pie delantero para volver a la posición inicial. Alterna las piernas.' },
  forward_lunge: { name: 'Zancada hacia delante', description: 'Zancada con paso al frente para piernas y caderas.', instructions: 'Da un paso hacia delante hasta una posición cómoda. Baja de forma controlada, evitando que la rodilla delantera se desplace hacia dentro. Empuja para volver a ponerte de pie y alterna las piernas.' },
  romanian_deadlift: { name: 'Peso muerto rumano', description: 'Bisagra de cadera que trabaja la parte posterior de las piernas.', instructions: 'Sujeta las mancuernas o la pesa rusa delante de los muslos. Flexiona ligeramente las rodillas, lleva las caderas hacia atrás y baja el peso junto a las piernas. Vuelve a subir llevando las caderas hacia delante.' },
  single_leg_rdl: { name: 'Peso muerto rumano a una pierna', description: 'Bisagra de cadera con equilibrio sobre una pierna.', instructions: 'Apóyate sobre una pierna con la rodilla relajada. Inclina la cadera mientras llevas la pierna libre hacia atrás y mantienes la espalda larga. Vuelve a erguirte. Si lo necesitas, apóyate en una pared.' },
  glute_bridge: { name: 'Puente de glúteos', description: 'Extensión de cadera en el suelo.', instructions: 'Túmbate boca arriba con las rodillas flexionadas y los pies apoyados. Activa suavemente el abdomen, empuja con los pies para elevar las caderas, haz una pausa y baja despacio.' },
  hip_thrust: { name: 'Empuje de cadera', description: 'Extensión de cadera desde el suelo o un banco estable.', instructions: 'Apoya la parte alta de la espalda en un banco estable o túmbate en el suelo. Mantén las costillas relajadas y empuja con los pies para elevar las caderas. Baja de forma controlada.' },
  calf_raise: { name: 'Elevación de talones', description: 'Elevación sencilla de talones para fortalecer la parte baja de las piernas.', instructions: 'Ponte de pie junto a una pared si necesitas equilibrio. Súbete a las puntas de los pies, haz una breve pausa y baja los talones despacio.' },
  step_up: { name: 'Subida al escalón', description: 'Subida controlada a un escalón bajo y estable.', instructions: 'Colócate frente a un escalón bajo y estable. Apoya todo un pie, sube empujando con esa pierna y baja con cuidado. Alterna la pierna que inicia el movimiento.' },
  wall_sit: { name: 'Sentadilla isométrica en pared', description: 'Isométrico para los muslos y las caderas.', instructions: 'Apoya la espalda en una pared y adelanta los pies. Deslízate hacia abajo solo hasta una altura cómoda, sigue respirando y mantén la posición. Para terminar, ponte de pie.' },
  push_up: { name: 'Flexión', description: 'Empuje con el peso corporal para pecho, hombros y brazos.', instructions: 'Apoya las manos algo más separadas que los hombros. Mantén el cuerpo alineado y cómodo, baja el pecho de forma controlada y empuja el suelo para subir.' },
  incline_push_up: { name: 'Flexión inclinada', description: 'Flexión con las manos sobre una superficie elevada y estable.', instructions: 'Apoya las manos en una pared, una silla firme o un banco. Alinea el cuerpo, flexiona los codos para acercar el pecho a la superficie y empuja para volver.' },
  knee_push_up: { name: 'Flexión con rodillas', description: 'Variante de flexión con las rodillas apoyadas en el suelo.', instructions: 'Apoya las manos algo más separadas que los hombros y las rodillas en el suelo. Mantén una línea recta desde las rodillas hasta la cabeza, baja con control y empuja para subir.' },
  dumbbell_floor_press: { name: 'Press de suelo con mancuernas', description: 'Press de pecho tumbado en el suelo.', instructions: 'Túmbate boca arriba con una mancuerna en cada mano y los codos apoyados suavemente en el suelo. Empuja las pesas sobre el pecho y bájalas hasta tocar el suelo con los codos sin golpearlos.' },
  dumbbell_chest_press: { name: 'Press de pecho con mancuernas', description: 'Press de pecho tumbado en un banco estable.', instructions: 'Túmbate en un banco estable con los pies apoyados. Coloca las pesas junto al pecho, empuja hacia arriba sin bloquear los codos y baja despacio.' },
  dumbbell_shoulder_press: { name: 'Press de hombros con mancuernas', description: 'Press por encima de la cabeza para hombros y brazos.', instructions: 'Siéntate o ponte de pie con mancuernas ligeras a la altura de los hombros. Activa suavemente el tronco y empuja por encima de la cabeza dentro de un recorrido cómodo. Baja despacio.' },
  dumbbell_lateral_raise: { name: 'Elevación lateral con mancuernas', description: 'Ejercicio ligero de hombros elevando los brazos hacia los lados.', instructions: 'Sujeta mancuernas ligeras a los lados con los codos relajados. Eleva los brazos hacia fuera hasta una altura cómoda y bájalos despacio, sin balancearte.' },
  dumbbell_row: { name: 'Remo con mancuerna', description: 'Remo con apoyo para la parte alta de la espalda.', instructions: 'Apoya una mano en un banco o una silla estable e inclina el torso. Lleva la mancuerna hacia la cadera, mantén el hombro relajado y baja despacio.' },
  one_arm_dumbbell_row: { name: 'Remo a una mano con mancuerna', description: 'Remo unilateral para trabajar la espalda y el brazo.', instructions: 'Apoya una mano en una superficie estable. Deja que la pesa cuelgue de la otra mano, lleva el codo hacia la cadera y baja con control.' },
  band_row: { name: 'Remo con banda elástica', description: 'Remo con banda para la parte alta de la espalda y los brazos.', instructions: 'Ancla bien una banda elástica a la altura del pecho. Sujeta un extremo con cada mano, lleva los codos hacia atrás junto al cuerpo y vuelve despacio.' },
  band_pull_apart: { name: 'Separación de banda elástica', description: 'Ejercicio suave con banda para espalda alta y hombros.', instructions: 'Sujeta una banda ligera a la altura del pecho con los codos extendidos pero relajados. Separa las manos juntando suavemente los omóplatos y vuelve con control.' },
  dumbbell_reverse_fly: { name: 'Apertura inversa con mancuernas', description: 'Elevación ligera inclinada para hombros posteriores y espalda alta.', instructions: 'Inclina el torso con la espalda larga y las mancuernas ligeras bajo los hombros. Eleva los brazos hacia los lados con los codos relajados y baja despacio.' },
  plank: { name: 'Plancha', description: 'Isométrico para el tronco, apoyado en las manos o los antebrazos.', instructions: 'Apoya las manos o los antebrazos bajo los hombros. Mantén el cuerpo alineado sin forzar, respira con normalidad y termina antes de que la espalda se hunda.' },
  side_plank: { name: 'Plancha lateral', description: 'Isométrico del tronco de lado.', instructions: 'Túmbate de lado con el codo bajo el hombro y las rodillas flexionadas o las piernas extendidas. Eleva las caderas hasta formar una línea cómoda, respira y cambia de lado.' },
  dead_bug: { name: 'Bicho muerto', description: 'Ejercicio lento de coordinación para controlar el tronco.', instructions: 'Túmbate boca arriba con los brazos elevados y las rodillas flexionadas. Activa suavemente el abdomen, baja un brazo y el talón contrario hacia el suelo, vuelve y cambia de lado.' },
  bird_dog: { name: 'Extensión cruzada', description: 'Ejercicio de equilibrio a cuatro apoyos para el tronco y las caderas.', instructions: 'Colócate a cuatro apoyos. Extiende un brazo hacia delante y la pierna contraria hacia atrás sin girar el tronco. Haz una pausa, vuelve y cambia de lado.' },
  mountain_climber: { name: 'Escalador', description: 'Movimiento de plancha con pasos para el tronco y el acondicionamiento.', instructions: 'Empieza en una plancha alta y estable. Acerca una rodilla al pecho, vuelve y cambia de lado a un ritmo controlado. Da pasos en lugar de saltar para reducir el impacto.' },
  march_in_place: { name: 'Marcha en el sitio', description: 'Marcha suave en interior para aumentar la actividad poco a poco.', instructions: 'Ponte de pie y busca un apoyo cercano si lo necesitas. Marcha a un ritmo cómodo, levantando poco cada pie y moviendo los brazos con naturalidad.' },
  high_knee_march: { name: 'Marcha con rodillas altas', description: 'Marcha animada elevando más las rodillas.', instructions: 'Ponte de pie y alterna la elevación de las rodillas hasta la altura que te resulte cómoda. Mantén el movimiento controlado y bájalas si quieres reducir el esfuerzo.' },
  jumping_jack: { name: 'Salto de tijera', description: 'Movimiento con salto de cuerpo completo para el acondicionamiento cardiovascular.', instructions: 'Empieza de pie con los brazos a los lados. Separa los pies con un salto o un paso mientras elevas los brazos y vuelve al inicio. Usa la versión con paso para reducir el impacto.' },
  low_impact_jack: { name: 'Tijera sin salto', description: 'Versión de salto de tijera con pasos y sin saltar.', instructions: 'Ponte de pie. Da un paso hacia un lado mientras elevas los brazos hasta una altura cómoda. Vuelve al centro y alterna los lados a un ritmo constante.' },
  shadow_boxing: { name: 'Boxeo al aire', description: 'Golpes suaves al aire para moverte y mejorar la coordinación.', instructions: 'Colócate en una posición escalonada cómoda con las rodillas relajadas. Alterna golpes rectos sin bloquear los codos y mantén un ritmo suave o moderado.' },
  step_up_cardio: { name: 'Subida al escalón cardiovascular', description: 'Patrón constante de subida con poco equipamiento para trabajar el acondicionamiento.', instructions: 'Usa un escalón bajo y estable. Sube un pie cada vez y baja con cuidado, alternando la pierna que inicia. Reduce el ritmo cuando lo necesites.' },
  stationary_bike: { name: 'Bicicleta estática', description: 'Pedaleo constante en una bicicleta estática.', instructions: 'Ajusta el sillín para que la rodilla quede ligeramente flexionada al final de la pedalada. Empieza con poca resistencia y un ritmo cómodo y constante.' },
  cat_cow: { name: 'Gato-vaca', description: 'Movimiento suave de la columna a cuatro apoyos.', instructions: 'Colócate a cuatro apoyos. Redondea despacio la espalda al soltar el aire y después alárgala suavemente elevando el pecho al inspirar. Mantén un recorrido cómodo.' },
  thoracic_rotation: { name: 'Rotación torácica', description: 'Rotación suave de la espalda alta con apoyo.', instructions: 'Túmbate de lado con las rodillas flexionadas y los brazos juntos delante. Abre el brazo de arriba, síguelo con la mirada y vuelve despacio. Cambia de lado.' },
  hip_90_90: { name: 'Cambio de cadera 90/90', description: 'Movimiento sentado para la movilidad rotacional de la cadera.', instructions: 'Siéntate con las rodillas flexionadas y los pies separados. Deja caer ambas rodillas suavemente hacia un lado, vuelve al centro y cambia de lado sin forzar el recorrido.' },
  world_greatest_stretch: { name: 'Estiramiento global', description: 'Posición de zancada suave con rotación de la espalda alta.', instructions: 'Da una zancada corta y apoya las manos en el suelo o en una silla. Gira suavemente el pecho hacia la pierna adelantada, vuelve y cambia de lado.' },
  hamstring_stretch: { name: 'Estiramiento de isquiotibiales', description: 'Estiramiento suave de la parte posterior del muslo.', instructions: 'Siéntate erguido con una pierna extendida y la otra flexionada cómodamente. Inclínate un poco desde las caderas hasta notar una tensión suave, mantén y cambia de lado.' },
  hip_flexor_stretch: { name: 'Estiramiento de flexores de cadera', description: 'Estiramiento con apoyo, arrodillado a media altura, para la parte frontal de la cadera.', instructions: 'Colócate en media rodilla con un apoyo cerca. Mete suavemente la pelvis y desplázate un poco hacia delante hasta notar una tensión ligera. Cambia de lado.' },
  child_pose: { name: 'Postura del niño', description: 'Posición cómoda de descanso de rodillas para espalda y caderas.', instructions: 'Arrodíllate sobre una esterilla o superficie blanda y lleva las caderas hacia los talones hasta donde resulte cómodo. Apoya las manos delante o junto al cuerpo y respira con calma.' },
  shoulder_mobility: { name: 'Movilidad de hombros', description: 'Elevación controlada del brazo para mover el hombro cómodamente.', instructions: 'Ponte de pie o siéntate erguido. Eleva lentamente un brazo hacia delante y por encima de la cabeza solo hasta donde sea cómodo. Bájalo y alterna. Relaja el cuello.' },
  walk_easy: { name: 'Paseo suave', description: 'Paseo relajado al aire libre a un ritmo que permita conversar.', instructions: 'Camina por una ruta conocida y llana a un ritmo cómodo. Mantén una zancada natural y da la vuelta cuando lo necesites.' },
  walk_brisk: { name: 'Caminata ligera', description: 'Paseo a buen ritmo que permite seguir hablando.', instructions: 'Camina por una ruta conocida a un ritmo vivo pero manejable. Deberías poder hablar con frases cortas; baja el ritmo cuando lo necesites.' },
  walk_interval: { name: 'Intervalos caminando', description: 'Alternancia de tramos suaves y vivos al aire libre.', instructions: 'En una ruta conocida y llana, alterna un minuto a paso vivo con dos minutos suaves. Repite a un esfuerzo cómodo y termina caminando con calma.' },
}

const esEquipment: Record<string, string> = {
  bodyweight: 'Peso corporal (sin equipamiento)', dumbbells: 'Mancuernas', kettlebell: 'Pesa rusa', resistance_band: 'Banda elástica',
  bench: 'Banco', chair: 'Silla o escalón firme', mat: 'Esterilla', stationary_bike: 'Bicicleta estática', jump_rope: 'Cuerda para saltar',
}

export function localizeExerciseCopy(slug: string, language: Language) {
  return language === 'es' ? esExercises[slug] ?? null : null
}

export function localizeExercise<T extends CatalogueExercise>(exercise: T, language: Language): T {
  if (language !== 'es') return exercise
  const copy = esExercises[exercise.slug]
  if (!copy) {
    if (import.meta.env.DEV) console.error(`Missing es exercise translation: ${exercise.slug}`)
    return exercise
  }
  const name = copy.name
  return {
    ...exercise,
    ...copy,
    equipment: exercise.equipment.map((item) => ({ ...item, name: localizeEquipmentName(item.slug, item.name, language) })),
    media: exercise.media.map((media) => ({
      ...media,
      alt_text: media.media_kind === 'video' || media.media_kind === 'animation'
        ? `Vídeo de instrucciones: ${name}`
        : `Ilustración del ejercicio: ${name}`,
      description: media.description ? `Material complementario para ${name}.` : null,
      caption: media.caption ? `Demostración de ${name}.` : null,
    })),
  }
}

export function localizeEquipmentName(slug: string, english: string, language: Language) {
  return language === 'es' ? esEquipment[slug] ?? english : english
}

export const exerciseTranslationSlugs = Object.keys(esExercises)
