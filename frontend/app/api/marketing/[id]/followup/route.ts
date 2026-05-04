import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const GROQ_KEY = process.env.GROQ_API_KEY || ""

async function groq(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ""
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })

    const lead = await prisma.marketingLead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

    const context =
      `Company: ${lead.name}\n` +
      `Industry: ${lead.industry || "general"}\n` +
      `Location: ${lead.location || "N/A"}\n` +
      `Campaign idea: ${lead.campaignIdea || "N/A"}\n` +
      `Content angle: ${lead.contentAngle || "N/A"}\n` +
      `Need signals: ${lead.needSignals || "N/A"}\n` +
      `First email subject sent: ${lead.emailSubject || "N/A"}`

    const system = `You are a B2B follow-up email specialist for Tec Tha, an AI automation platform.
Write short, punchy follow-up emails. No filler. Each email must be different in angle.
Respond ONLY with valid JSON — no markdown, no extra text.`

    const sequence = await groq(system,
      `Write a 3-email follow-up sequence for this prospect who hasn't replied yet.\n\n${context}\n\n` +
      `Return JSON array with exactly 3 objects:\n` +
      `[{ "day": 3, "subject": "...", "body": "..." }, { "day": 7, "subject": "...", "body": "..." }, { "day": 14, "subject": "...", "body": "..." }]\n\n` +
      `Rules:\n` +
      `- Day 3: soft bump — "just following up", reference first email angle\n` +
      `- Day 7: new value angle — share a different pain point or quick win\n` +
      `- Day 14: breakup email — short, no pressure, leave door open\n` +
      `Each body max 4 sentences. No placeholder text.`
    )

    // Parse JSON from response
    const match = sequence.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: "Failed to generate sequence" }, { status: 500 })

    const emails = JSON.parse(match[0]) as { day: number; subject: string; body: string }[]

    return NextResponse.json({ emails })
  } catch (err) {
    console.error("[marketing/[id]/followup POST]", err)
    return NextResponse.json({ error: "Failed to generate follow-up sequence" }, { status: 500 })
  }
}
