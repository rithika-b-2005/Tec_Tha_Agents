import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY

async function groqChat(systemPrompt: string, userContent: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
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
  return data.choices?.[0]?.message?.content ?? ""
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name
    const fileSize = file.size
    const fileMime = file.type
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "txt"

    // Determine document type
    let docType = "txt"
    if (fileMime === "application/pdf" || ext === "pdf") docType = "pdf"
    else if (fileMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") docType = "docx"
    else docType = "txt"

    // Extract text content
    let extractedText = ""

    if (docType === "txt") {
      extractedText = await file.text()
    } else {
      // For PDF/DOCX: read as text first (may have garbled output),
      // then pass to Groq for intelligent extraction
      const rawText = await file.text()
      // Limit to 10000 chars to avoid token overflow
      const truncated = rawText.slice(0, 10000)

      // Use Groq to extract meaningful text from potentially garbled content
      extractedText = await groqChat(
        "You are a document text extraction assistant. You will receive raw text that may be garbled from a PDF or DOCX binary. Extract and reconstruct all readable, meaningful text from it. Return only the clean extracted text, preserving structure (headings, paragraphs, lists). Do NOT add commentary.",
        `Raw file content (may be garbled binary/PDF text):\n\n${truncated}`
      )
    }

    // Trim extracted text to 50000 chars for storage
    const content = extractedText.trim().slice(0, 50000)

    // Generate summary using Groq
    const summary = await groqChat(
      "You are a document summarization assistant. Provide a clear, concise summary in 150-200 words. Capture the key purpose, main points, parties involved (if any), and important details of the document.",
      `Document: "${fileName}"\n\nContent:\n${content.slice(0, 8000)}`
    )

    // Save to DB
    const document = await prisma.document.create({
      data: {
        name: fileName,
        type: docType,
        size: fileSize,
        content,
        summary: summary.trim(),
      },
    })

    return NextResponse.json({
      documentId: document.id,
      summary: document.summary,
      name: document.name,
    })
  } catch (err: unknown) {
    console.error("Document upload error:", err)
    const message = err instanceof Error ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
