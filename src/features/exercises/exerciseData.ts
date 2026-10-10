import { supabase } from '../../lib/supabase'
import { localizeExercise } from '../../lib/catalogueTranslations'
import type { Language } from '../../lib/i18n'

export type ExerciseMedia = {
  id: string
  media_kind: 'image' | 'infographic' | 'animation' | 'video'
  storage_path: string
  thumbnail_path: string | null
  captions_path: string | null
  alt_text: string
  description: string | null
  caption: string | null
  transcript: string | null
  source_name: string
  source_url: string | null
  license_name: string
  license_url: string | null
  position: number
  thumbnail_url?: string | null
  media_url?: string | null
  captions_url?: string | null
}

export type CatalogueExercise = {
  id: string
  slug: string
  name: string
  description: string | null
  instructions: string | null
  category: string
  movement_pattern: string | null
  difficulty: string | null
  impact_level: string | null
  is_outdoor: boolean
  muscles: string[]
  equipment: Array<{ group: number; slug: string; name: string }>
  media: ExerciseMedia[]
}

type ExerciseRow = Omit<CatalogueExercise, 'muscles' | 'equipment' | 'media'> & {
  exercise_muscles: Array<{ muscle_group: string }> | null
  exercise_equipment: Array<{ requirement_group: number; equipment: { slug: string; name: string } | null }> | null
  exercise_media: ExerciseMedia[] | null
}

const exerciseSelection = `
  id,slug,name,description,instructions,category,movement_pattern,difficulty,impact_level,is_outdoor,
  exercise_muscles(muscle_group),
  exercise_equipment(requirement_group,equipment:equipment(slug,name)),
  exercise_media(id,media_kind,storage_path,thumbnail_path,captions_path,alt_text,position)
`
const exerciseDetailSelection = exerciseSelection.replace(
  'exercise_media(id,media_kind,storage_path,thumbnail_path,captions_path,alt_text,position)',
  'exercise_media(id,media_kind,storage_path,thumbnail_path,captions_path,alt_text,description,caption,transcript,source_name,source_url,license_name,license_url,position)',
)

function getClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

async function signedMediaUrls(media: ExerciseMedia[], fields: Array<'storage_path' | 'thumbnail_path' | 'captions_path'>, includeVideoFiles = false) {
  const paths = [...new Set(media.flatMap((item) => fields.flatMap((field) => {
    if (!includeVideoFiles && field === 'storage_path' && (item.thumbnail_path || ['video', 'animation'].includes(item.media_kind))) return []
    const path = item[field]
    return path ? [path] : []
  })))]
  if (!paths.length) return new Map<string, string>()
  const { data, error } = await getClient().storage.from('exercise-tutorials').createSignedUrls(paths, 3600)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []))
}

async function withThumbnailUrls(media: ExerciseMedia[]) {
  const thumbnails = await signedMediaUrls(media, ['thumbnail_path', 'storage_path'])
  return media.map((item) => ({
    ...item,
    thumbnail_url: (item.thumbnail_path && thumbnails.get(item.thumbnail_path))
      ?? (['image', 'infographic'].includes(item.media_kind) ? thumbnails.get(item.storage_path) : null)
      ?? null,
  }))
}

function mapExercise(row: ExerciseRow, media: ExerciseMedia[]): CatalogueExercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    category: row.category,
    movement_pattern: row.movement_pattern,
    difficulty: row.difficulty,
    impact_level: row.impact_level,
    is_outdoor: row.is_outdoor,
    muscles: [...new Set((row.exercise_muscles ?? []).map((item) => item.muscle_group))].sort(),
    equipment: (row.exercise_equipment ?? []).flatMap((item) => item.equipment
      ? [{ group: item.requirement_group, slug: item.equipment.slug, name: item.equipment.name }]
      : []).sort((a, b) => a.group - b.group || a.name.localeCompare(b.name)),
    media: [...media].sort((a, b) => a.position - b.position),
  }
}

export async function loadExerciseCatalogue(language: Language = 'en'): Promise<CatalogueExercise[]> {
  const { data, error } = await getClient().from('exercises').select(exerciseSelection).eq('is_active', true).order('name')
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as ExerciseRow[]
  const media = await withThumbnailUrls(rows.flatMap((row) => row.exercise_media ?? []))
  const mediaById = new Map<string, ExerciseMedia[]>()
  for (const item of media) {
    const row = rows.find((exercise) => exercise.exercise_media?.some((candidate) => candidate.id === item.id))
    if (!row) continue
    mediaById.set(row.id, [...(mediaById.get(row.id) ?? []), item])
  }
  return rows.map((row) => localizeExercise(mapExercise(row, mediaById.get(row.id) ?? []), language))
}

export async function loadExerciseDetail(id: string, language: Language = 'en'): Promise<CatalogueExercise | null> {
  const { data, error } = await getClient().from('exercises').select(exerciseDetailSelection).eq('id', id).eq('is_active', true).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as unknown as ExerciseRow
  const media = await withThumbnailUrls(row.exercise_media ?? [])
  const urls = await signedMediaUrls(media, ['storage_path', 'captions_path'], true)
  const signedDetailMedia = media.map((item) => ({
    ...item,
    media_url: urls.get(item.storage_path) ?? null,
    captions_url: item.captions_path ? urls.get(item.captions_path) ?? null : null,
  }))
  return localizeExercise(mapExercise(row, signedDetailMedia), language)
}
