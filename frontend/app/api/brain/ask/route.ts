import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY || ""

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
    }

    const notes = await prisma.brainNote.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, summary: true, tags: true, category: true },
    })

    if (notes.length === 0) {
      return NextResponse.json({
        answer: "Your Second Brain is empty. Save some notes first, then ask questions.",
        relevantNotes: [],
      })
    }

    // Build context — truncate at ~12000 chars total
    let context = ""
    const usedNoteIds: string[] = []
    for (const note of notes) {
      const entry = `[${note.id}] ${note.title}\nCategory: ${note.category || "note"} | Tags: ${(note.tags || []).join(", ")}\n${note.content}\n\n`
      if (context.length + entry.length > 12000) break
      context += entry
      usedNoteIds.push(note.id)
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that answers questions based solely on the user's saved knowledge base.
When answering, reference the relevant notes where appropriate.
After your answer, on a new line write: RELEVANT_NOTE_IDS: followed by a comma-separated list of the note IDs (in [brackets]) that were most useful.
If the knowledge base doesn't contain relevant information, say so clearly.`,
          },
          {
            role: "user",
            content: `Knowledge base:\n\n${context}\n\nQuestion: ${question.trim()}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const fullResponse = data?.choices?.[0]?.message?.content?.trim() || ""

    // Extract relevant note IDs from response
    let answer = fullResponse
    let relevantNotes: string[] = []

    const idLineMatch = fullResponse.match(/RELEVANT_NOTE_IDS:\s*(.+)$/m)
    if (idLineMatch) {
      answer = fullResponse.replace(/\nRELEVANT_NOTE_IDS:.+$/m, "").trim()
      const idMatches = idLineMatch[1].match(/\[([^\]]+)\]/g)
      if (idMatches) {
        relevantNotes = idMatches
          .map((m: string) => m.replace(/[\[\]]/g, "").trim())
          .filter((id: string) => usedNoteIds.includes(id))
      }
    }

    return NextResponse.json({ answer, relevantNotes })
  } catch (err) {
    console.error("[brain/ask POST]", err)
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 })
  }
}
