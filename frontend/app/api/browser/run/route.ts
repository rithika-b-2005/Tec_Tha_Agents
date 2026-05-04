import { prisma } from "@/lib/prisma"
import { chromium } from "playwright"

export const runtime    = "nodejs"
export const maxDuration = 120

const GROQ_KEY = process.env.GROQ_API_KEY || ""

async function groq(system: string, user: string, json = false): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.2,
      response_format: json ? { type: "json_object" } : undefined,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ""
}

interface BrowserStep {
  action: "navigate" | "click" | "type" | "extract" | "screenshot" | "wait" | "scroll"
  selector?: string | null
  value?: string | null
  description: string
}

export async function POST(request: Request) {
  if (!GROQ_KEY) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "GROQ_API_KEY not set" })}\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    )
  }

  let body: { instruction?: string; url?: string; extractType?: string }
  try { body = await request.json() }
  catch { return new Response(`data: ${JSON.stringify({ type: "error", message: "Invalid JSON" })}\n\n`, { headers: { "Content-Type": "text/event-stream" } }) }

  const { instruction, url, extractType = "custom", viewport = "desktop", fullPage = false } = body
  if (!instruction?.trim() || !url?.trim()) {
    return new Response(`data: ${JSON.stringify({ type: "error", message: "instruction and url required" })}\n\n`, { headers: { "Content-Type": "text/event-stream" } })
  }

  const targetUrl = url.startsWith("http") ? url : `https://${url}`

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (event: object) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`)) } catch { /* closed */ }
      }

      // Create DB task
      const task = await prisma.browserTask.create({
        data: { instruction: instruction!.trim(), url: targetUrl, status: "running" },
      })
      send({ type: "init", taskId: task.id })

      // Plan steps
      send({ type: "status", message: "Planning steps with AI..." })
      let steps: BrowserStep[] = []
      try {
        const planRaw = await groq(
          `You are a browser automation planner. Return a JSON object with a "steps" array.
Each step: action (navigate|click|type|extract|screenshot|wait|scroll), selector (CSS or null), value (text/url/ms or null), description.
Always start with navigate. Keep 3-8 steps. Be realistic.`,
          `Instruction: ${instruction}\nURL: ${targetUrl}\nextractType: ${extractType}\n\nReturn JSON: {"steps": [...]}`
          , true
        )
        const parsed = JSON.parse(planRaw)
        steps = Array.isArray(parsed.steps) ? parsed.steps : []
      } catch {
        steps = [
          { action: "navigate",   value: targetUrl, description: "Navigate to URL" },
          { action: "extract",    description: "Extract page content" },
          { action: "screenshot", description: "Take screenshot" },
        ]
      }
      send({ type: "plan", steps })

      // Execute Playwright
      let pageText   = ""
      let screenshot = ""
      let emails:  string[] = []
      let links:   string[] = []
      let execErr  = ""
      let browser

      try {
        browser = await chromium.launch({ headless: true })
        const page = await browser.newPage()
        const viewportSizes = {
          desktop: { width: 1280, height: 800  },
          mobile:  { width: 390,  height: 844  },
          tablet:  { width: 768,  height: 1024 },
        }
        await page.setViewportSize(viewportSizes[(viewport as keyof typeof viewportSizes)] ?? viewportSizes.desktop)

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          send({ type: "step_start", index: i, action: step.action, description: step.description })
          try {
            switch (step.action) {
              case "navigate":
                await page.goto(step.value || targetUrl, { timeout: 20000, waitUntil: "domcontentloaded" })
                break
              case "click":
                if (step.selector) await page.click(step.selector, { timeout: 5000 })
                break
              case "type":
                if (step.selector && step.value) await page.fill(step.selector, step.value)
                break
              case "wait":
                await page.waitForTimeout(parseInt(step.value || "1000") || 1000)
                break
              case "scroll":
                await page.evaluate(() => window.scrollBy(0, window.innerHeight))
                break
              case "extract":
                pageText = await page.evaluate(() => document.body.innerText)
                send({ type: "extracted", chars: pageText.length })
                break
              case "screenshot":
                // handled below
                break
            }
            send({ type: "step_done", index: i })
          } catch (stepErr) {
            const msg = stepErr instanceof Error ? stepErr.message : String(stepErr)
            send({ type: "step_error", index: i, error: msg.slice(0, 120) })
          }
        }

        // Always get text
        if (!pageText) {
          try { pageText = await page.evaluate(() => document.body.innerText) } catch { /**/ }
        }

        // Emails
        if (extractType === "emails" || instruction!.toLowerCase().includes("email")) {
          try {
            emails = await page.evaluate(() => {
              const m = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
              return [...new Set(m || [])]
            })
            if (emails.length) send({ type: "emails_found", count: emails.length, emails })
          } catch { /**/ }
        }

        // Links
        if (extractType === "links" || instruction!.toLowerCase().includes("link")) {
          try {
            links = await page.evaluate(() => {
              const a = Array.from(document.querySelectorAll("a[href]"))
              return [...new Set(a.map((x) => (x as HTMLAnchorElement).href).filter((h) => h.startsWith("http")))]
            })
            if (links.length) send({ type: "links_found", count: links.length })
          } catch { /**/ }
        }

        // Screenshot
        try {
          const buf = await page.screenshot({ fullPage: Boolean(fullPage) })
          screenshot = Buffer.from(buf).toString("base64")
          send({ type: "screenshot_ready" })
        } catch { /**/ }

        await browser.close()
        browser = undefined
      } catch (err) {
        execErr = err instanceof Error ? err.message : String(err)
        send({ type: "browser_error", message: execErr.slice(0, 200) })
        if (browser) try { await browser.close() } catch { /**/ }
      }

      // AI Analysis
      send({ type: "status", message: "Analysing results with AI..." })
      let result = ""
      try {
        const content = [
          pageText.slice(0, 3000),
          emails.length ? `\nEmails: ${emails.join(", ")}` : "",
          links.length  ? `\nLinks (sample): ${links.slice(0, 20).join(", ")}` : "",
        ].join("")

        if (content.trim()) {
          result = await groq(
            "You are a web scraping assistant. Analyse extracted content and give a clean structured summary relevant to the instruction.",
            `Instruction: ${instruction}\nURL: ${targetUrl}\nextractType: ${extractType}\n\nContent:\n${content}\n\nProvide a clear actionable summary. Use sections if appropriate.`
          )
        } else if (execErr) {
          result = `Browser error: ${execErr}`
        } else {
          result = "No content extracted from the page."
        }
      } catch {
        result = pageText.slice(0, 1000) || execErr || "Analysis failed."
      }

      let finalResult = result
      if (emails.length) finalResult += `\n\n**Emails Found (${emails.length}):**\n${emails.join("\n")}`
      if (links.length)  finalResult += `\n\n**Links Found (${links.length}):**\n${links.slice(0, 30).join("\n")}`

      // Save to DB
      const status = execErr && !result ? "failed" : "completed"
      await prisma.browserTask.update({
        where: { id: task.id },
        data: { status, steps: JSON.stringify(steps), result: finalResult || null, error: execErr || null, screenshot: screenshot || null },
      })

      send({ type: "result", content: finalResult, screenshot })
      send({ type: "complete", status, taskId: task.id })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  })
}
