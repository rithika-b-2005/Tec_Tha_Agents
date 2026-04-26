import { NextResponse } from "next/server"

const GROQ_KEY = process.env.GROQ_API_KEY || ""

export async function POST(request: Request) {
  try {
    const { platformUrl } = await request.json()
    if (!platformUrl) {
      return NextResponse.json({ error: "platformUrl is required" }, { status: 400 })
    }
    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
    }

    // Fetch page HTML to understand the app
    let pageContent = ""
    try {
      const res = await fetch(platformUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TestBot/1.0)" },
        signal: AbortSignal.timeout(10_000),
      })
      const html = await res.text()
      // Extract visible text + form/button info — strip most tags
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000)
    } catch {
      pageContent = "Could not fetch page — generate based on URL and domain only."
    }

    const prompt =
      `You are a QA engineer. Analyze this web app and generate a list of practical test cases.\n\n` +
      `URL: ${platformUrl}\n` +
      `Page content (truncated):\n${pageContent}\n\n` +
      `Return ONLY valid JSON with this exact structure:\n` +
      `{ "testCases": [ { "category": "Auth|Navigation|Forms|UI|API|Performance", "name": "short test case name" } ] }\n\n` +
      `Rules:\n` +
      `- Generate 10-15 test cases\n` +
      `- Be specific to what you see on the page\n` +
      `- Cover: login/signup, key user flows, form validation, error states, navigation\n` +
      `- Name must be plain English, under 10 words, starting with a verb (e.g. "User can login with valid credentials")\n` +
      `- No placeholders, no generic names like "Test feature X"`

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a QA engineer. Respond ONLY with valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const data = await res.json()
    const raw = (data?.choices?.[0]?.message?.content || "{}") as string
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: "AI returned no JSON" }, { status: 500 })

    const sanitized = match[0].replace(/"([^"]*)"/g, (_, inner) => JSON.stringify(inner))
    const parsed = JSON.parse(sanitized)

    return NextResponse.json({ testCases: parsed.testCases || [] })
  } catch (err) {
    console.error("[test/suggest POST]", err)
    return NextResponse.json({ error: "Failed to suggest test cases" }, { status: 500 })
  }
}
