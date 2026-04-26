import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enrichContact, findLinkedInCompany, findLinkedInPeople, detectNeedSignals } from "@/lib/enrichment"

export const maxDuration = 120

const SERPER_KEY = process.env.SERPER_API_KEY  || ""
const OPENAI_KEY = process.env.OPENAI_API_KEY  || ""
const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || ""
const TG_CHAT    = process.env.TELEGRAM_CHAT_ID   || ""

async function tg(text: string) {
  if (!TG_TOKEN || !TG_CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" }),
    })
  } catch {}
}

interface SerperPlace {
  title?: string
  address?: string
  phone?: string
  phoneNumber?: string
  website?: string
  rating?: number
  ratingCount?: number
  category?: string
  type?: string
  types?: string[]
  description?: string
}

interface MarketingEnriched {
  companyBio?: string
  campaignIdea?: string
  contentAngle?: string
  adCopy?: string
  needSignal?: string
  icpScore?: number | string
  icpLabel?: string
  emailSubject?: string
  emailBody?: string
}

async function searchPlaces(query: string, num: number): Promise<SerperPlace[]> {
  if (!SERPER_KEY) throw new Error("SERPER_API_KEY not set")
  const res = await fetch("https://google.serper.dev/maps", {
    method: "POST",
    headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Serper returned ${res.status}`)
  const data = await res.json()
  return (data.places || []) as SerperPlace[]
}

async function enrichWithOpenAI(
  place: SerperPlace,
  targetAudience: string,
  campaignGoal: string,
  senderName: string,
  senderCompany: string,
  needSignals: string | null
): Promise<MarketingEnriched> {
  if (!OPENAI_KEY) return {}
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a marketing strategist specializing in B2B outreach. Respond ONLY with valid JSON, no markdown. Never use placeholder text like [Your Name] — use actual values provided.",
          },
          {
            role: "user",
            content:
              `Create a marketing campaign brief and cold email for this prospect.\n\n` +
              `SENDER: ${senderName} @ ${senderCompany}\n` +
              `TARGET AUDIENCE: ${targetAudience}\n` +
              `CAMPAIGN GOAL: ${campaignGoal}\n\n` +
              `PROSPECT:\n` +
              `- Company: ${place.title || "Unknown"}\n` +
              `- Industry: ${place.category || place.type || "general"}\n` +
              `- Location: ${place.address || "N/A"}\n` +
              `- Rating: ${place.rating || "N/A"}/5 (${place.ratingCount || 0} reviews)\n` +
              `- Website: ${place.website ? place.website : "NONE — no website at all"}\n` +
              `- Active Need Signals: ${needSignals || "None explicitly detected"}\n\n` +
              `Return JSON with these exact keys:\n` +
              `- companyBio: 2 sentences about the company\n` +
              `- campaignIdea: 1 sentence — a specific marketing campaign tailored to their current situation (e.g., "Launch Google My Business + review-building campaign" for low-review businesses)\n` +
              `- contentAngle: 1 sentence — messaging angle that addresses their actual gap (missing digital presence, bad reputation, no lead funnel, etc.)\n` +
              `- adCopy: 1 punchy hook line under 15 words that speaks to their pain\n` +
              `- needSignal: 1-2 sentences on why this company NEEDS marketing services now. Reference: no website, few/no reviews, expanding but no digital presence, hiring but no employer brand, etc.\n` +
              `- icpScore: integer 0-100. Rules: no website = +30; under 20 reviews = +20; rating below 4.0 = +15; hiring in signals = +10; expansion in signals = +15. Baseline 25. Cap 100. Vary realistically.\n` +
              `- icpLabel: "Hot" if >=70, "Warm" if 40-69, "Cold" if <40\n` +
              `- emailSubject: short subject that mentions their specific gap (e.g., "Your Google presence needs work")\n` +
              `- emailBody: 3 paragraphs. Para 1: name them by company name, pinpoint their marketing gap from signals. Para 2: your specific solution for that gap. Para 3: CTA for 15-min strategy call.`,
          },
        ],
        max_tokens: 900,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await res.json()
    const content = (data?.choices?.[0]?.message?.content || "{}") as string
    const clean = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as MarketingEnriched
  } catch (e: unknown) {
    console.error("[marketing] OpenAI error:", e instanceof Error ? e.message : e)
  }
  return {}
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      businessType,
      location,
      targetAudience = "small and medium businesses",
      campaignGoal   = "brand awareness and lead generation",
      senderName     = "Team",
      senderCompany  = "Tec Tha",
      maxLeads       = 10,
    } = body

    if (!businessType?.trim() || !location?.trim()) {
      return NextResponse.json({ error: "Business type and location are required." }, { status: 400 })
    }

    if (!SERPER_KEY) {
      return NextResponse.json({ error: "SERPER_API_KEY not configured." }, { status: 503 })
    }

    const max         = Math.min(Math.max(Number(maxLeads) || 10, 3), 25)
    const searchQuery = `${businessType.trim()} in ${location.trim()}`

    console.log(`[marketing] Searching: "${searchQuery}", max=${max}`)
    await tg(`📣 <b>Marketing Agent Started</b>\n🎯 ${businessType}\n📍 ${location}\n🔢 Max: ${max}`)

    let places: SerperPlace[] = []
    try {
      places = await searchPlaces(searchQuery, max)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      await tg(`❌ Search failed: ${msg}`)
      return NextResponse.json({ error: `Search failed: ${msg}` }, { status: 503 })
    }

    if (!places.length) {
      return NextResponse.json({ message: "No results found", leads: [] })
    }

    const seen = new Set<string>()
    const uniquePlaces = places.filter(p => {
      const key = (p.title || "").toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, max)

    const savedLeads = []

    for (const p of uniquePlaces) {
      const name     = p.title   || "Business"
      const phone    = p.phoneNumber || p.phone || null
      const website  = p.website || null
      const loc      = p.address || null
      const industry = p.category || p.type || "general"
      const rating   = p.rating  || null

      // Waterfall enrichment
      const contactData = await enrichContact(website, name)
      const enrichedEmail = contactData.email
      const enrichedPhone = contactData.phone || phone

      // Need signal detection (Serper organic search)
      const needSignals = await detectNeedSignals(name, loc || location, website)
      console.log(`[marketing] Need signals for ${name}:`, needSignals || "none")

      // LinkedIn discovery (Serper organic search)
      const [companyLinkedIn, peopleLinkedIns] = await Promise.all([
        findLinkedInCompany(name),
        findLinkedInPeople(name),
      ])
      // Resolve final linkedinUrl: prefer enrichment provider result, fallback to Serper discovery
      const linkedinUrl = contactData.linkedinUrl
        || companyLinkedIn
        || (peopleLinkedIns.length > 0 ? peopleLinkedIns[0] : null)

      const enriched = await enrichWithOpenAI(p, targetAudience, campaignGoal, senderName, senderCompany, needSignals)
      const score    = Math.min(100, Math.max(0, parseInt(String(enriched.icpScore ?? 20))))
      const icpLabel = enriched.icpLabel || (score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold")

      try {
        const existing = await prisma.marketingLead.findFirst({
          where: { name, location: loc },
          select: { id: true },
        })
        if (existing) { console.log(`[marketing] Skipping duplicate: ${name}`); continue }

        const saved = await prisma.marketingLead.create({
          data: {
            name,
            email:        enrichedEmail,
            phone:        enrichedPhone,
            company:      name,
            website,
            location:     loc,
            industry:     contactData.industry || industry,
            source:       `serper_maps+${contactData.source}`,
            linkedinUrl:  linkedinUrl,
            score,
            icpLabel,
            companyBio:   enriched.companyBio   || null,
            campaignIdea: enriched.campaignIdea || null,
            contentAngle: enriched.contentAngle || null,
            adCopy:       enriched.adCopy       || null,
            needSignals:  enriched.needSignal   || needSignals || null,
            emailSubject: enriched.emailSubject || null,
            emailBody:    enriched.emailBody    || null,
            notes:        `${contactData.industry || industry} | Rating:${rating ?? "N/A"} | ${loc ?? ""}${contactData.companySize ? " | " + contactData.companySize : ""}`.trim(),
            processedAt:  new Date(),
          },
        })
        savedLeads.push(saved)

        await tg(
          `📣 <b>${icpLabel} (${score}/100)</b>\n` +
          `🏢 <b>${name}</b>\n` +
          `📧 ${enrichedEmail || "No email"}\n` +
          `📱 ${enrichedPhone || "No phone"}\n` +
          `🌐 ${website || "N/A"}\n` +
          `🔗 ${linkedinUrl || "No LinkedIn"}\n` +
          `🧲 ${enriched.needSignal || needSignals || "No signals"}\n` +
          `📊 Source: ${contactData.source}\n` +
          `💡 ${enriched.campaignIdea || "N/A"}\n✅ Saved`
        )
      } catch (e: unknown) {
        console.error("[marketing] DB error:", e instanceof Error ? e.message : e)
      }
    }

    await tg(`✅ <b>Marketing Agent Done!</b> ${savedLeads.length} prospects saved`)

    return NextResponse.json({ message: `Generated ${savedLeads.length} marketing leads`, leads: savedLeads })
  } catch (err) {
    console.error("[marketing POST]", err)
    return NextResponse.json({ error: "Failed to generate marketing leads." }, { status: 500 })
  }
}
