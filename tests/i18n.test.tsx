import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { I18nProvider, hasSpanishTranslation, useI18n } from '../src/lib/i18n'
import { exerciseTranslationSlugs, localizeExerciseCopy } from '../src/lib/catalogueTranslations'

const i18nMocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  from: vi.fn(),
}))
vi.mock('../src/features/auth/useAuth', () => ({ useAuth: () => ({ session: i18nMocks.session }) }))
vi.mock('../src/lib/supabase', () => ({ supabase: { from: i18nMocks.from } }))

function PreferencesControl() {
  const { language, theme, setLanguage, setTheme, t } = useI18n()
  const [error, setError] = useState('')
  return <>
    <span>{t('Today')}</span>
    <span role="alert">{error}</span>
    <select aria-label="Language" value={language} onChange={(event) => void setLanguage(event.target.value as 'en' | 'es').catch((cause: Error) => setError(cause.message))}><option value="en">English</option><option value="es">Spanish</option></select>
    <select aria-label="Theme" value={theme} onChange={(event) => void setTheme(event.target.value as 'system' | 'light' | 'dark').catch((cause: Error) => setError(cause.message))}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
  </>
}

function renderPreferences() {
  return render(<I18nProvider><PreferencesControl /></I18nProvider>)
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.[jt]sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  i18nMocks.session = null
  i18nMocks.from.mockReset()
  delete document.documentElement.dataset.theme
  document.documentElement.lang = 'en'
})

describe('internationalization foundations', () => {
  it('switches language and theme in the UI and persists them locally', async () => {
    renderPreferences()
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'es' } })
    expect(await screen.findByText('Hoy')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'dark' } })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem('activity-planner.language')).toBe('es')
    expect(localStorage.getItem('activity-planner.theme')).toBe('dark')
  })

  it('keeps the selected preference and local cache when remote persistence fails', async () => {
    i18nMocks.session = { user: { id: 'user-1' } }
    i18nMocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) }) }) }),
      insert: async () => ({ error: null }),
    }))
    renderPreferences()
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'es' } })
    expect(await screen.findByText('Hoy')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    expect(localStorage.getItem('activity-planner.language')).toBe('es')
  })

  it('has a Spanish translation for every statically referenced UI key', () => {
    const keys = new Set<string>()
    for (const file of sourceFiles(join(process.cwd(), 'src')).filter((path) => !path.endsWith(join('lib', 'i18n.tsx')))) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length === 1) {
          const argument = node.arguments[0]
          if (ts.isStringLiteral(argument)) keys.add(argument.text)
          if (ts.isNoSubstitutionTemplateLiteral(argument)) keys.add(argument.text)
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
    const missing = [...keys].filter((key) => !hasSpanishTranslation(key))
    expect(missing).toEqual([])
  })

  it('translates every exercise slug seeded by the catalogue migration', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261007100000_exercise_and_workout_catalogue.sql'), 'utf8')
    const exerciseSeed = migration.split('on conflict (slug) do nothing;')[0]
    const seededSlugs = [...exerciseSeed.matchAll(/\('20000000-0000-4000-8000-000000000\d{3}',\s*'([a-z0-9_]+)'/g)].map((match) => match[1])
    expect(seededSlugs).toHaveLength(47)
    expect([...exerciseTranslationSlugs].sort()).toEqual([...seededSlugs].sort())
    for (const slug of seededSlugs) {
      expect(localizeExerciseCopy(slug, 'es')).toMatchObject({ name: expect.any(String), description: expect.any(String), instructions: expect.any(String) })
    }
  })
})
