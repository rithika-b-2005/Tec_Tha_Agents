import { TestPlan } from "./test-planner"
import { TestDataSet } from "./test-data-generator"

export interface ExecutedStep {
  action: string
  target: string
  value?: string
  status: "pass" | "fail"
  error?: string
  timestamp: number
}

export interface NetworkLog {
  url: string
  method: string
  status: number
  flagged: boolean
  duration: number
}

export interface TestExecutionResult {
  testName: string
  status: "passed" | "failed" | "skipped"
  duration: number
  error?: string
  screenshot?: string
  steps: ExecutedStep[]
  networkLogs: NetworkLog[]
  consoleLogs: string[]
}

export async function executeTestPlan(
  plan: TestPlan,
  dataSet: TestDataSet,
  browser: string,
  viewport: string,
  loginCredentials?: { username: string; password: string },
  onStep?: (step: string, status: "running" | "done" | "error") => void,
): Promise<TestExecutionResult> {
  const playwright = await import("playwright")
  const browserMap: Record<string, any> = {
    chromium: playwright.chromium,
    firefox: playwright.firefox,
    webkit: playwright.webkit,
  }

  const viewportMap: Record<string, { width: number; height: number }> = {
    desktop: { width: 1280, height: 800 },
    mobile: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 },
  }

  const browserInstance = await browserMap[browser || "chromium"].launch({ headless: true })
  const vp = viewportMap[viewport || "desktop"]
  const context = await browserInstance.newContext({ viewport: vp })
  const page = await context.newPage()

  const steps: ExecutedStep[] = []
  const networkLogs: NetworkLog[] = []
  const consoleLogs: string[] = []
  const startTime = Date.now()
  let screenshot: string | undefined

  try {
    // Intercept network
    page.on("response", (resp: any) => {
      const request = resp.request()
      networkLogs.push({
        url: request.url(),
        method: request.method(),
        status: resp.status(),
        flagged: resp.status() >= 400,
        duration: 0,
      })
    })

    // Capture console
    page.on("console", (msg: any) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`)
      }
    })

    const stepLabel = (action: string, target: string, value?: string) => {
      const labels: Record<string, string> = {
        navigate: `Navigating to ${target}`,
        click: `Clicking "${target}"`,
        fill: `Typing "${value || ""}" into "${target}"`,
        select: `Selecting "${value}" in "${target}"`,
        press: `Pressing ${value || "Enter"}`,
        hover: `Hovering over "${target}"`,
        wait: `Waiting for "${target}"`,
        screenshot: `Taking screenshot`,
        assert_text: `Asserting text "${value}" in "${target}"`,
        assert_visible: `Asserting "${target}" is visible`,
        assert_url: `Asserting URL contains "${value}"`,
      }
      return labels[action] || `${action} ${target}`
    }

    // Execute steps
    for (const step of plan.steps) {
      const stepStart = Date.now()
      const label = stepLabel(step.action, step.target, step.value)
      onStep?.(label, "running")
      try {
        switch (step.action) {
          case "navigate":
            await page.goto(step.target, { waitUntil: "domcontentloaded", timeout: 30000 })
            break

          case "click":
            await page.click(step.target, { timeout: 10000 })
            break

          case "fill":
            const fillValue = step.value ? dataSet.data[step.value] || step.value : ""
            await page.fill(step.target, fillValue, { timeout: 10000 })
            break

          case "select":
            const selectValue = step.value ? dataSet.data[step.value] || step.value : ""
            await page.selectOption(step.target, selectValue, { timeout: 10000 })
            break

          case "press":
            await page.keyboard.press(step.value || "Enter")
            break

          case "hover":
            await page.hover(step.target, { timeout: 10000 })
            break

          case "wait":
            if (step.value?.match(/^\d+$/)) {
              await page.waitForTimeout(parseInt(step.value))
            } else {
              await page.waitForSelector(step.target, { timeout: 10000 })
            }
            break

          case "screenshot":
            const buf = await page.screenshot({ type: "png", fullPage: false })
            screenshot = buf.toString("base64")
            break

          case "assert_text":
            const text = await page.locator(step.target).textContent()
            if (!text?.includes(step.value || "")) {
              throw new Error(`Expected text "${step.value}" not found in "${step.target}"`)
            }
            break

          case "assert_visible":
            const visible = await page.locator(step.target).isVisible()
            if (!visible) throw new Error(`Element "${step.target}" not visible`)
            break

          case "assert_url":
            const currentUrl = page.url()
            if (!currentUrl.includes(step.value || "")) {
              throw new Error(`Expected URL to contain "${step.value}", got "${currentUrl}"`)
            }
            break
        }

        onStep?.(label, "done")
        steps.push({
          action: step.action,
          target: step.target,
          value: step.value,
          status: "pass",
          timestamp: stepStart,
        })
      } catch (err) {
        onStep?.(label, "error")
        if (!screenshot) {
          const buf = await page.screenshot({ type: "png", fullPage: false })
          screenshot = buf.toString("base64")
        }

        steps.push({
          action: step.action,
          target: step.target,
          value: step.value,
          status: "fail",
          error: err instanceof Error ? err.message : String(err),
          timestamp: stepStart,
        })

        throw err
      }
    }

    return {
      testName: plan.testName,
      status: "passed",
      duration: Date.now() - startTime,
      steps,
      networkLogs,
      consoleLogs,
      screenshot,
    }
  } catch (err) {
    return {
      testName: plan.testName,
      status: "failed",
      duration: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
      steps,
      networkLogs,
      consoleLogs,
      screenshot,
    }
  } finally {
    await context.close()
    await browserInstance.close()
  }
}
