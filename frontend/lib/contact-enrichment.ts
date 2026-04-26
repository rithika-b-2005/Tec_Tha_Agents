/**
 * Enrich contact data via Hunter.io API
 * Find missing emails, phones, and social profiles
 */

const HUNTER_API_KEY = process.env.HUNTER_API_KEY || ""

export interface HunterPerson {
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  linkedinUrl: string | null
}

/**
 * Find email for a person at a company
 */
export async function findEmailByName(
  firstName: string,
  lastName: string,
  companyDomain: string
): Promise<string | null> {
  if (!HUNTER_API_KEY) return null

  try {
    const url = new URL("https://api.hunter.io/v2/email-finder")
    url.searchParams.append("domain", companyDomain)
    url.searchParams.append("first_name", firstName)
    url.searchParams.append("last_name", lastName)
    url.searchParams.append("api_key", HUNTER_API_KEY)

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = await res.json()
    return data.data?.email || null
  } catch (err) {
    console.error("[enrichment] findEmailByName error:", err)
    return null
  }
}

/**
 * Find all people and emails for a company domain
 */
export async function findCompanyEmails(
  companyDomain: string
): Promise<HunterPerson[]> {
  if (!HUNTER_API_KEY) return []

  try {
    const url = new URL("https://api.hunter.io/v2/domain-search")
    url.searchParams.append("domain", companyDomain)
    url.searchParams.append("api_key", HUNTER_API_KEY)

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const data = await res.json()
    return (
      data.data?.emails?.map((e: any) => ({
        email: e.value,
        phone: null,
        firstName: e.first_name,
        lastName: e.last_name,
        title: e.position,
        linkedinUrl: null,
      })) || []
    )
  } catch (err) {
    console.error("[enrichment] findCompanyEmails error:", err)
    return []
  }
}

/**
 * Extract domain from email or URL
 */
export function extractDomain(emailOrUrl: string): string | null {
  try {
    if (emailOrUrl.includes("@")) {
      return emailOrUrl.split("@")[1]
    }
    if (emailOrUrl.includes("//")) {
      const url = new URL(emailOrUrl)
      return url.hostname.replace("www.", "")
    }
    return emailOrUrl.replace("www.", "")
  } catch {
    return null
  }
}
