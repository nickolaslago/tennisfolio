import { describe, expect, it } from 'vitest'
import { sortByLabel } from './sort-options'

describe('sortByLabel', () => {
  it('sorts alphabetically by the derived label', () => {
    const items = [{ label: 'Charlie' }, { label: 'alpha' }, { label: 'Bravo' }]
    expect(sortByLabel(items, (item) => item.label).map((item) => item.label)).toEqual([
      'alpha',
      'Bravo',
      'Charlie',
    ])
  })

  it('compares case-insensitively', () => {
    const items = [{ label: 'zebra' }, { label: 'Apple' }, { label: 'banana' }]
    expect(sortByLabel(items, (item) => item.label).map((item) => item.label)).toEqual([
      'Apple',
      'banana',
      'zebra',
    ])
  })

  it('is locale-aware for accented characters', () => {
    const items = [{ label: 'Émile' }, { label: 'Adam' }, { label: 'Zoë' }]
    expect(sortByLabel(items, (item) => item.label).map((item) => item.label)).toEqual([
      'Adam',
      'Émile',
      'Zoë',
    ])
  })

  it('does not mutate the input array', () => {
    const items = [{ label: 'b' }, { label: 'a' }]
    const result = sortByLabel(items, (item) => item.label)
    expect(items.map((i) => i.label)).toEqual(['b', 'a'])
    expect(result.map((i) => i.label)).toEqual(['a', 'b'])
  })
})
