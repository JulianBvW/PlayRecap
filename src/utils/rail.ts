/**
 * Returns a representative subset of chapter numbers (1-based) for the chapter rail.
 * Step ≈ round(total / max), always includes 1 and total, deduped and sorted.
 */
export function buildRailSubset(total: number, max = 13): number[] {
  if (total <= 0) return []
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1)

  const step = Math.round(total / max)
  const set = new Set<number>([1])

  for (let n = step; n < total; n += step) {
    set.add(n)
  }

  set.add(total)

  return [...set].sort((a, b) => a - b)
}
