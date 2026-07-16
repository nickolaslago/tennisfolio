import { describe, expect, it } from 'vitest'
import type { ScoredSet } from './types'
import {
  InvalidScoreError,
  computeMatchResult,
  formatScore,
  parseScore,
} from './score'

// These cases mirror apps/api/tests/test_scoring.py — keep the two suites in
// lockstep so both implementations stay verifiably in sync.

describe('parseScore — valid scores', () => {
  it('parses a single set', () => {
    expect(parseScore('6-4')).toEqual<ScoredSet[]>([
      { setNo: 1, gamesWon: 6, gamesLost: 4, tiebreak: false, result: 'Win' },
    ])
  })

  it('parses a single-set loss', () => {
    expect(parseScore('4-6')).toEqual<ScoredSet[]>([
      { setNo: 1, gamesWon: 4, gamesLost: 6, tiebreak: false, result: 'Loss' },
    ])
  })

  it('treats 7-5 as a non-tiebreak set', () => {
    const [set] = parseScore('7-5')
    expect(set.tiebreak).toBe(false)
    expect(set.result).toBe('Win')
  })

  it('treats 7-6 as a tiebreak set', () => {
    const [set] = parseScore('7-6')
    expect(set.tiebreak).toBe(true)
    expect(set.result).toBe('Win')
  })

  it('treats 6-7 as a tiebreak loss', () => {
    const [set] = parseScore('6-7')
    expect(set.tiebreak).toBe(true)
    expect(set.result).toBe('Loss')
  })

  it.each([0, 1, 2, 3, 4])('parses straight six-game set 6-%i', (loser) => {
    const [set] = parseScore(`6-${loser}`)
    expect(set.tiebreak).toBe(false)
    expect(set.result).toBe('Win')
  })

  it('parses a best-of-three with a super-tiebreak decider', () => {
    const sets = parseScore('6-4 3-6 10-7')
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Loss', 'Win'])
    expect(sets.map((s) => s.tiebreak)).toEqual([false, false, true])
    expect(sets.map((s) => s.setNo)).toEqual([1, 2, 3])
  })

  it('parses a best-of-three whose decider is a normal set', () => {
    const sets = parseScore('6-4 4-6 7-5')
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Loss', 'Win'])
    expect(sets.map((s) => s.tiebreak)).toEqual([false, false, false])
  })

  it('accepts a two-set straight-sets win (2-0)', () => {
    const sets = parseScore('6-4 6-3')
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Win'])
    expect(computeMatchResult(sets)).toBe('Win')
  })

  it('accepts a two-set straight-sets loss (0-2)', () => {
    const sets = parseScore('4-6 3-6')
    expect(sets.map((s) => s.result)).toEqual(['Loss', 'Loss'])
    expect(computeMatchResult(sets)).toBe('Loss')
  })

  it('accepts a three-set sweep (best-of-five straight-sets win)', () => {
    const sets = parseScore('6-4 6-3 6-2')
    expect(computeMatchResult(sets)).toBe('Win')
  })

  it('accepts a four-set early clinch (3-1)', () => {
    const sets = parseScore('6-4 3-6 6-3 6-4')
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Loss', 'Win', 'Win'])
    expect(computeMatchResult(sets)).toBe('Win')
  })

  it('accepts a four-set early clinch loss (1-3)', () => {
    const sets = parseScore('6-4 3-6 3-6 4-6')
    expect(computeMatchResult(sets)).toBe('Loss')
  })

  it('parses a five-set match', () => {
    const sets = parseScore('6-4 4-6 6-3 4-6 6-4')
    expect(sets.map((s) => s.result)).toEqual(['Win', 'Loss', 'Win', 'Loss', 'Win'])
    expect(computeMatchResult(sets)).toBe('Win')
  })

  it('parses a five-set match with a super-tiebreak decider', () => {
    const sets = parseScore('6-4 4-6 6-3 4-6 10-8')
    expect(sets[sets.length - 1].tiebreak).toBe(true)
    expect(computeMatchResult(sets)).toBe('Win')
  })

  it('parses a five-set loss', () => {
    const sets = parseScore('6-4 4-6 6-3 4-6 4-6')
    expect(computeMatchResult(sets)).toBe('Loss')
  })

  it('parses a super-tiebreak-only match', () => {
    const [set] = parseScore('10-7')
    expect(set.tiebreak).toBe(true)
    expect(set.result).toBe('Win')
  })

  it.each(['11-9', '12-10', '10-8', '10-0'])(
    'accepts valid super-tiebreak margin %s',
    (token) => {
      const [set] = parseScore(token)
      expect(set.tiebreak).toBe(true)
    },
  )

  it('ignores extra whitespace', () => {
    expect(parseScore('  6-4   3-6   10-7 ')).toEqual(parseScore('6-4 3-6 10-7'))
  })
})

describe('computeMatchResult', () => {
  it('wins the match with a majority of sets', () => {
    expect(computeMatchResult(parseScore('6-4 3-6 10-7'))).toBe('Win')
  })

  it('loses the match with a minority of sets', () => {
    expect(computeMatchResult(parseScore('6-4 3-6 4-6'))).toBe('Loss')
  })
})

describe('round-trip', () => {
  it.each([
    '6-4',
    '4-6',
    '7-5',
    '7-6',
    '10-7',
    '6-4 6-3',
    '6-4 3-6 10-7',
    '6-4 4-6 7-5',
    '6-4 3-6 6-3 6-4',
    '6-4 4-6 6-3 4-6 6-4',
    '6-4 4-6 6-3 4-6 10-8',
  ])('sets → string → sets is lossless for %s', (score) => {
    const sets = parseScore(score)
    expect(formatScore(sets)).toBe(score.trim().split(/\s+/).join(' '))
    expect(parseScore(formatScore(sets))).toEqual(sets)
  })
})

describe('parseScore — rejections', () => {
  it('rejects an empty string', () => {
    expect(() => parseScore('')).toThrow(InvalidScoreError)
    expect(() => parseScore('')).toThrow(/at least one set/)
  })

  it('rejects a whitespace-only string', () => {
    expect(() => parseScore('   ')).toThrow(/at least one set/)
  })

  it('rejects an incomplete two-set match (1-1)', () => {
    expect(() => parseScore('6-4 3-6')).toThrow(/is won by taking/)
  })

  it('rejects an incomplete four-set match (2-2)', () => {
    expect(() => parseScore('6-4 3-6 6-3 3-6')).toThrow(/is won by taking/)
  })

  it('rejects too many sets', () => {
    expect(() => parseScore('6-4 6-3 6-2 6-1 6-0 6-4 6-3')).toThrow(/at most 5 sets/)
  })

  it('rejects a malformed token missing a number', () => {
    expect(() => parseScore('6-')).toThrow(/Invalid set score/)
  })

  it('rejects a non-numeric token', () => {
    expect(() => parseScore('six-four')).toThrow(/Invalid set score/)
  })

  it('rejects a token with too many parts', () => {
    expect(() => parseScore('6-4-2')).toThrow(/Invalid set score/)
  })

  it('rejects a negative first number', () => {
    expect(() => parseScore('-6-4')).toThrow(/negative/)
  })

  it('rejects a negative second number', () => {
    expect(() => parseScore('6--4')).toThrow(/negative/)
  })

  it('rejects a tied set 6-6', () => {
    expect(() => parseScore('6-6')).toThrow(/cannot end level/)
  })

  it('rejects a tied set 0-0', () => {
    expect(() => parseScore('0-0')).toThrow(/cannot end level/)
  })

  it('rejects an impossible set 8-5', () => {
    expect(() => parseScore('8-5')).toThrow(/not a valid set score/)
  })

  it('rejects an impossible set 6-5', () => {
    expect(() => parseScore('6-5')).toThrow(/not a valid set score/)
  })

  it('rejects an advantage set 8-6', () => {
    expect(() => parseScore('8-6')).toThrow(/not a valid set score/)
  })

  it('rejects an impossible set 7-4', () => {
    expect(() => parseScore('7-4')).toThrow(/not a valid set score/)
  })

  it('rejects a super-tiebreak outside the deciding set', () => {
    expect(() => parseScore('10-7 6-4 6-3')).toThrow(/only be the deciding set/)
  })

  it('rejects a super-tiebreak with a one-point margin', () => {
    expect(() => parseScore('10-9')).toThrow(/valid super-tiebreak/)
  })

  it('rejects a super-tiebreak not won by two', () => {
    expect(() => parseScore('12-11')).toThrow(/valid super-tiebreak/)
  })

  it('rejects a score where the winner loses the final set', () => {
    expect(() => parseScore('6-4 6-3 3-6')).toThrow(/must win the final set/)
  })

  it('rejects a winner clinching before the last set', () => {
    expect(() => parseScore('6-4 3-6 6-3 6-4 6-2')).toThrow(/is won by taking/)
  })

  it('rejects a five-set sweep followed by losses', () => {
    expect(() => parseScore('6-4 6-3 6-2 3-6 4-6')).toThrow(/must win the final set/)
  })
})
