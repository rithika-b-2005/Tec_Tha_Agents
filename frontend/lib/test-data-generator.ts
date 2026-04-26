import { TestPlan } from "./test-planner"

export interface TestDataSet {
  label: "valid" | "boundary" | "invalid"
  data: Record<string, string>
  description: string
}

export async function generateTestData(
  testPlan: TestPlan,
  platformUrl: string,
): Promise<TestDataSet[]> {
  const fieldNames = Object.keys(testPlan.testData)
  const fieldPrompt = fieldNames
    .map((field) => {
      let type = "text"
      if (field.toLowerCase().includes("email")) type = "email"
      else if (field.toLowerCase().includes("password") || field.toLowerCase().includes("pass")) type = "password"
      else if (field.toLowerCase().includes("phone")) type = "phone"
      else if (field.toLowerCase().includes("date")) type = "date"
      else if (field.toLowerCase().includes("credit") || field.toLowerCase().includes("card")) type = "creditCard"
      else if (field.toLowerCase().includes("name")) type = "name"
      else if (field.toLowerCase().includes("address")) type = "address"
      return `- ${field} (type: ${type})`
    })
    .join("\n")

  const prompt = `Generate realistic test data for these fields:
${fieldPrompt}

Platform: ${platformUrl}

Return a JSON array with 3 data sets:
[
  {
    "label": "valid",
    "data": { "field1": "realistic value", ... },
    "description": "valid, realistic data"
  },
  {
    "label": "boundary",
    "data": { "field1": "edge case value", ... },
    "description": "boundary/edge cases"
  },
  {
    "label": "invalid",
    "data": { "field1": "invalid value", ... },
    "description": "invalid data for error testing"
  }
]

For emails: use valid sandbox emails like test+${Date.now()}@example.com
For passwords: use strong passwords like TempPass123!${Date.now()}
For dates: use future dates in YYYY-MM-DD format
For credit cards: use sandbox test cards like 4242 4242 4242 4242
For names: use realistic first/last name combinations
For phone: use valid formats like +1234567890

Return ONLY valid JSON array, no markdown.`

  const Groq = require("groq-sdk")
  const client = new Groq.default()

  const message = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1000,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  })

  const content = message.choices[0]?.message?.content || ""
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Failed to parse test data")

  return JSON.parse(match[0]) as TestDataSet[]
}
