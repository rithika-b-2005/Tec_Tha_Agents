import { NextResponse } from "next/server"

const GROQ_KEY = process.env.GROQ_API_KEY || ""

async function groq(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ""
}

export async function POST(request: Request) {
  try {
    if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })

    const { topic, postType, targetIndustry, painPoint } = await request.json() as {
      topic?: string
      postType?: string
      targetIndustry?: string
      painPoint?: string
    }

    if (!topic?.trim()) return NextResponse.json({ error: "topic is required" }, { status: 400 })

    const type = postType || "thought_leadership"

    const typeInstructions: Record<string, string> = {
      thought_leadership: "Write a LinkedIn thought leadership post. Start with a bold hook (1 line), then 3-4 short punchy paragraphs, end with a question to drive comments. Use line breaks between each paragraph.",
      how_to:             "Write a LinkedIn how-to post. Hook line, then numbered steps (5-7 steps), each 1 sentence. End with a CTA to DM you.",
      story:              "Write a LinkedIn story post. Hook with a surprising outcome, tell the before/after story in 4-5 short paragraphs, close with the lesson and a call to action.",
      results:            "Write a LinkedIn results/social proof post. Lead with a specific number result, break down how it was achieved in 3-4 bullet points, end with a question or CTA.",
    }

    const instruction = typeInstructions[type] || typeInstructions.thought_leadership

    const system = `You are a LinkedIn content expert for B2B SaaS companies.
Write posts that get high engagement — short sentences, white space, no corporate jargon.
Company: Tec Tha — AI automation platform for lead generation, enrichment, and outreach.`

    const post = await groq(system,
      `Write a LinkedIn post about: "${topic}"\n` +
      (targetIndustry ? `Target audience: ${targetIndustry} businesses\n` : "") +
      (painPoint ? `Pain point to address: ${painPoint}\n` : "") +
      `\nPost type: ${instruction}\n` +
      `\nAlso provide:\n` +
      `- 5 relevant hashtags\n` +
      `- A hook alternative (different opening line to A/B test)\n\n` +
      `Format your response as:\n` +
      `POST:\n[post content]\n\nHASHTAGS:\n[hashtags]\n\nHOOK ALTERNATIVE:\n[alternative first line]`
    )

    // Parse sections
    const postMatch    = post.match(/POST:\n([\s\S]*?)(?:\n\nHASHTAGS:|$)/)
    const hashMatch    = post.match(/HASHTAGS:\n([\s\S]*?)(?:\n\nHOOK ALTERNATIVE:|$)/)
    const hookMatch    = post.match(/HOOK ALTERNATIVE:\n([\s\S]*)/)

    return NextResponse.json({
      post:            postMatch?.[1]?.trim()  || post,
      hashtags:        hashMatch?.[1]?.trim()  || "",
      hookAlternative: hookMatch?.[1]?.trim()  || "",
      postType:        type,
    })
  } catch (err) {
    console.error("[marketing/linkedin POST]", err)
    return NextResponse.json({ error: "Failed to generate LinkedIn post" }, { status: 500 })
  }
}
