/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length
  const matrix: number[][] = []

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[bLen][aLen]
}

/**
 * Similarity score 0-1 based on Levenshtein distance
 */
export function similarity(a: string, b: string): number {
  const dist = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 1 : 1 - dist / maxLen
}

/**
 * Check if two company names are likely the same (fuzzy match)
 * Returns true if similarity > threshold
 */
export function areSimilarCompanies(
  nameA: string | null | undefined,
  nameB: string | null | undefined,
  threshold = 0.85
): boolean {
  if (!nameA || !nameB) return false
  return similarity(nameA, nameB) > threshold
}

/**
 * Check if two contacts are likely the same person
 * Uses email (primary), then fuzzy company name + location (secondary)
 */
export function areContactsDuplicates(
  contact1: {
    email?: string | null
    name?: string | null
    company?: string | null
    location?: string | null
  },
  contact2: {
    email?: string | null
    name?: string | null
    company?: string | null
    location?: string | null
  }
): boolean {
  // Exact email match = duplicate
  if (contact1.email && contact2.email && contact1.email === contact2.email) {
    return true
  }

  // Fuzzy company + exact location = duplicate
  if (
    contact1.company &&
    contact2.company &&
    contact1.location &&
    contact2.location &&
    contact1.location === contact2.location
  ) {
    if (areSimilarCompanies(contact1.company, contact2.company)) {
      return true
    }
  }

  return false
}
