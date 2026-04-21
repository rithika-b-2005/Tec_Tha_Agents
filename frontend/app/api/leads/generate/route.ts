import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendColdOutreachEmail } from "@/lib/email"

export const maxDuration = 120

const SERPER_KEY   = process.env.SERPER_API_KEY  || ""
const OPENAI_KEY   = process.env.OPENAI_API_KEY  || ""
const TG_TOKEN     = process.env.TELEGRAM_BOT_TOKEN || ""
const TG_CHAT      = process.env.TELEGRAM_CHAT_ID   || ""

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

interface Enriched {
  companyBio?: string
  automationOpportunity?: string
  icpScore?: number | string
  icpLabel?: string
  emailSubject?: string
  emailBody?: string
}

async function searchPlaces(query: string, num: number): Promise<SerperPlace[]> {
  if (!SERPER_KEY) throw new Error("SERPER_API_KEY not set in .env")
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
  yourService: string,
  senderName: string,
  senderCompany: string
): Promise<Enriched> {
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
          { role: "system", content: "B2B cold email expert. Respond ONLY valid JSON, no markdown. Never use placeholder text like [Your Name] or [Company] — use the actual values provided." },
          {
            role: "user",
            content:
              `Enrich lead and write cold email.\n\n` +
              `SENDER: ${senderName} @ ${senderCompany} | Service: ${yourService}\n\n` +
              `PROSPECT:\n` +
              `- Company: ${place.title || "Unknown"}\n` +
              `- Industry: ${place.category || place.type || "general"}\n` +
              `- Location: ${place.address || "N/A"}\n` +
              `- Rating: ${place.rating || "N/A"}/5 (${place.ratingCount || 0} reviews)\n` +
              `- Website: ${place.website || "N/A"}\n\n` +
              `Return JSON with these exact keys:\n` +
              `- companyBio: 2 sentences about the company\n` +
              `- automationOpportunity: 1 sentence on how ${yourService} helps them specifically\n` +
              `- icpScore: integer 0-100. Base it on: rating (4.5+ = higher), review count (200+ = higher), has website (+10), industry fit. DO NOT give every lead the same score — vary realistically.\n` +
              `- icpLabel: "Hot" if score>=70, "Warm" if 40-69, "Cold" if <40\n` +
              `- emailSubject: short compelling subject line\n` +
              `- emailBody: 3 paragraphs, conversational, reference their specific business name and location, clear CTA for 15-min call`,
          },
        ],
        max_tokens: 900,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await res.json()
    const content = (data?.choices?.[0]?.message?.content || "{}") as string
    const clean = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as Enriched
  } catch (e: unknown) {
    console.error("[lead-gen] OpenAI error:", e instanceof Error ? e.message : e)
  }
  return {}
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      businessType,
      location,
      yourService   = "AI-powered business automation platform",
      senderName    = "Team",
      senderCompany = "Tec Tha",
      maxLeads      = 10,
      sendEmail     = true,
    } = body

    if (!businessType?.trim() || !location?.trim()) {
      return NextResponse.json({ error: "Business type and location are required." }, { status: 400 })
    }

    if (!SERPER_KEY) {
      return NextResponse.json(
        { error: "SERPER_API_KEY not set. Get a free key at serper.dev and add it to .env" },
        { status: 503 }
      )
    }

    const max          = Math.min(Math.max(Number(maxLeads) || 10, 3), 25)
    const searchQuery  = `${businessType.trim()} in ${location.trim()}`

    console.log(`[lead-gen] Searching: "${searchQuery}", max=${max}`)
    await tg(`🚀 <b>Lead Gen Started</b>\n🎯 ${businessType}\n📍 ${location}\n🔢 Max: ${max}\n\n⏳ Searching...`)

    // ── 1. Fetch places from Serper (Google Maps data, ~1 second) ─────────
    let places: SerperPlace[] = []
    try {
      places = await searchPlaces(searchQuery, max)
      console.log(`[lead-gen] Serper returned ${places.length} places`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("[lead-gen] Serper error:", msg)
      await tg(`❌ Search failed: ${msg}`)
      return NextResponse.json({ error: `Search failed: ${msg}` }, { status: 503 })
    }

    if (!places.length) {
      await tg(`⚠️ No results found for "${searchQuery}"`)
      return NextResponse.json({ message: "No leads found", leads: [] })
    }

    // ── Deduplicate Serper results by normalized name, then cap to max ────
    const seen = new Set<string>()
    const uniquePlaces = places.filter(p => {
      const key = (p.title || "").toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, max)

    // ── 2. Enrich each lead with OpenAI + save to DB ──────────────────────
    const savedLeads = []

    for (const p of uniquePlaces) {
      const name     = p.title    || "Business"
      const phone    = p.phone    || null
      const website  = p.website  || null
      const loc      = p.address  || null
      const industry = p.category || p.type || "general"
      const rating   = p.rating   || null

      console.log(`[lead-gen] Processing: ${name} | ${phone} | ${website}`)

      const enriched = await enrichWithOpenAI(p, yourService, senderName, senderCompany)
      const score    = Math.min(100, Math.max(0, parseInt(String(enriched.icpScore ?? 20))))
      const icpLabel = enriched.icpLabel || (score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold")

      try {
        // Skip if already in DB (same name + location)
        const existing = await prisma.lead.findFirst({
          where: { name, location: loc },
          select: { id: true },
        })
        if (existing) {
          console.log(`[lead-gen] Skipping duplicate: ${name}`)
          continue
        }

        const leadData = {
          name,
          phone,
          company:               name,
          website,
          location:              loc,
          industry,
          source:                "serper_maps",
          score,
          icpLabel,
          companyBio:            enriched.companyBio            || null,
          automationOpportunity: enriched.automationOpportunity || null,
          emailSubject:          enriched.emailSubject          || null,
          emailBody:             enriched.emailBody             || null,
          notes:                 `${industry} | Rating:${rating ?? "N/A"} | ${loc ?? ""}`.trim(),
          processedAt:           new Date(),
        }

        const saved = await prisma.lead.create({ data: { ...leadData, email: null } })
        savedLeads.push(saved)

        if (sendEmail && enriched.emailBody && phone) {
          // phone-based outreach logged (email sent only if email exists)
        }

        await tg(
          `🎯 <b>${icpLabel} (${score}/100)</b>\n` +
          `🏢 <b>${name}</b>\n` +
          `📱 ${phone || "No phone"}\n` +
          `🌐 ${website || "N/A"}\n` +
          `📍 ${loc || "N/A"}\n` +
          `🏭 ${industry}\n\n` +
          `${enriched.companyBio || ""}\n\n` +
          `📧 <b>Subject:</b> ${enriched.emailSubject || "N/A"}\n✅ Saved`
        )
      } catch (e: unknown) {
        console.error("[lead-gen] DB error:", e instanceof Error ? e.message : e)
      }
    }

    await tg(`✅ <b>Done!</b> ${savedLeads.length} leads saved for "${searchQuery}"`)

    return NextResponse.json({
      message: `Generated ${savedLeads.length} leads`,
      leads: savedLeads,
    })
  } catch (err) {
    console.error("[lead-gen POST]", err)
    return NextResponse.json({ error: "Failed to generate leads." }, { status: 500 })
  }
}
