import { describe, expect, it } from 'vitest'
import { computeMatchResult, formatScore, parseScore } from './score'

describe('parseScore', () => {
  it('parses a single set', () => {
    const sets = parseScore('6-4')
    expect(sets).toEqual([
      { setNo: 1, gamesWon: 6, gamesLost: 4, tiebreak: false, result: 'Win' },
    ])
  })

  it('parses a best-of-three score with a match tiebreak', () => {
    const sets = parseScore('6-4 3-6 10-7')
    expect(sets).toHaveLength(3)
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Loss', 'Win'])
  })

  it('rejects malformed tokens', () => {
    expect(() => parseScore('6-')).toThrow()
    expect(() => parseScore('')).toThrow()
  })
})

describe('computeMatchResult', () => {
  it('wins the match when set wins are a majority', () => {
    const sets = parseScore('6-4 3-6 10-7')
    expect(computeMatchResult(sets)).toBe('Win')
  })
})

describe('formatScore', () => {
  it('round-trips a parsed score back to its display string', () => {
    const sets = parseScore('6-4 3-6 10-7')
    expect(formatScore(sets)).toBe('6-4 3-6 10-7')
  })
})
