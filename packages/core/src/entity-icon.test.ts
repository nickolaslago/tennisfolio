import { describe, expect, it } from 'vitest'
import {
  InvalidEntityIconError,
  formatEntityIcon,
  isValidEntityIcon,
  parseEntityIcon,
} from './entity-icon'

// These cases mirror apps/api/tests' icon round-trip coverage — keep the two
// implementations in lockstep.

describe('parseEntityIcon', () => {
  it('returns null for a nullish or empty value', () => {
    expect(parseEntityIcon(null)).toBeNull()
    expect(parseEntityIcon(undefined)).toBeNull()
    expect(parseEntityIcon('')).toBeNull()
  })

  it('parses an emoji encoding', () => {
    expect(parseEntityIcon('emoji:🎾')).toEqual({ kind: 'emoji', emoji: '🎾' })
  })

  it('parses an icon encoding', () => {
    expect(parseEntityIcon('icon:trophy:highlight')).toEqual({
      kind: 'icon',
      name: 'trophy',
      color: 'highlight',
    })
  })

  it('rejects an unknown icon name', () => {
    expect(() => parseEntityIcon('icon:not-a-real-icon:highlight')).toThrow(
      InvalidEntityIconError,
    )
  })

  it('rejects an unknown color token', () => {
    expect(() => parseEntityIcon('icon:trophy:hotpink')).toThrow(InvalidEntityIconError)
  })

  it('rejects an emoji encoding with whitespace', () => {
    expect(() => parseEntityIcon('emoji: 🎾')).toThrow(InvalidEntityIconError)
  })

  it('rejects an empty emoji encoding', () => {
    expect(() => parseEntityIcon('emoji:')).toThrow(InvalidEntityIconError)
  })

  it('rejects a malformed encoding', () => {
    expect(() => parseEntityIcon('trophy')).toThrow(InvalidEntityIconError)
    expect(() => parseEntityIcon('icon:trophy')).toThrow(InvalidEntityIconError)
  })
})

describe('formatEntityIcon', () => {
  it('formats an emoji value', () => {
    expect(formatEntityIcon({ kind: 'emoji', emoji: '🎾' })).toBe('emoji:🎾')
  })

  it('formats an icon value', () => {
    expect(formatEntityIcon({ kind: 'icon', name: 'trophy', color: 'highlight' })).toBe(
      'icon:trophy:highlight',
    )
  })
})

describe('isValidEntityIcon', () => {
  it('returns true for a valid encoding', () => {
    expect(isValidEntityIcon('emoji:🎾')).toBe(true)
    expect(isValidEntityIcon('icon:trophy:highlight')).toBe(true)
  })

  it('returns false for an invalid encoding', () => {
    expect(isValidEntityIcon('nonsense')).toBe(false)
  })
})
