export interface TestPlan {
  testName: string
  description: string
  steps: Array<{ action: string; target: string; value?: string; description: string }>
  assertions: Array<{ type: string; selector?: string; expected: string }>
  testData: Record<string, string>
  priority: "critical" | "high" | "medium" | "low"
  estimatedDuration: number
}

export async function generateTestPlans(
  platformUrl: string,
  testDescriptions: string[],
): Promise<TestPlan[]> {
  const Groq = require("groq-sdk")
  const client = new Groq.default()

  const prompt = `You are a QA engineer. Convert the following test descriptions into structured Playwright test plans.

Platform URL: ${platformUrl}

Test descriptions:
${testDescriptions.map((desc, i) => `${i + 1}. ${desc}`).join("\n")}

Return a JSON array of test plans. Each plan has this structure:
{
  "testName": "string",
  "description": "string",
  "steps": [
    { "action": "navigate|click|fill|assert_text|assert_visible|assert_url|wait|select|press|hover|screenshot", "target": "CSS selector or text", "value": "optional value for fill/select", "description": "human readable" }
  ],
  "assertions": [
    { "type": "text|url|visible|count", "selector": "CSS selector", "expected": "expected value" }
  ],
  "testData": { "fieldName": "placeholder value" },
  "priority": "critical|high|medium|low",
  "estimatedDuration": 30
}

IMPORTANT:
- Use semantic selectors: button[type="submit"], input[name="email"], [role="button"], :has-text("Login")
- Avoid fragile nth-child selectors
- For assertions, use exact selectors
- Return ONLY valid JSON array, no markdown`

  const message = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  const content = message.choices[0]?.message?.content || ""
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Failed to parse test plans from Groq response")

  return JSON.parse(match[0]) as TestPlan[]
}
