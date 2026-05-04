import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY || ""

async function analyzeWithGroq(content: string): Promise<{
  title: string
  summary: string
  tags: string[]
  category: string
}> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            'You are a knowledge organizer. Always respond with valid JSON only, no extra text.',
        },
        {
          role: "user",
          content: `Analyze this content and return JSON:
{
  "title": "8 words max title",
  "summary": "2 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "idea|article|meeting|note|research|other"
}

Content: ${content}`,
        },
      ],
    }),
  })

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content?.trim() || "{}"

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      title: content.slice(0, 60),
      summary: content.slice(0, 200),
      tags: [],
      category: "note",
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, source } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
    }

    const analysis = await analyzeWithGroq(content.trim())

    const note = await prisma.brainNote.create({
      data: {
        title: analysis.title || content.slice(0, 60),
        content: content.trim(),
        summary: analysis.summary || null,
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        category: analysis.category || "note",
        source: source || null,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    console.error("[brain/save POST]", err)
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 })
  }
}
