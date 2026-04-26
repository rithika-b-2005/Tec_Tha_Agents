import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const GROQ_KEY = process.env.GROQ_API_KEY || ""
const SERPER_KEY = process.env.SERPER_API_KEY || ""

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 6 }),
    })
    const data = await res.json()
    const organic = data.organic || []
    const snippets = organic.map((r: any) => `• ${r.title}: ${r.snippet}`).join("\n")
    const answerBox = data.answerBox?.answer || data.answerBox?.snippet || ""
    return (answerBox ? `Key finding: ${answerBox}\n\n` : "") + snippets
  } catch {
    return ""
  }
}

async function groqAnalyze(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 700,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ""
}

async function runResearch(reportId: string, industry: string, topic: string | null, region: string) {
  const subject = topic ? `${topic} in ${industry}` : industry
  const regionCtx = region !== "Global" ? ` in ${region}` : ""

  try {
    const update = (status: string, extra?: object) =>
      prisma.researchReport.update({ where: { id: reportId }, data: { status, ...extra } })

    const sections: Record<string, string> = {}

    // ── Market Size & Growth ─────────────────────────────────────
    await update("researching_market")
    const marketSearch = await searchWeb(`${subject} market size growth revenue 2024 2025${regionCtx}`)
    sections.market = await groqAnalyze(
      "You are a market research analyst. Write concise, data-rich analysis with numbers where available.",
      `Based on these search results about ${subject} market size${regionCtx}:\n\n${marketSearch}\n\nWrite a 150-word market size & growth analysis. Include market value, CAGR, and projections where available.`
    )

    // ── Key Trends ───────────────────────────────────────────────
    await update("researching_trends")
    const trendsSearch = await searchWeb(`${subject} industry trends 2025 future${regionCtx}`)
    sections.trends = await groqAnalyze(
      "You are a market research analyst. Be specific and forward-looking.",
      `Based on these search results about ${subject} trends${regionCtx}:\n\n${trendsSearch}\n\nWrite 5 key industry trends as bullet points, each 1-2 sentences. Start each with a trend name in bold format like **Trend Name**: description.`
    )

    // ── Competitors ──────────────────────────────────────────────
    await update("researching_competitors")
    const compSearch = await searchWeb(`${subject} top companies competitors market leaders${regionCtx}`)
    sections.competitors = await groqAnalyze(
      "You are a competitive intelligence analyst.",
      `Based on these search results about ${subject} competitors${regionCtx}:\n\n${compSearch}\n\nList the top 5-7 key players/competitors. For each write: name, brief description, and what makes them notable. Format: **Company Name**: description.`
    )

    // ── Target Audience ──────────────────────────────────────────
    await update("researching_audience")
    const audienceSearch = await searchWeb(`${subject} target audience customers demographics who buys uses${regionCtx}`)
    sections.audience = await groqAnalyze(
      "You are a customer research specialist.",
      `Based on these search results about ${subject} customers${regionCtx}:\n\n${audienceSearch}\n\nDescribe the primary target audience segments in 120 words. Include demographics, job roles, behaviours, and motivations.`
    )

    // ── Pain Points ──────────────────────────────────────────────
    await update("researching_pain_points")
    const painSearch = await searchWeb(`${subject} challenges problems pain points customer complaints${regionCtx}`)
    sections.painPoints = await groqAnalyze(
      "You are a user research analyst focused on customer problems.",
      `Based on these search results about ${subject} challenges${regionCtx}:\n\n${painSearch}\n\nList 5 major pain points and challenges in the market. Format: **Pain Point**: explanation. Be specific.`
    )

    // ── Opportunities ────────────────────────────────────────────
    await update("researching_opportunities")
    const oppSearch = await searchWeb(`${subject} market opportunities gaps untapped growth potential${regionCtx}`)
    sections.opportunities = await groqAnalyze(
      "You are a business strategy consultant.",
      `Based on these search results about ${subject} opportunities${regionCtx}:\n\n${oppSearch}\n\nIdentify 5 key market opportunities and white spaces. Format: **Opportunity**: explanation with why it matters.`
    )

    // ── News & Recent Developments ───────────────────────────────
    await update("researching_news")
    const newsSearch = await searchWeb(`${subject} latest news funding investment 2025${regionCtx}`)
    sections.news = await groqAnalyze(
      "You are a business news analyst.",
      `Based on these recent news snippets about ${subject}${regionCtx}:\n\n${newsSearch}\n\nSummarise the 3-4 most significant recent developments or news items in 120 words.`
    )

    // ── Executive Summary ────────────────────────────────────────
    await update("synthesizing")
    sections.summary = await groqAnalyze(
      "You are a senior market research analyst writing an executive brief.",
      `Write a compelling 200-word executive summary for a market research report on: ${subject}${regionCtx}.\n\nKey findings to incorporate:\n- Market: ${sections.market?.slice(0, 200)}\n- Top trends: ${sections.trends?.slice(0, 200)}\n- Key opportunity: ${sections.opportunities?.slice(0, 150)}\n\nMake it decision-ready for a business executive.`
    )

    // ── Recommendations ──────────────────────────────────────────
    sections.recommendations = await groqAnalyze(
      "You are a business strategy consultant giving actionable advice.",
      `Based on the research about ${subject}${regionCtx}, provide 5 strategic recommendations for a business entering or operating in this market. Format: **Recommendation**: action and rationale.`
    )

    await update("done", { sections: JSON.stringify(sections) })
    console.log(`[research] ${reportId} done`)

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[research] ${reportId} failed:`, error)
    await prisma.researchReport.update({ where: { id: reportId }, data: { status: "failed", error } })
  }
}

export async function POST(request: Request) {
  const { industry, topic, region } = await request.json()

  if (!industry?.trim()) return NextResponse.json({ error: "Industry is required" }, { status: 400 })
  if (!GROQ_KEY) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 })
  if (!SERPER_KEY) return NextResponse.json({ error: "SERPER_API_KEY not set" }, { status: 500 })

  const report = await prisma.researchReport.create({
    data: {
      industry: industry.trim(),
      topic: topic?.trim() || null,
      region: region || "Global",
      status: "pending",
    },
  })

  runResearch(report.id, industry.trim(), topic?.trim() || null, region || "Global").catch(console.error)

  return NextResponse.json({ reportId: report.id })
}
