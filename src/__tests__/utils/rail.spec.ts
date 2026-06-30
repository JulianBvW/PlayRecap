import { describe, it, expect } from 'vitest'
import { buildRailSubset } from '@/utils/rail'

describe('buildRailSubset', () => {
  it('returns [] for total <= 0', () => {
    expect(buildRailSubset(0)).toEqual([])
    expect(buildRailSubset(-5)).toEqual([])
  })

  it('returns [1] for a single chapter', () => {
    expect(buildRailSubset(1)).toEqual([1])
  })

  it('returns [1, 2] for two chapters', () => {
    expect(buildRailSubset(2)).toEqual([1, 2])
  })

  it('returns the full set when total <= max', () => {
    expect(buildRailSubset(13)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(buildRailSubset(5, 13)).toEqual([1, 2, 3, 4, 5])
  })

  it('always includes 1 and total for large sets', () => {
    const r = buildRailSubset(100)
    expect(r[0]).toBe(1)
    expect(r[r.length - 1]).toBe(100)
  })

  it('contains no duplicates', () => {
    const r = buildRailSubset(100)
    expect(new Set(r).size).toBe(r.length)
  })

  it('is sorted ascending', () => {
    const r = buildRailSubset(100)
    for (let i = 1; i < r.length; i++) {
      expect(r[i]).toBeGreaterThan(r[i - 1]!)
    }
  })

  it('uses approximately round(total / max) as the step between ticks', () => {
    // total=100, max=13 → step = round(100/13) = 8
    const r = buildRailSubset(100, 13)
    // The gap from 1 to the second tick should be ~8
    const gap = r[1]! - r[0]!
    expect(gap).toBeGreaterThanOrEqual(7)
    expect(gap).toBeLessThanOrEqual(9)
  })

  it('handles a book with exactly max chapters', () => {
    // Edge: total === max should return full set, not trigger the step logic
    expect(buildRailSubset(13, 13)).toHaveLength(13)
  })
})
