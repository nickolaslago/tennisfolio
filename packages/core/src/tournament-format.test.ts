import { describe, expect, it } from 'vitest'
import {
  isTournamentFormat,
  TOURNAMENT_FORMAT_OPTIONS,
  type TournamentFormat,
} from './tournament-format'

describe('TOURNAMENT_FORMAT_OPTIONS', () => {
  it('exposes the named formats in display order', () => {
    expect([...TOURNAMENT_FORMAT_OPTIONS]).toEqual<TournamentFormat[]>([
      'Best of 3',
      'Best of 5',
      '1 Set',
      'Tie Break',
      'Super Tie Break',
    ])
  })

  it('recognises named presets and rejects free-text values', () => {
    expect(isTournamentFormat('Best of 5')).toBe(true)
    expect(isTournamentFormat('Round robin')).toBe(false)
    expect(isTournamentFormat('')).toBe(false)
  })
})
