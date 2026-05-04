import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { NextResponse } from "next/server"

export const maxDuration = 300

// ── Tool definitions (Anthropic format — converted for Groq below) ──────────

const TOOLS_ANTHROPIC: Anthropic.Tool[] = [
  {
    name: "generate_leads",
    description:
      "Search Google Maps for businesses in a location, enrich each lead with contact data and AI insights (ICP score, cold email, need signals), and save to database. Use when user wants to find or generate leads.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessType: { type: "string", description: "Type of business (e.g. roofing companies, dentists, law firms)" },
        location:     { type: "string", description: "City and state or country (e.g. Dallas TX, Austin Texas)" },
        maxLeads:     { type: "number", description: "Max leads to generate, between 3 and 25. Default 10." },
        yourService:  { type: "string", description: "Service being offered to these leads" },
        senderName:   { type: "string", description: "Name of the person sending outreach" },
        senderCompany:{ type: "string", description: "Company sending outreach" },
      },
      required: ["businessType", "location"],
    },
  },
  {
    name: "run_market_research",
    description:
      "Research an industry — market size, key trends, competitors, target audience, pain points, and opportunities. Use before generating leads or when user asks for research.",
    input_schema: {
      type: "object" as const,
      properties: {
        industry: { type: "string", description: "Industry to research (e.g. roofing, dental, SaaS)" },
        topic:    { type: "string", description: "Specific topic within the industry (optional)" },
        region:   { type: "string", description: "Geographic region. Default: Global" },
      },
      required: ["industry"],
    },
  },
  {
    name: "sync_to_crm",
    description:
      "Sync all leads from Lead, SalesLead, and MarketingLead tables into the unified CRM pipeline. Always call after generating leads.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_pipeline_stats",
    description:
      "Get current CRM pipeline statistics — total contacts, hot/warm/cold counts, stage breakdown, average score, conversion rates.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
]

// Convert Anthropic tool format → Groq/OpenAI format
const TOOLS_GROQ: Groq.Chat.Completions.ChatCompletionTool[] = TOOLS_ANTHROPIC.map(t => ({
  type: "function" as const,
  function: {
    name:        t.name,
    description: t.description,
    parameters:  t.input_schema,
  },
}))

const SYSTEM_PROMPT = `You are an AI automation orchestrator for Tec Tha, a B2B sales automation platform.

CRITICAL: You MUST use tools to complete the task. Never answer from memory. Always call tools.

Standard pipeline — execute in this order:
1. generate_leads — ALWAYS call this first for any lead/prospect request
2. sync_to_crm — ALWAYS call this after generate_leads completes
3. get_pipeline_stats — call this last to report results
4. run_market_research — only if user explicitly asks for market research

Rules:
- You MUST call generate_leads for any request involving finding, generating, or getting leads
- You MUST call sync_to_crm after generate_leads — never skip this
- Default senderCompany to "Tec Tha", yourService to "AI-powered business automation", maxLeads to 10
- After all tools complete, give a concise summary: what was done, key numbers, recommended next step`

// ── Tool executor (shared by both backends) ──────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>, baseUrl: string): Promise<string> {
  try {
    switch (name) {
      case "generate_leads": {
        const res = await fetch(`${baseUrl}/api/leads/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(120_000),
        })
        const data = await res.json() as { leads?: unknown[]; message?: string; error?: string }
        if (data.error) return `Lead generation failed: ${data.error}`
        return `Lead generation complete. ${data.message ?? `Generated ${data.leads?.length ?? 0} leads.`}`
      }

      case "run_market_research": {
        const startRes = await fetch(`${baseUrl}/api/research/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(15_000),
        })
        const started = await startRes.json() as { reportId?: string; error?: string }
        if (started.error || !started.reportId) return `Research failed to start: ${started.error ?? "unknown"}`

        for (let i = 0; i < 18; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const pollRes = await fetch(`${baseUrl}/api/research/${started.reportId}`)
          const body = await pollRes.json() as { report?: { status?: string; sections?: string; error?: string } }
          const report = body.report ?? {}
          if (report.status === "done") {
            const sections = report.sections ? JSON.parse(report.sections) as Record<string, string> : {}
            return `Market research complete for "${input.industry}".\n\nSummary: ${sections.summary ?? "N/A"}\n\nTop trends: ${sections.trends?.slice(0, 300) ?? "N/A"}`
          }
          if (report.status === "failed") return `Research failed: ${report.error ?? "unknown"}`
        }
        return `Research for "${input.industry}" still processing. Report ID: ${started.reportId}`
      }

      case "sync_to_crm": {
        const res = await fetch(`${baseUrl}/api/crm/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(30_000),
        })
        const data = await res.json() as { created?: number; updated?: number; total?: number; error?: string; message?: string }
        if (data.error) return `CRM sync failed: ${data.error}`
        return `CRM sync complete. Created ${data.created ?? 0} new contacts, updated ${data.updated ?? 0} existing. Total: ${data.total ?? 0}.`
      }

      case "get_pipeline_stats": {
        const res = await fetch(`${baseUrl}/api/crm/metrics`, { signal: AbortSignal.timeout(15_000) })
        const stats = await res.json() as {
          summary?: Record<string, unknown>
          distribution?: { byIcp?: Record<string, number> }
        }
        const s = stats.summary ?? {}
        const icp = stats.distribution?.byIcp ?? {}
        return (
          `Pipeline stats:\n` +
          `• Total contacts: ${s.totalContacts ?? 0}\n` +
          `• Hot: ${icp.Hot ?? 0} | Warm: ${icp.Warm ?? 0} | Cold: ${icp.Cold ?? 0}\n` +
          `• Contacted: ${s.contacted ?? 0} | Qualified: ${s.qualified ?? 0} | Won: ${s.won ?? 0}\n` +
          `• Avg ICP score: ${s.avgScore ?? "N/A"} | Conversion: ${s.conversionRate ?? "N/A"}`
        )
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err) {
    return `Tool "${name}" error: ${err instanceof Error ? err.message : String(err)}`
  }
}

export interface OrchestratorStep {
  tool: string
  input: unknown
  result: string
}

// ── Anthropic agentic loop ───────────────────────────────────────────────────

async function runWithAnthropic(
  goal: string,
  context: string | undefined,
  baseUrl: string
): Promise<{ summary: string; steps: OrchestratorStep[] }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: goal + (context ? `\n\nContext: ${context}` : "") },
  ]
  const steps: OrchestratorStep[] = []

  for (let iter = 0; iter < 10; iter++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS_ANTHROPIC,
      messages,
    })

    messages.push({ role: "assistant", content: response.content })

    if (response.stop_reason === "end_turn") {
      const summary = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("\n")
      return { summary, steps }
    }

    if (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      )
      const toolResults = await Promise.all(
        toolBlocks.map(async block => {
          const result = await executeTool(block.name, block.input as Record<string, unknown>, baseUrl)
          steps.push({ tool: block.name, input: block.input, result })
          return { type: "tool_result" as const, tool_use_id: block.id, content: result }
        })
      )
      messages.push({ role: "user", content: toolResults })
    } else {
      break
    }
  }

  throw new Error("Anthropic loop limit reached")
}

// ── Groq agentic loop ────────────────────────────────────────────────────────

async function runWithGroq(
  goal: string,
  context: string | undefined,
  baseUrl: string
): Promise<{ summary: string; steps: OrchestratorStep[] }> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam
  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: goal + (context ? `\n\nContext: ${context}` : "") },
  ]
  const steps: OrchestratorStep[] = []

  for (let iter = 0; iter < 10; iter++) {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.3,
      tools: TOOLS_GROQ,
      tool_choice: "auto",
      messages,
    })

    const msg = response.choices[0].message
    messages.push(msg as GroqMessage)

    const finishReason = response.choices[0].finish_reason

    if (finishReason === "tool_calls" && msg.tool_calls?.length) {
      // Execute all tool calls concurrently
      const results = await Promise.all(
        msg.tool_calls.map(async tc => {
          let input: Record<string, unknown> = {}
          try { input = JSON.parse(tc.function.arguments) as Record<string, unknown> } catch {}
          const result = await executeTool(tc.function.name, input, baseUrl)
          steps.push({ tool: tc.function.name, input, result })
          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: result,
          }
        })
      )
      messages.push(...results)
    } else {
      // end_turn or stop
      return { summary: msg.content ?? "Pipeline complete.", steps }
    }
  }

  throw new Error("Groq loop limit reached")
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { goal, context } = await request.json() as { goal?: string; context?: string }
    if (!goal?.trim()) return NextResponse.json({ error: "goal is required" }, { status: 400 })

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasGroq      = !!process.env.GROQ_API_KEY

    if (!hasAnthropic && !hasGroq) {
      return NextResponse.json(
        { error: "No AI key found. Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env" },
        { status: 503 }
      )
    }

    const url     = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const backend = hasAnthropic ? "anthropic" : "groq"

    const { summary, steps } = hasAnthropic
      ? await runWithAnthropic(goal.trim(), context?.trim(), baseUrl)
      : await runWithGroq(goal.trim(), context?.trim(), baseUrl)

    return NextResponse.json({ summary, steps, totalSteps: steps.length, backend })
  } catch (err) {
    console.error("[orchestrator POST]", err)
    return NextResponse.json({ error: "Orchestrator failed" }, { status: 500 })
  }
}
