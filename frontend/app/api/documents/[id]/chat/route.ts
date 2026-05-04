import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY

const SYSTEM_PROMPT = `You are a document analysis assistant. Answer questions based ONLY on the provided document content.
If the answer isn't in the document, say "This information isn't in the document."
Be concise and precise. Quote relevant parts when helpful.`

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { question } = body as { question: string }

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Get document with message history
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20, // last 20 messages for context
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Build message history
    const historyMessages = document.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    // Truncate document content to avoid token limits
    const docContent = document.content.slice(0, 12000)

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\n--- DOCUMENT: "${document.name}" ---\n${docContent}\n--- END OF DOCUMENT ---`,
          },
          ...historyMessages,
          { role: "user", content: question },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error: ${err}`)
    }

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content ?? "I could not generate a response."

    // Save both messages to DB
    await prisma.documentMessage.createMany({
      data: [
        { documentId: id, role: "user", content: question },
        { documentId: id, role: "assistant", content: answer },
      ],
    })

    return NextResponse.json({ answer })
  } catch (err: unknown) {
    console.error("Document chat error:", err)
    const message = err instanceof Error ? err.message : "Chat failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
