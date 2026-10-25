import { describe, expect, it } from 'vitest'
import { applySeriesAction, canFinishWorkout, hydrateWorkoutSeries } from '../src/features/planner/workoutSeries'

const exercises = [
  { id: 'a', position: 1, status: 'planned' as const },
  { id: 'b', position: 2, status: 'planned' as const },
]

function action(state: ReturnType<typeof hydrateWorkoutSeries>, type: 'done' | 'skipped' | 'undo', id: string) {
  return applySeriesAction(state, { type, exerciseSessionId: id }, exercises)
}

describe('workout series state', () => {
  it('persists done in series 1', () => {
    const result = action(hydrateWorkoutSeries(0, 2, exercises), 'done', 'a')
    expect(result.state.persisted.a).toBe('done')
    expect(result.operations).toEqual([{ type: 'exercise_status', exerciseSessionId: 'a', status: 'done' }])
  })

  it('increments completed sets and resets visually without planned writes', () => {
    let state = hydrateWorkoutSeries(0, 2, exercises)
    state = action(state, 'done', 'a').state
    const result = action(state, 'skipped', 'b')
    expect(result.state.completedSets).toBe(1)
    expect(Object.values(result.state.current)).toEqual(['planned', 'planned'])
    expect(result.operations).toContainEqual({ type: 'completed_sets', value: 1 })
    expect(result.operations).not.toContainEqual(expect.objectContaining({ type: 'exercise_status', status: 'planned' }))
  })

  it('undoes series 2 without deleting a done from series 1', () => {
    const state = hydrateWorkoutSeries(1, 2, [{ ...exercises[0], status: 'done' }, exercises[1]])
    const result = action(state, 'done', 'b')
    expect(result.state.persisted.a).toBe('done')
    expect(result.state.persisted.b).toBe('done')
    const undone = action(result.state, 'undo', 'b')
    expect(undone.state.current.b).toBe('planned')
    expect(undone.state.persisted.a).toBe('done')
    expect(undone.state.persisted.b).toBe('planned')
    expect(undone.operations).toContainEqual({ type: 'exercise_status', exerciseSessionId: 'b', status: 'planned' })
  })

  it('does not overwrite a done with skipped in a later series', () => {
    let state = hydrateWorkoutSeries(0, 2, exercises)
    state = action(state, 'done', 'a').state
    state = action(state, 'skipped', 'b').state
    const result = action(state, 'skipped', 'a')
    expect(result.state.persisted.a).toBe('done')
    expect(result.operations).not.toContainEqual({ type: 'exercise_status', exerciseSessionId: 'a', status: 'skipped' })
  })

  it('does not advance a series when every exercise is skipped', () => {
    let state = hydrateWorkoutSeries(0, 2, exercises)
    state = action(state, 'skipped', 'a').state
    const result = action(state, 'skipped', 'b')
    expect(result.state.completedSets).toBe(0)
    expect(result.state.notice).toBeNull()
  })

  it('enables finish for persisted done or current done, but not skips only', () => {
    let state = hydrateWorkoutSeries(0, 2, exercises)
    expect(canFinishWorkout(state)).toBe(false)
    state = action(state, 'skipped', 'a').state
    expect(canFinishWorkout(state)).toBe(false)
    state = action(state, 'done', 'b').state
    expect(canFinishWorkout(state)).toBe(true)
    const hydrated = hydrateWorkoutSeries(1, 2, [{ ...exercises[0], status: 'done' }, exercises[1]])
    expect(canFinishWorkout(hydrated)).toBe(true)
  })

  it('hydrates current series from persisted state only before the first completed series', () => {
    const initial = hydrateWorkoutSeries(0, 2, [{ ...exercises[0], status: 'done' }, exercises[1]])
    expect(initial.current.a).toBe('done')
    const next = hydrateWorkoutSeries(1, 2, [{ ...exercises[0], status: 'done' }, { ...exercises[1], status: 'skipped' }])
    expect(next.current).toEqual({ a: 'planned', b: 'planned' })
    expect(next.seriesStartStatus).toEqual({ a: 'done', b: 'skipped' })
  })

  it('does not reset at plannedSets, then Add another series starts one more', () => {
    let state = hydrateWorkoutSeries(0, 2, exercises)
    state = action(state, 'done', 'a').state
    state = action(state, 'skipped', 'b').state
    state = action(state, 'done', 'a').state
    const result = action(state, 'skipped', 'b')
    expect(result.state.completedSets).toBe(2)
    expect(result.state.finalized).toBe(true)
    expect(result.state.current).toEqual({ a: 'done', b: 'skipped' })
    const added = applySeriesAction(result.state, { type: 'add_series' }, exercises)
    expect(added.state.finalized).toBe(false)
    expect(added.state.visibleSeriesCount).toBe(3)
    expect(added.state.current).toEqual({ a: 'planned', b: 'planned' })
  })

  it('hydrates finalized sessions when completed_sets reaches plannedSets', () => {
    const state = hydrateWorkoutSeries(3, 3, [{ ...exercises[0], status: 'done' }, { ...exercises[1], status: 'skipped' }])
    expect(state.finalized).toBe(true)
    expect(state.current).toEqual({ a: 'done', b: 'skipped' })
    expect(canFinishWorkout(state)).toBe(true)
  })
})

