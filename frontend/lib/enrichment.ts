/**
 * Waterfall Enrichment System
 *
 * Tries multiple free APIs in order. If one hits rate limit or fails,
 * auto-falls back to the next provider.
 *
 * Order: Hunter.io → Apollo.io → Snov.io → Clearbit → PDL
 * Email verify: ZeroBounce → Abstract API
 */

// ── API Keys from env ──
const HUNTER_KEY    = process.env.HUNTER_API_KEY    || ""
const APOLLO_KEY    = process.env.APOLLO_API_KEY    || ""
const SNOV_ID       = process.env.SNOV_CLIENT_ID    || ""
const SNOV_SECRET   = process.env.SNOV_CLIENT_SECRET || ""
const CLEARBIT_KEY  = process.env.CLEARBIT_API_KEY  || ""
const PDL_KEY       = process.env.PDL_API_KEY       || ""
const ZEROBOUNCE_KEY = process.env.ZEROBOUNCE_API_KEY || ""
const ABSTRACT_KEY  = process.env.ABSTRACT_API_KEY  || ""

export interface EnrichedContact {
  email:        string | null
  phone:        string | null
  linkedinUrl:  string | null
  title:        string | null
  companySize:  string | null
  revenue:      string | null
  industry:     string | null
  techStack:    string[] | null
  source:       string
}

// ── Hunter.io — find email from domain ──
async function hunterEnrich(domain: string, name?: string): Promise<EnrichedContact | null> {
  if (!HUNTER_KEY || !domain) return null
  try {
    // Try domain search first
    const url = name
      ? `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&full_name=${encodeURIComponent(name)}&api_key=${HUNTER_KEY}`
      : `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=1&api_key=${HUNTER_KEY}`

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      console.log(`[enrichment] Hunter.io returned ${res.status}`)
      return null
    }
    const json = await res.json()

    if (name && json.data?.email) {
      return {
        email:       json.data.email,
        phone:       null,
        linkedinUrl: json.data.linkedin_url || null,
        title:       json.data.position || null,
        companySize: null,
        revenue:     null,
        industry:    null,
        techStack:   null,
        source:      "hunter.io",
      }
    }

    // Domain search — get first email
    const emails = json.data?.emails || []
    if (emails.length > 0) {
      const best = emails[0]
      return {
        email:       best.value || null,
        phone:       best.phone_number || null,
        linkedinUrl: best.linkedin || null,
        title:       best.position || null,
        companySize: null,
        revenue:     null,
        industry:    null,
        techStack:   null,
        source:      "hunter.io",
      }
    }
    return null
  } catch (e) {
    console.error("[enrichment] Hunter.io error:", e instanceof Error ? e.message : e)
    return null
  }
}

// ── Apollo.io — People Match API + Organization Search ──
async function apolloEnrich(domain: string, name?: string): Promise<EnrichedContact | null> {
  if (!APOLLO_KEY) return null
  try {
    // Try People Match first (by organization name or domain)
    const matchBody: Record<string, unknown> = {
      reveal_personal_emails: false,
      reveal_phone_number: true,
    }
    if (domain) matchBody.organization_domain = domain
    if (name) matchBody.organization_name = name

    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_KEY,
      },
      body: JSON.stringify(matchBody),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.log(`[enrichment] Apollo People Match returned ${res.status}`)
      // Fallback: try organization search
      return apolloOrgSearch(domain, name)
    }

    const json = await res.json()
    const person = json.person
    const org = person?.organization
    const contact = person?.contact

    if (!person && !org) return apolloOrgSearch(domain, name)

    // Extract phone from contact.phone_numbers
    const phone = contact?.phone_numbers?.[0]?.sanitized_number
      || contact?.sanitized_phone
      || null

    return {
      email:       person?.email || contact?.email || null,
      phone,
      linkedinUrl: person?.linkedin_url || null,
      title:       person?.title || null,
      companySize: org?.estimated_num_employees
        ? `${org.estimated_num_employees} employees`
        : null,
      revenue:     org?.annual_revenue_printed || null,
      industry:    org?.industry || null,
      techStack:   org?.technology_names?.slice(0, 5) || null,
      source:      "apollo.io",
    }
  } catch (e) {
    console.error("[enrichment] Apollo error:", e instanceof Error ? e.message : e)
    return null
  }
}

// Apollo fallback — search organizations directly
async function apolloOrgSearch(domain: string, name?: string): Promise<EnrichedContact | null> {
  if (!APOLLO_KEY) return null
  try {
    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_KEY,
      },
      body: JSON.stringify({
        q_organization_domains: domain ? [domain] : undefined,
        q_organization_name: name || undefined,
        page: 1,
        per_page: 1,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return null
    const json = await res.json()
    const person = json.people?.[0]
    const org = person?.organization

    if (!person && !org) return null

    return {
      email:       person?.email || null,
      phone:       person?.phone_numbers?.[0]?.sanitized_number || null,
      linkedinUrl: person?.linkedin_url || null,
      title:       person?.title || null,
      companySize: org?.estimated_num_employees
        ? `${org.estimated_num_employees} employees`
        : null,
      revenue:     org?.annual_revenue_printed || null,
      industry:    org?.industry || null,
      techStack:   org?.technology_names?.slice(0, 5) || null,
      source:      "apollo.io",
    }
  } catch (e) {
    console.error("[enrichment] Apollo org search error:", e instanceof Error ? e.message : e)
    return null
  }
}

// ── Snov.io — find email ──
let snovToken: string | null = null
let snovTokenExpiry = 0

async function getSnovToken(): Promise<string | null> {
  if (!SNOV_ID || !SNOV_SECRET) return null
  if (snovToken && Date.now() < snovTokenExpiry) return snovToken
  try {
    const res = await fetch("https://api.snov.io/v1/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: SNOV_ID, client_secret: SNOV_SECRET }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const json = await res.json()
    snovToken = json.access_token
    snovTokenExpiry = Date.now() + (json.expires_in || 3600) * 1000 - 60000
    return snovToken
  } catch {
    return null
  }
}

async function snovEnrich(domain: string): Promise<EnrichedContact | null> {
  const token = await getSnovToken()
  if (!token || !domain) return null
  try {
    const res = await fetch("https://api.snov.io/v2/domain-emails-with-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ domain, limit: 1 }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const contact = json.emails?.[0]
    if (!contact?.email) return null

    return {
      email:       contact.email,
      phone:       null,
      linkedinUrl: null,
      title:       contact.position || null,
      companySize: json.company?.size || null,
      revenue:     null,
      industry:    json.company?.industry || null,
      techStack:   null,
      source:      "snov.io",
    }
  } catch (e) {
    console.error("[enrichment] Snov.io error:", e instanceof Error ? e.message : e)
    return null
  }
}

// ── Clearbit (HubSpot) — company enrichment ──
async function clearbitEnrich(domain: string): Promise<EnrichedContact | null> {
  if (!CLEARBIT_KEY || !domain) return null
  try {
    const res = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${CLEARBIT_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()

    return {
      email:       null, // Clearbit doesn't give personal emails
      phone:       json.phone || null,
      linkedinUrl: json.linkedin?.handle ? `https://linkedin.com/company/${json.linkedin.handle}` : null,
      title:       null,
      companySize: json.metrics?.employeesRange || null,
      revenue:     json.metrics?.estimatedAnnualRevenue || null,
      industry:    json.category?.industry || null,
      techStack:   json.tech?.slice(0, 5) || null,
      source:      "clearbit",
    }
  } catch (e) {
    console.error("[enrichment] Clearbit error:", e instanceof Error ? e.message : e)
    return null
  }
}

// ── People Data Labs — people + company ──
async function pdlEnrich(domain: string, name?: string): Promise<EnrichedContact | null> {
  if (!PDL_KEY || !domain) return null
  try {
    const params = new URLSearchParams({
      api_key: PDL_KEY,
      website: domain,
      ...(name ? { name } : {}),
      size: "1",
    })
    const res = await fetch(`https://api.peopledatalabs.com/v5/person/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const person = json.data?.[0]
    if (!person) return null

    return {
      email:       person.work_email || person.personal_emails?.[0] || null,
      phone:       person.phone_numbers?.[0] || null,
      linkedinUrl: person.linkedin_url || null,
      title:       person.job_title || null,
      companySize: person.job_company_size || null,
      revenue:     null,
      industry:    person.industry || null,
      techStack:   null,
      source:      "pdl",
    }
  } catch (e) {
    console.error("[enrichment] PDL error:", e instanceof Error ? e.message : e)
    return null
  }
}

// ── Email Verification ──
async function verifyEmailZeroBounce(email: string): Promise<boolean> {
  if (!ZEROBOUNCE_KEY || !email) return true // assume valid if no key
  try {
    const res = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${ZEROBOUNCE_KEY}&email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return true
    const json = await res.json()
    return json.status === "valid" || json.status === "catch-all"
  } catch {
    return true // assume valid on error
  }
}

async function verifyEmailAbstract(email: string): Promise<boolean> {
  if (!ABSTRACT_KEY || !email) return true
  try {
    const res = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return true
    const json = await res.json()
    return json.deliverability === "DELIVERABLE" || json.deliverability === "UNKNOWN"
  } catch {
    return true
  }
}

/**
 * Verify an email using available verification APIs
 */
export async function verifyEmail(email: string): Promise<boolean> {
  if (!email) return false
  // Try ZeroBounce first, then Abstract
  if (ZEROBOUNCE_KEY) return verifyEmailZeroBounce(email)
  if (ABSTRACT_KEY) return verifyEmailAbstract(email)
  return true // no verification keys, assume valid
}

/**
 * Extract domain from a URL or website string
 */
function extractDomain(website: string): string {
  try {
    let url = website.trim()
    if (!url.startsWith("http")) url = "https://" + url
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  }
}

/**
 * Main waterfall enrichment function
 *
 * Tries each provider in order. Stops when we get an email.
 * Merges company data from all successful providers.
 */
export async function enrichContact(
  website: string | null,
  companyName: string | null,
): Promise<EnrichedContact> {
  const empty: EnrichedContact = {
    email: null, phone: null, linkedinUrl: null, title: null,
    companySize: null, revenue: null, industry: null, techStack: null,
    source: "none",
  }

  const domain = website ? extractDomain(website) : null
  if (!domain && !companyName) return empty

  const providers = [
    () => domain ? hunterEnrich(domain, companyName || undefined) : null,
    () => apolloEnrich(domain || "", companyName || undefined),
    () => domain ? snovEnrich(domain) : null,
    () => domain ? clearbitEnrich(domain) : null,
    () => domain ? pdlEnrich(domain, companyName || undefined) : null,
  ]

  let merged = { ...empty }
  const sources: string[] = []

  for (const provider of providers) {
    try {
      const result = await provider()
      if (!result) continue

      sources.push(result.source)

      // Merge — fill in missing fields, don't overwrite existing
      if (!merged.email && result.email)           merged.email = result.email
      if (!merged.phone && result.phone)           merged.phone = result.phone
      if (!merged.linkedinUrl && result.linkedinUrl) merged.linkedinUrl = result.linkedinUrl
      if (!merged.title && result.title)           merged.title = result.title
      if (!merged.companySize && result.companySize) merged.companySize = result.companySize
      if (!merged.revenue && result.revenue)       merged.revenue = result.revenue
      if (!merged.industry && result.industry)     merged.industry = result.industry
      if (!merged.techStack && result.techStack)   merged.techStack = result.techStack

      // If we have email + phone, we have enough — stop early
      if (merged.email && merged.phone) break
    } catch (e) {
      console.error("[enrichment] Provider failed, trying next:", e instanceof Error ? e.message : e)
      continue
    }
  }

  merged.source = sources.length > 0 ? sources.join("+") : "none"

  // Verify email if we found one
  if (merged.email) {
    const valid = await verifyEmail(merged.email)
    if (!valid) {
      console.log(`[enrichment] Email ${merged.email} failed verification, discarding`)
      merged.email = null
    }
  }

  return merged
}

const SERPER_KEY = process.env.SERPER_API_KEY || ""

/**
 * Find a company's LinkedIn page using Serper organic search.
 * Query: site:linkedin.com/company "CompanyName"
 */
export async function findLinkedInCompany(companyName: string): Promise<string | null> {
  if (!SERPER_KEY || !companyName) return null
  try {
    const query = `site:linkedin.com/company "${companyName}"`
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 3 }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const results: Array<{ link?: string }> = data.organic || []
    for (const r of results) {
      if (r.link && r.link.includes("linkedin.com/company/")) {
        return r.link
      }
    }
    return null
  } catch (e) {
    console.error("[enrichment] LinkedIn company search error:", e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Find decision-maker LinkedIn profiles for a company using Serper organic search.
 * Returns up to 3 profile URLs.
 */
export async function findLinkedInPeople(companyName: string): Promise<string[]> {
  if (!SERPER_KEY || !companyName) return []
  try {
    const query = `site:linkedin.com/in "${companyName}" (CEO OR founder OR "marketing director" OR "sales director" OR "decision maker")`
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5 }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const results: Array<{ link?: string }> = data.organic || []
    return results
      .filter(r => r.link && r.link.includes("linkedin.com/in/"))
      .map(r => r.link!)
      .slice(0, 3)
  } catch (e) {
    console.error("[enrichment] LinkedIn people search error:", e instanceof Error ? e.message : e)
    return []
  }
}

/**
 * Search for active need signals for a company using Serper organic search.
 * Returns a human-readable string summarizing detected signals, or null.
 */
export async function detectNeedSignals(
  companyName: string,
  location: string,
  website: string | null
): Promise<string | null> {
  if (!SERPER_KEY || !companyName) return null
  try {
    const signalQuery = `"${companyName}" "${location}" (hiring OR expanding OR "looking for" OR "we are growing" OR "join our team")`
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: signalQuery, num: 5 }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json()

    const signals: string[] = []

    const organic: Array<{ title?: string; snippet?: string; link?: string }> = data.organic || []
    for (const r of organic) {
      const text = `${r.title || ""} ${r.snippet || ""}`.toLowerCase()
      if (text.includes("hiring") || text.includes("join our team")) {
        signals.push("Actively hiring (job postings found)")
        break
      }
    }
    for (const r of organic) {
      const text = `${r.title || ""} ${r.snippet || ""}`.toLowerCase()
      if (text.includes("expanding") || text.includes("new location") || text.includes("opening")) {
        signals.push("Business expansion detected")
        break
      }
    }

    if (!website) {
      signals.push("No website detected — high need for digital presence")
    }

    if (data.answerBox?.snippet) {
      const ab = data.answerBox.snippet.toLowerCase()
      if (ab.includes("0 review") || ab.includes("no reviews")) {
        signals.push("Zero reviews found online — low digital footprint")
      }
    }

    return signals.length > 0 ? signals.join("; ") : null
  } catch (e) {
    console.error("[enrichment] Need signal detection error:", e instanceof Error ? e.message : e)
    return null
  }
}
