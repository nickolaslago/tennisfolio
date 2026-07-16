import { describe, expect, it } from 'vitest'
import { SCORE_FORMAT_OPTIONS, type ScoreFormat } from './score-format'

describe('SCORE_FORMAT_OPTIONS', () => {
  it('exposes the scoring types in display order', () => {
    expect(SCORE_FORMAT_OPTIONS.map((o) => o.value)).toEqual<ScoreFormat[]>([
      'one-set',
      'three-sets',
      'five-sets',
      'tiebreak',
      'super-tiebreak',
      'custom',
    ])
    expect(SCORE_FORMAT_OPTIONS.map((o) => o.label)).toEqual([
      '1 Set',
      '3 Sets',
      '5 Sets',
      'Tie Break',
      'Super Tie Break',
      'Custom',
    ])
  })

  it('collects one games pair per set for the sets formats', () => {
    const sets = SCORE_FORMAT_OPTIONS.filter((o) => o.kind === 'sets')
    expect(sets.map((o) => o.pairs)).toEqual([1, 3, 5])
  })

  it('collects a single points pair for the points formats', () => {
    const points = SCORE_FORMAT_OPTIONS.filter((o) => o.kind === 'points')
    expect(points.map((o) => o.value)).toEqual(['tiebreak', 'super-tiebreak', 'custom'])
    expect(points.every((o) => o.pairs === 1)).toBe(true)
  })
})
