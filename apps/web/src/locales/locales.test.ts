import { describe, expect, it } from 'vitest'
import en from './en.json'
import pt from './pt.json'
import de from './de.json'
import fr from './fr.json'
import it_ from './it.json'
import nl from './nl.json'

function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix]
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

const locales: Record<string, unknown> = { pt, de, fr, it: it_, nl }
const englishKeys = collectKeyPaths(en).sort()

describe('locale key parity', () => {
  for (const [name, resource] of Object.entries(locales)) {
    it(`${name}.json has the exact key set of en.json`, () => {
      const keys = collectKeyPaths(resource).sort()
      const missing = englishKeys.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !englishKeys.includes(key))
      expect(missing, `missing keys in ${name}.json`).toEqual([])
      expect(extra, `extra keys in ${name}.json`).toEqual([])
    })
  }
})
