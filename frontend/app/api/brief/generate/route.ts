import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY || ""
const SERPER_KEY = process.env.SERPER_API_KEY || ""
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || ""

function todayStr(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

async function fetchTopNews(): Promise<string> {
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: "AI automation business India today", num: 5 }),
    })
    const data = await res.json()
    const items: Array<{ title: string; snippet?: string; source?: string }> = data.news || []
    return items
      .slice(0, 5)
      .map((n) => `• ${n.title}${n.snippet ? `: ${n.snippet}` : ""}${n.source ? ` (${n.source})` : ""}`)
      .join("\n")
  } catch {
    return "No news available"
  }
}

async function groqGenerate(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ""
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!TG_TOKEN || !TG_CHAT) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text,
        parse_mode: "HTML",
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST() {
  const date = todayStr()

  // Check if brief already generated today
  const existing = await prisma.dailyBrief.findFirst({ where: { date } })
  if (existing) {
    return NextResponse.json({ briefId: existing.id, sent: existing.status === "sent", alreadyExists: true })
  }

  if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
  if (!SERPER_KEY) return NextResponse.json({ error: "SERPER_API_KEY not set" }, { status: 500 })

  // Create a pending brief record
  const brief = await prisma.dailyBrief.create({ data: { date, status: "pending" } })

  try {
    // Fetch in parallel: news + hot CRM leads + uncontacted leads
    const [newsSnippets, crmLeads, unleads] = await Promise.all([
      fetchTopNews(),
      prisma.crmContact.findMany({
        where: { icpLabel: "Hot" },
        orderBy: { score: "desc" },
        take: 3,
        select: { name: true, company: true, score: true, needSignals: true, phone: true },
      }),
      prisma.lead.findMany({
        where: { contactStatus: "never" },
        orderBy: { score: "desc" },
        take: 3,
        select: { name: true, company: true, score: true, automationOpportunity: true, phone: true },
      }),
    ])

    const leadsText = crmLeads.length
      ? crmLeads
          .map(
            (l) =>
              `${l.name}${l.company ? ` @ ${l.company}` : ""} (score: ${l.score ?? "N/A"}${l.needSignals ? `, signals: ${l.needSignals}` : ""}${l.phone ? `, phone: ${l.phone}` : ""})`
          )
          .join("\n")
      : "No hot CRM leads"

    const unleadsText = unleads.length
      ? unleads
          .map(
            (l) =>
              `${l.name}${l.company ? ` @ ${l.company}` : ""} (score: ${l.score ?? "N/A"}${l.automationOpportunity ? `, opp: ${l.automationOpportunity}` : ""}${l.phone ? `, phone: ${l.phone}` : ""})`
          )
          .join("\n")
      : "No uncontacted leads"

    const prompt = `Format a morning business brief for Tec Tha sales team. Today: ${date}

NEWS: ${newsSnippets}
TOP CRM LEADS: ${leadsText}
UNCONTACTED HOT LEADS: ${unleadsText}

Write a brief with these sections:
📰 TOP NEWS (3 bullet points, business/AI relevant)
🎯 CALL TODAY (top 3 leads with name, company, why call them)
💡 SALES TIP (1 actionable tip for today)
⚡ QUOTE OF THE DAY (motivational)

Keep it punchy. Under 300 words total. Use emojis. Make it feel energizing.`

    const fullBrief = await groqGenerate(prompt)

    // Send to Telegram
    const tgMessage = `<b>🌅 Daily Brief — ${date}</b>\n\n${fullBrief}`
    const sent = await sendTelegram(tgMessage)

    // Update brief record
    await prisma.dailyBrief.update({
      where: { id: brief.id },
      data: {
        news: newsSnippets,
        topLeads: leadsText + "\n\nUncontacted:\n" + unleadsText,
        fullBrief,
        status: sent ? "sent" : "pending",
        sentAt: sent ? new Date() : null,
      },
    })

    return NextResponse.json({ briefId: brief.id, sent })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[brief/generate] Failed:", error)
    await prisma.dailyBrief.update({
      where: { id: brief.id },
      data: { status: "failed" },
    })
    return NextResponse.json({ error: "Brief generation failed", details: error }, { status: 500 })
  }
}
