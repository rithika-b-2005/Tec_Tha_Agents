import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  website?: string
  rating?: number
  ratingCount?: number
  category?: string
  type?: string
}

interface SalesEnriched {
  companyBio?: string
  painPoint?: string
  salesPitch?: string
  proposalSummary?: string
  icpScore?: number | string
  icpLabel?: string
  emailSubject?: string
  emailBody?: string
}

async function searchPlaces(query: string, num: number): Promise<SerperPlace[]> {
  if (!SERPER_KEY) throw new Error("SERPER_API_KEY not set")
  const res = await fetch("https://google.serper.dev/places", {
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
  productService: string,
  idealCustomer: string,
  senderName: string,
  senderCompany: string
): Promise<SalesEnriched> {
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
            content: "You are a B2B sales expert specializing in consultative selling. Respond ONLY with valid JSON, no markdown. Never use placeholder text like [Your Name] — use actual values provided.",
          },
          {
            role: "user",
            content:
              `Build a sales brief and cold email for this prospect.\n\n` +
              `SENDER: ${senderName} @ ${senderCompany}\n` +
              `PRODUCT/SERVICE: ${productService}\n` +
              `IDEAL CUSTOMER: ${idealCustomer}\n\n` +
              `PROSPECT:\n` +
              `- Company: ${place.title || "Unknown"}\n` +
              `- Industry: ${place.category || place.type || "general"}\n` +
              `- Location: ${place.address || "N/A"}\n` +
              `- Rating: ${place.rating || "N/A"}/5 (${place.ratingCount || 0} reviews)\n` +
              `- Website: ${place.website || "N/A"}\n\n` +
              `Return JSON with these exact keys:\n` +
              `- companyBio: 2 sentences about the company\n` +
              `- painPoint: 1 sentence — most likely business pain point this company faces\n` +
              `- salesPitch: 1-2 sentences — direct value proposition for this specific company\n` +
              `- proposalSummary: 1 sentence — what a proposal to them would look like\n` +
              `- icpScore: integer 0-100 based on: rating (4.5+=higher), review count (200+=higher), has website (+10), industry fit with product. Vary scores realistically — do NOT give everyone the same number.\n` +
              `- icpLabel: "Hot" if >=70, "Warm" if 40-69, "Cold" if <40\n` +
              `- emailSubject: short compelling subject line\n` +
              `- emailBody: 3 paragraphs, reference their specific business name and location, address their pain point, CTA for 15-min discovery call`,
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
    if (match) return JSON.parse(match[0]) as SalesEnriched
  } catch (e: unknown) {
    console.error("[sales] OpenAI error:", e instanceof Error ? e.message : e)
  }
  return {}
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      businessType,
      location,
      productService = "AI-powered business automation",
      idealCustomer  = "SMBs looking to scale operations",
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

    console.log(`[sales] Searching: "${searchQuery}", max=${max}`)
    await tg(`💼 <b>Sales Agent Started</b>\n🎯 ${businessType}\n📍 ${location}\n🔢 Max: ${max}`)

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
      const phone    = p.phone   || null
      const website  = p.website || null
      const loc      = p.address || null
      const industry = p.category || p.type || "general"
      const rating   = p.rating  || null

      const enriched = await enrichWithOpenAI(p, productService, idealCustomer, senderName, senderCompany)
      const score    = Math.min(100, Math.max(0, parseInt(String(enriched.icpScore ?? 20))))
      const icpLabel = enriched.icpLabel || (score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold")

      try {
        const existing = await prisma.salesLead.findFirst({
          where: { name, location: loc },
          select: { id: true },
        })
        if (existing) { console.log(`[sales] Skipping duplicate: ${name}`); continue }

        const saved = await prisma.salesLead.create({
          data: {
            name,
            email:          null,
            phone,
            company:        name,
            website,
            location:       loc,
            industry,
            source:         "serper_maps",
            score,
            icpLabel,
            companyBio:     enriched.companyBio     || null,
            painPoint:      enriched.painPoint      || null,
            salesPitch:     enriched.salesPitch     || null,
            proposalSummary: enriched.proposalSummary || null,
            emailSubject:   enriched.emailSubject   || null,
            emailBody:      enriched.emailBody      || null,
            notes:          `${industry} | Rating:${rating ?? "N/A"} | ${loc ?? ""}`.trim(),
            processedAt:    new Date(),
          },
        })
        savedLeads.push(saved)

        await tg(
          `💼 <b>${icpLabel} (${score}/100)</b>\n` +
          `🏢 <b>${name}</b>\n` +
          `📱 ${phone || "No phone"}\n` +
          `🌐 ${website || "N/A"}\n` +
          `🎯 ${enriched.painPoint || "N/A"}\n✅ Saved`
        )
      } catch (e: unknown) {
        console.error("[sales] DB error:", e instanceof Error ? e.message : e)
      }
    }

    await tg(`✅ <b>Sales Agent Done!</b> ${savedLeads.length} prospects saved`)

    return NextResponse.json({ message: `Generated ${savedLeads.length} sales leads`, leads: savedLeads })
  } catch (err) {
    console.error("[sales POST]", err)
    return NextResponse.json({ error: "Failed to generate sales leads." }, { status: 500 })
  }
}
