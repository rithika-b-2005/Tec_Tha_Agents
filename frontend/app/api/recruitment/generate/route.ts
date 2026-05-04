import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 120

const GROQ_KEY   = process.env.GROQ_API_KEY  || ""
const SERPER_KEY = process.env.SERPER_API_KEY || ""
const GROQ_MODEL = "llama-3.3-70b-versatile"

// ── Groq helper ───────────────────────────────────────────────────────────────
async function groq(messages: { role: string; content: string }[], maxTokens = 1000): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature: 0.3 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Groq returned ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data?.choices?.[0]?.message?.content || "") as string
}

function parseJson<T>(text: string): T | null {
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
  const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!match) return null
  try { return JSON.parse(match[0]) as T } catch { return null }
}

// ── Parse job description ─────────────────────────────────────────────────────
interface ParsedJD {
  title: string
  skills: string[]
  location: string
  experience: string
  jobType: string
}

async function parseJobDescription(jd: string): Promise<ParsedJD> {
  const text = await groq([
    { role: "system", content: "You are a recruiter. Parse job descriptions. Return ONLY valid JSON, no markdown." },
    {
      role: "user",
      content: `Parse this job description and return JSON with keys: title (string), skills (array of top 5 skills), location (string or "Remote"), experience (string e.g. "2-5 years"), jobType (string e.g. "Full-time", "Internship", "Contract").\n\nJD:\n${jd.slice(0, 3000)}`,
    },
  ], 400)
  const parsed = parseJson<ParsedJD>(text)
  return parsed ?? { title: "Software Engineer", skills: [], location: "", experience: "", jobType: "" }
}

// ── Serper search ─────────────────────────────────────────────────────────────
interface SerperResult {
  title?: string
  link?: string
  snippet?: string
}

async function serperSearch(query: string): Promise<SerperResult[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10 }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.organic || []) as SerperResult[]
  } catch {
    return []
  }
}

// ── Detect platform from URL ──────────────────────────────────────────────────
function detectPlatform(url: string): string {
  if (url.includes("linkedin.com"))    return "LinkedIn"
  if (url.includes("internshala.com")) return "Internshala"
  if (url.includes("naukri.com"))      return "Naukri"
  if (url.includes("github.com"))      return "GitHub"
  if (url.includes("wellfound.com") || url.includes("angel.co")) return "Wellfound"
  return "Other"
}

// ── Extract name from result ──────────────────────────────────────────────────
function extractName(result: SerperResult, platform: string): string {
  const title = result.title || ""
  // LinkedIn: "John Doe - Software Engineer at Google | LinkedIn"
  // GitHub:   "johnDoe (John Doe) · GitHub"
  // Naukri:   "John Doe - Software Engineer - 5 years experience"
  const clean = title
    .replace(/\s*[|·–-]\s*(LinkedIn|GitHub|Naukri|Internshala|Wellfound|AngelList).*$/i, "")
    .replace(/\s*\(.*?\)/g, "")
    .split(/\s+-\s+/)[0]
    .trim()
  if (platform === "GitHub" && title.includes("(")) {
    const match = title.match(/\(([^)]+)\)/)
    if (match) return match[1].trim()
  }
  return clean || "Unknown Candidate"
}

// ── Extract current role from snippet/title ───────────────────────────────────
function extractRole(result: SerperResult): string {
  const src = `${result.title || ""} ${result.snippet || ""}`
  const match = src.match(/(?:at|@)\s+([A-Z][a-zA-Z\s]+?)(?:\s*[|·–\n,]|$)/)
  if (match) return match[1].trim()
  const dashParts = (result.title || "").split(/\s*-\s*/)
  if (dashParts.length >= 2) return dashParts[1].trim()
  return ""
}

// ── Batch score candidates ────────────────────────────────────────────────────
interface CandidateInput {
  index: number
  name: string
  platform: string
  currentRole: string
  skills: string[]
  snippet: string
}

interface ScoreResult {
  index: number
  score: number
  skills: string[]
  currentRole: string
}

async function scoreBatch(candidates: CandidateInput[], jd: string, jobSkills: string[]): Promise<ScoreResult[]> {
  const list = candidates.map(c =>
    `${c.index}. Name: ${c.name} | Platform: ${c.platform} | Role: ${c.currentRole || "Unknown"} | Snippet: ${(c.snippet || "").slice(0, 200)}`
  ).join("\n")

  const text = await groq([
    { role: "system", content: "You are a technical recruiter. Score candidates 0-100 for job fit. Return ONLY a JSON array." },
    {
      role: "user",
      content: `Job requires skills: ${jobSkills.join(", ")}\nJob Description summary: ${jd.slice(0, 500)}\n\nCandidates:\n${list}\n\nReturn JSON array where each element has: { "index": number, "score": 0-100, "skills": [array of matching skills detected], "currentRole": "refined role string" }\n\nScoring: +30 if skills match, +20 if same industry, +20 if senior/relevant title, +15 if good snippet, -20 if no relevant experience. Be varied.`,
    },
  ], 600)

  const parsed = parseJson<ScoreResult[]>(text)
  return parsed ?? candidates.map(c => ({ index: c.index, score: 30, skills: [], currentRole: c.currentRole }))
}

// ── Generate outreach messages ────────────────────────────────────────────────
interface OutreachInput {
  index: number
  name: string
  currentRole: string
  platform: string
}

async function generateOutreachBatch(candidates: OutreachInput[], jobTitle: string): Promise<Record<number, string>> {
  const list = candidates.map(c =>
    `${c.index}. ${c.name} — ${c.currentRole || "professional"} (via ${c.platform})`
  ).join("\n")

  const text = await groq([
    { role: "system", content: "You are a recruiter writing personalized outreach messages. Return ONLY valid JSON." },
    {
      role: "user",
      content: `Write a short, personalized 3-sentence LinkedIn/email outreach for each candidate for the role: "${jobTitle}".\nMention their current role specifically and why they'd be great for this position.\n\nCandidates:\n${list}\n\nReturn JSON object: { "0": "message...", "1": "message...", ... } using the candidate index as key.`,
    },
  ], 800)

  const parsed = parseJson<Record<number, string>>(text)
  return parsed ?? {}
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { jobDescription, maxCandidates = 15 } = body

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "jobDescription is required" }, { status: 400 })
    }
    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 503 })
    }
    if (!SERPER_KEY) {
      return NextResponse.json({ error: "SERPER_API_KEY not set" }, { status: 503 })
    }

    const max = Math.min(Math.max(Number(maxCandidates) || 15, 5), 30)

    // ── Step 1: Parse JD ───────────────────────────────────────────────────
    console.log("[recruitment] Parsing job description...")
    const parsed = await parseJobDescription(jobDescription)
    const { title, skills, location, experience, jobType } = parsed
    const skill1 = skills[0] || title
    const skill2 = skills[1] || ""
    const loc    = location || ""

    console.log(`[recruitment] Parsed: ${title} | Skills: ${skills.join(", ")} | Location: ${loc}`)

    // ── Step 2: Search all platforms in parallel ──────────────────────────
    const queries = [
      `site:linkedin.com/in "${title}" "${skill1}" ${loc}`,
      `site:internshala.com "${title}" ${skills.slice(0, 2).join(" ")}`,
      `site:naukri.com "${title}" ${loc}`,
      `site:github.com "${skill1}" "${skill2}" developer`,
      `site:wellfound.com "${title}" ${loc}`,
    ]

    console.log("[recruitment] Searching platforms in parallel...")
    const searchResults = await Promise.all(queries.map(q => serperSearch(q)))

    // ── Step 3: Flatten + deduplicate by URL ──────────────────────────────
    const seen = new Set<string>()
    const rawCandidates: Array<{
      name: string
      profileUrl: string
      platform: string
      currentRole: string
      location: string
      skills: string[]
      snippet: string
    }> = []

    for (const results of searchResults) {
      for (const r of results) {
        const url = r.link || ""
        if (!url || seen.has(url)) continue
        // Skip non-profile pages (job postings, company pages)
        if (url.includes("/jobs/") || url.includes("/company/")) continue
        seen.add(url)

        const platform    = detectPlatform(url)
        const name        = extractName(r, platform)
        const currentRole = extractRole(r)

        rawCandidates.push({
          name,
          profileUrl:  url,
          platform,
          currentRole,
          location:    "",
          skills:      [],
          snippet:     r.snippet || "",
        })

        if (rawCandidates.length >= max * 2) break
      }
    }

    console.log(`[recruitment] Found ${rawCandidates.length} unique candidates before scoring`)

    // ── Step 4: Score in batches of 10 ───────────────────────────────────
    const BATCH = 10
    const scoredMap: Record<number, ScoreResult> = {}

    for (let i = 0; i < rawCandidates.length; i += BATCH) {
      const batch = rawCandidates.slice(i, i + BATCH).map((c, j) => ({
        index: i + j,
        name: c.name,
        platform: c.platform,
        currentRole: c.currentRole,
        skills: c.skills,
        snippet: c.snippet,
      }))
      const scores = await scoreBatch(batch, jobDescription, skills)
      for (const s of scores) {
        scoredMap[s.index] = s
      }
    }

    // ── Step 5: Build candidates with scores ─────────────────────────────
    const candidatesWithScores = rawCandidates.map((c, i) => {
      const scored = scoredMap[i]
      const score  = scored?.score ?? 30
      const label  = score >= 70 ? "Strong" : score >= 40 ? "Potential" : "Weak"
      return {
        ...c,
        skills:      scored?.skills?.length ? scored.skills : skills.slice(0, 3),
        currentRole: scored?.currentRole || c.currentRole,
        matchScore:  score,
        matchLabel:  label,
      }
    })

    // Sort by score desc, take top `max`
    candidatesWithScores.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    const topCandidates = candidatesWithScores.slice(0, max)

    // ── Step 6: Generate outreach messages in batches ─────────────────────
    const OUTREACH_BATCH = 10
    const outreachMap: Record<number, string> = {}

    for (let i = 0; i < topCandidates.length; i += OUTREACH_BATCH) {
      const batch = topCandidates.slice(i, i + OUTREACH_BATCH).map((c, j) => ({
        index: i + j,
        name: c.name,
        currentRole: c.currentRole,
        platform: c.platform,
      }))
      const messages = await generateOutreachBatch(batch, title)
      for (const [k, v] of Object.entries(messages)) {
        outreachMap[i + Number(k)] = v
      }
    }

    // ── Step 7: Save to DB ────────────────────────────────────────────────
    console.log("[recruitment] Saving to DB...")
    const job = await prisma.recruitmentJob.create({
      data: {
        title,
        description: jobDescription,
        skills,
        location:   loc || null,
        experience: experience || null,
        jobType:    jobType || null,
      },
    })

    const savedCandidates = await Promise.all(
      topCandidates.map((c, i) =>
        prisma.recruitmentCandidate.create({
          data: {
            jobId:          job.id,
            name:           c.name,
            profileUrl:     c.profileUrl,
            platform:       c.platform,
            currentRole:    c.currentRole || null,
            location:       c.location || null,
            skills:         c.skills,
            snippet:        c.snippet || null,
            matchScore:     c.matchScore ?? null,
            matchLabel:     c.matchLabel ?? null,
            outreachMessage: outreachMap[i] || null,
            status:         "new",
          },
        })
      )
    )

    console.log(`[recruitment] Saved job ${job.id} with ${savedCandidates.length} candidates`)

    return NextResponse.json({
      jobId:      job.id,
      candidates: savedCandidates,
      total:      savedCandidates.length,
    })
  } catch (err) {
    console.error("[recruitment generate POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate candidates" },
      { status: 500 }
    )
  }
}
