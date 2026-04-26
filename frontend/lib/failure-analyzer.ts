import { TestPlan } from "./test-planner"
import { TestExecutionResult } from "./test-executor"

export interface FailureAnalysis {
  title: string
  rootCause: string
  severity: "P0" | "P1" | "P2" | "P3" | "P4"
  category: "ui" | "api" | "logic" | "performance" | "accessibility"
  reproSteps: string[]
  expected: string
  actual: string
  fixSuggestion: string
}

export async function analyzeFailure(
  plan: TestPlan,
  result: TestExecutionResult,
): Promise<FailureAnalysis> {
  const failedStep = result.steps.find((s) => s.status === "fail")
  const flaggedNetworkCalls = result.networkLogs.filter((n) => n.flagged)
  const errorConsoles = result.consoleLogs.slice(0, 5)

  const prompt = `You are a senior QA engineer. Diagnose this test failure with precision.

Test Name: ${plan.testName}
Test Description: ${plan.description}

Failed Step: ${failedStep?.action} on "${failedStep?.target}"
Error Message: ${failedStep?.error || result.error}

Recent Console Errors:
${errorConsoles.length > 0 ? errorConsoles.join("\n") : "None"}

Flagged Network Calls (4xx/5xx):
${
  flaggedNetworkCalls.length > 0
    ? flaggedNetworkCalls.map((n) => `${n.method} ${n.url} → ${n.status}`).join("\n")
    : "None"
}

${result.screenshot ? "Screenshot available (PNG base64)" : "No screenshot"}

Severity Rules:
- P0: Crash, data loss, auth bypass, payment failure
- P1: Core feature completely broken (login fails, form won't submit)
- P2: Significant UX degradation (broken layout, slow response >5s)
- P3: Minor functional issue with workaround
- P4: Cosmetic/copy issue

Return JSON with this exact structure:
{
  "title": "brief issue title",
  "rootCause": "detailed explanation of why the test failed",
  "severity": "P0|P1|P2|P3|P4",
  "category": "ui|api|logic|performance|accessibility",
  "reproSteps": ["step 1", "step 2", ...],
  "expected": "what should happen",
  "actual": "what actually happened",
  "fixSuggestion": "what needs to be fixed in the app"
}

Return ONLY valid JSON, no markdown.`

  const Groq = require("groq-sdk")
  const client = new Groq.default()

  const message = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  const content = message.choices[0]?.message?.content || ""
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Failed to parse failure analysis from Groq")

  return JSON.parse(match[0]) as FailureAnalysis
}
