import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY || ""

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 })
    }

    const q = query.trim()

    // Text search across title, content, summary, and tags
    const textResults = await prisma.brainNote.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        tags: true,
        category: true,
        source: true,
        createdAt: true,
      },
    })

    // If Groq available, also do conceptual search on all notes
    let conceptualIds: string[] = []
    if (GROQ_KEY) {
      try {
        const allNotes = await prisma.brainNote.findMany({
          select: { id: true, title: true, summary: true, tags: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })

        if (allNotes.length > 0) {
          const notesContext = allNotes
            .map((n) => `ID:${n.id} | ${n.title} | ${(n.tags || []).join(", ")} | ${n.summary || ""}`)
            .join("\n")

          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              max_tokens: 200,
              temperature: 0.2,
              messages: [
                {
                  role: "system",
                  content:
                    "You find conceptually related notes. Return a JSON array of IDs (strings) only — no extra text.",
                },
                {
                  role: "user",
                  content: `Query: "${q}"\n\nNotes:\n${notesContext}\n\nReturn JSON array of the most relevant note IDs (max 10), ordered by relevance: ["id1", "id2", ...]`,
                },
              ],
            }),
          })

          const data = await res.json()
          const raw = data?.choices?.[0]?.message?.content?.trim() || "[]"
          const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
          const parsed = JSON.parse(cleaned)
          if (Array.isArray(parsed)) conceptualIds = parsed
        }
      } catch {
        // Conceptual search failed; proceed with text results only
      }
    }

    // Merge and deduplicate, text results first
    const textIds = new Set(textResults.map((n) => n.id))
    const conceptualOnlyIds = conceptualIds.filter((id) => !textIds.has(id))

    let conceptualNotes: typeof textResults = []
    if (conceptualOnlyIds.length > 0) {
      conceptualNotes = await prisma.brainNote.findMany({
        where: { id: { in: conceptualOnlyIds } },
        select: {
          id: true,
          title: true,
          summary: true,
          tags: true,
          category: true,
          source: true,
          createdAt: true,
        },
      })
      // Sort by conceptualIds order
      conceptualNotes.sort(
        (a, b) => conceptualOnlyIds.indexOf(a.id) - conceptualOnlyIds.indexOf(b.id)
      )
    }

    const results = [...textResults, ...conceptualNotes]

    return NextResponse.json({ results, total: results.length })
  } catch (err) {
    console.error("[brain/search POST]", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
