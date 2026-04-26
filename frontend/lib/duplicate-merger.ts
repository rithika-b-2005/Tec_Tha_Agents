/**
 * Merge duplicate contacts, keeping best version of each field
 */

export interface ContactFieldVersion {
  value: any
  source: string // "leads" | "marketing" | "sales"
  quality: number // 0-100, higher = more complete/reliable
}

export interface DuplicateGroup {
  contactIds: string[]
  primaryId: string // ID of contact to keep
  mergeData: Record<string, any> // Fields to merge into primary
}

/**
 * Score field quality for each source
 */
function scoreFieldQuality(
  value: any,
  source: string,
  fieldName: string
): number {
  if (value === null || value === undefined || value === "") return 0

  let score = 50 // Base score

  // Favor sources by type
  if (source === "sales") score += 15 // Sales has best data quality
  else if (source === "marketing") score += 10
  else if (source === "leads") score += 5

  // Field-specific scoring
  switch (fieldName) {
    case "email":
      // Emails are reliable, boost all sources equally
      if (typeof value === "string" && value.includes("@")) score += 30
      break
    case "phone":
      // Phone numbers are reliable
      if (typeof value === "string" && value.length > 8) score += 25
      break
    case "company":
      // Company name quality varies
      if (typeof value === "string" && value.length > 5) score += 20
      break
    case "icpLabel":
      // Only sales/marketing set this reliably
      if (source === "sales" || source === "marketing") score += 30
      break
    case "score":
      // Higher scores are better, but need context
      if (typeof value === "number" && value > 70) score += 25
      break
    case "needSignals":
      // Longer signals are more informative
      if (typeof value === "string" && value.length > 50) score += 20
      break
  }

  return Math.min(score, 100)
}

/**
 * Pick best version of a field from multiple sources
 */
function pickBestFieldValue(
  versions: ContactFieldVersion[]
): ContactFieldVersion | null {
  if (versions.length === 0) return null

  // Score all versions
  const scored = versions
    .map((v) => ({
      ...v,
      totalQuality: scoreFieldQuality(v.value, v.source, "field"),
    }))
    .filter((v) => v.value !== null && v.value !== undefined && v.value !== "")

  if (scored.length === 0) return null

  // Return highest quality
  return scored.reduce((best, current) =>
    current.totalQuality > best.totalQuality ? current : best
  )
}

/**
 * Merge multiple contacts into one, keeping best version of each field
 */
export function mergeContactsToOne(
  contacts: Array<{
    id: string
    source: string
    email?: string | null
    name?: string | null
    phone?: string | null
    company?: string | null
    website?: string | null
    location?: string | null
    industry?: string | null
    linkedinUrl?: string | null
    score?: number | null
    icpLabel?: string | null
    needSignals?: string | null
    companyBio?: string | null
    emailSubject?: string | null
    emailBody?: string | null
    notes?: string | null
  }>
): DuplicateGroup {
  if (contacts.length === 0) {
    throw new Error("No contacts to merge")
  }

  if (contacts.length === 1) {
    return {
      contactIds: [contacts[0].id],
      primaryId: contacts[0].id,
      mergeData: {},
    }
  }

  // Pick primary contact (highest score, most complete)
  const scored = contacts.map((c) => ({
    ...c,
    completeness: Object.values(c).filter(
      (v) => v !== null && v !== undefined && v !== "" && v !== 0
    ).length,
  }))

  const primaryContact = scored.reduce((best, current) => {
    const bestScore = (best.score || 0) + best.completeness * 5
    const currentScore = (current.score || 0) + current.completeness * 5
    return currentScore > bestScore ? current : best
  })

  // For each field, pick best version
  const fields = [
    "email",
    "name",
    "phone",
    "company",
    "website",
    "location",
    "industry",
    "linkedinUrl",
    "score",
    "icpLabel",
    "needSignals",
    "companyBio",
    "emailSubject",
    "emailBody",
    "notes",
  ]

  const mergeData: Record<string, any> = {}

  fields.forEach((field) => {
    const versions = contacts
      .map((c) => ({
        value: (c as any)[field],
        source: c.source,
        quality: 0,
      }))
      .filter((v) => v.value !== null && v.value !== undefined)

    if (versions.length > 0) {
      const best = pickBestFieldValue(versions)
      if (best && best.value !== (primaryContact as any)[field]) {
        mergeData[field] = best.value
      }
    }
  })

  return {
    contactIds: contacts.map((c) => c.id),
    primaryId: primaryContact.id,
    mergeData,
  }
}
