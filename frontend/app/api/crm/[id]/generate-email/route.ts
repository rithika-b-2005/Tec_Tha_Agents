import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const GROQ_KEY = process.env.GROQ_API_KEY || ""

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const contact = await prisma.crmContact.findUnique({ where: { id } })
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
    }

    const prompt =
      `Write a cold outreach email for this prospect.\n\n` +
      `SENDER: Tec Tha team (tecthaofficial@gmail.com)\n` +
      `SENDER COMPANY: Tec Tha — AI automation & marketing agency\n\n` +
      `PROSPECT:\n` +
      `- Name: ${contact.name}\n` +
      `- Company: ${contact.company || "Unknown"}\n` +
      `- Industry: ${contact.industry || "general"}\n` +
      `- Location: ${contact.location || "N/A"}\n` +
      `- Website: ${contact.website || "NONE"}\n` +
      `- Need Signals: ${contact.needSignals || "None detected"}\n` +
      `- Notes: ${contact.notes || "None"}\n\n` +
      `Return ONLY valid JSON with exactly these keys:\n` +
      `- emailSubject: short compelling subject line (under 10 words)\n` +
      `- emailBody: 3 paragraphs. Para 1: address them by name, reference their company/industry/gap from signals. Para 2: what Tec Tha can specifically solve for them. Para 3: CTA for a 15-min call. No placeholders like [Your Name] — use real values.`

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a B2B cold email copywriter. Respond ONLY with valid JSON, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[generate-email] Groq error:", err)
      return NextResponse.json({ error: "Groq request failed" }, { status: 500 })
    }

    const data = await res.json()
    const raw = (data?.choices?.[0]?.message?.content || "{}") as string
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error("[generate-email] No JSON found in:", clean)
      return NextResponse.json({ error: "AI returned no JSON" }, { status: 500 })
    }
    // Re-serialize each string value to properly escape literal newlines/control chars
    const sanitized = match[0].replace(/"([^"]*)"/g, (_, inner) => JSON.stringify(inner))
    const parsed: { emailSubject?: string; emailBody?: string } = JSON.parse(sanitized)

    const { emailSubject, emailBody } = parsed
    if (!emailSubject || !emailBody) {
      return NextResponse.json({ error: "AI returned incomplete data" }, { status: 500 })
    }

    const updated = await prisma.crmContact.update({
      where: { id },
      data: { emailSubject, emailBody },
      include: {
        activities: { take: 5, orderBy: { createdAt: "desc" } },
        tasks: { where: { completedAt: null }, orderBy: { scheduledAt: "asc" } },
      },
    })

    await prisma.crmActivity.create({
      data: {
        contactId: id,
        type: "enrich",
        summary: `AI cold email generated: "${emailSubject}"`,
      },
    })

    return NextResponse.json({ contact: updated })
  } catch (err) {
    console.error("[crm/[id]/generate-email POST]", err)
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 })
  }
}
