export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

export function isDuplicateTitle(
  title: string,
  existingTitles: Iterable<string>,
): boolean {
  const normalized = normalizeTitle(title)
  if (!normalized) return false
  for (const other of existingTitles) {
    if (normalizeTitle(other) === normalized) return true
  }
  return false
}

export function uniqueTitles(...groups: Array<Iterable<string>>): string[] {
  const seen = new Set<string>()
  const titles: string[] = []
  for (const group of groups) {
    for (const title of group) {
      const key = normalizeTitle(title)
      if (!key || seen.has(key)) continue
      seen.add(key)
      titles.push(title)
    }
  }
  return titles
}
