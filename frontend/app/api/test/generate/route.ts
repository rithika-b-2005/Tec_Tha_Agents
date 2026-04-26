import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateTestPlans } from "@/lib/test-planner"
import { generateTestData } from "@/lib/test-data-generator"
import { executeTestPlan } from "@/lib/test-executor"
import { analyzeFailure } from "@/lib/failure-analyzer"
import { testEmitter } from "@/lib/test-events"

export const maxDuration = 300

interface GenerateRequest {
  platformUrl: string
  testCases: string[]
  browser?: string
  viewport?: string
  hasLogin?: boolean
  loginUser?: string
  loginPass?: string
}

async function runTestsInBackground(runId: string, body: GenerateRequest) {
  try {
    // Update status to running
    await prisma.testRun.update({
      where: { id: runId },
      data: { status: "running" },
    })

    // Generate test plans
    console.log(`[${runId}] Generating test plans...`)
    const plans = await generateTestPlans(body.platformUrl, body.testCases)
    console.log(`[${runId}] Generated ${plans.length} test plans`)

    // Update total tests
    await prisma.testRun.update({
      where: { id: runId },
      data: { totalTests: plans.length },
    })

    let passed = 0
    let failed = 0

    // Execute each test sequentially
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]
      console.log(`[${runId}] Starting test ${i + 1}/${plans.length}: ${plan.testName}`)

      // Emit test start
      testEmitter.emit(runId, {
        type: "test_start",
        runId,
        testName: plan.testName,
        index: i,
        total: plans.length,
      })

      try {
        // Generate test data
        console.log(`[${runId}] Generating test data for ${plan.testName}...`)
        const dataSets = await generateTestData(plan, body.platformUrl)
        const validData = dataSets.find((d) => d.label === "valid") || dataSets[0]

        // Execute test
        console.log(`[${runId}] Executing test ${plan.testName}...`)
        const result = await executeTestPlan(
          plan,
          validData,
          body.browser || "chromium",
          body.viewport || "desktop",
          body.hasLogin ? { username: body.loginUser || "", password: body.loginPass || "" } : undefined,
          (step, status) => {
            testEmitter.emit(runId, {
              type: "step_update",
              runId,
              testName: plan.testName,
              step,
              status,
            })
          },
        )

        // Save test result
        await prisma.testResult.create({
          data: {
            runId,
            testName: plan.testName,
            status: result.status,
            duration: result.duration,
            error: result.error,
            screenshot: result.screenshot,
            steps: JSON.stringify(result.steps),
            networkLogs: JSON.stringify(result.networkLogs),
            consoleLogs: JSON.stringify(result.consoleLogs),
          },
        })

        if (result.status === "passed") {
          passed++
          testEmitter.emit(runId, {
            type: "test_pass",
            runId,
            testName: plan.testName,
            duration: result.duration,
          })
          console.log(`[${runId}] ✅ ${plan.testName} passed`)
        } else {
          failed++
          console.log(`[${runId}] ❌ ${plan.testName} failed: ${result.error}`)

          // Analyze failure
          console.log(`[${runId}] Analyzing failure for ${plan.testName}...`)
          const analysis = await analyzeFailure(plan, result)

          // Save bug
          const bug = await prisma.testBug.create({
            data: {
              runId,
              testName: plan.testName,
              title: analysis.title,
              severity: analysis.severity,
              category: analysis.category,
              steps: JSON.stringify(analysis.reproSteps),
              expected: analysis.expected,
              actual: analysis.actual,
              screenshot: result.screenshot,
              aiAnalysis: analysis.rootCause,
              suggestion: analysis.fixSuggestion,
            },
          })

          testEmitter.emit(runId, {
            type: "test_fail",
            runId,
            testName: plan.testName,
            error: result.error || "",
            bugId: bug.id,
          })
        }
      } catch (err) {
        console.error(`[${runId}] Test execution error for ${plan.testName}:`, err)
        failed++

        const errorMsg = err instanceof Error ? err.message : String(err)
        await prisma.testResult.create({
          data: {
            runId,
            testName: plan.testName,
            status: "failed",
            duration: 0,
            error: errorMsg,
            steps: JSON.stringify([]),
            networkLogs: JSON.stringify([]),
            consoleLogs: JSON.stringify([]),
          },
        })

        testEmitter.emit(runId, {
          type: "test_fail",
          runId,
          testName: plan.testName,
          error: errorMsg,
        })
      }

      // Update run counts after each test
      await prisma.testRun.update({
        where: { id: runId },
        data: {
          passed,
          failed,
        },
      })
    }

    // Generate summary
    console.log(`[${runId}] Generating summary...`)
    const summaryPrompt = `Summarize this test run in 2 sentences:
- Platform: ${body.platformUrl}
- Tests: ${plans.length}
- Passed: ${passed}
- Failed: ${failed}
- Top issues: focus on critical bugs if any exist`

    const Groq = require("groq-sdk")
    const groqClient = new Groq.default()

    const summaryResp = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      messages: [{ role: "user", content: summaryPrompt }],
    })

    const summary = summaryResp.choices?.[0]?.message?.content || "Test run completed"

    // Final update
    const duration = Math.round(Date.now() / 1000) // approximate in seconds
    await prisma.testRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        duration,
        summary,
      },
    })

    // Emit completion
    testEmitter.emit(runId, {
      type: "run_complete",
      runId,
      passed,
      failed,
      skipped: 0,
      summary,
    })

    console.log(`[${runId}] Test run complete: ${passed} passed, ${failed} failed`)
  } catch (err) {
    console.error(`[${runId}] Background error:`, err)

    await prisma.testRun.update({
      where: { id: runId },
      data: { status: "failed" },
    })

    const errorMsg = err instanceof Error ? err.message : String(err)
    testEmitter.emit(runId, {
      type: "run_error",
      runId,
      error: errorMsg,
    })
  }
}

export async function POST(request: Request) {
  const body: GenerateRequest = await request.json()

  // Validate
  if (!body.platformUrl || !Array.isArray(body.testCases) || body.testCases.length === 0) {
    return NextResponse.json(
      { error: "platformUrl and testCases are required" },
      { status: 400 },
    )
  }

  try {
    // Create test run
    const run = await prisma.testRun.create({
      data: {
        platformUrl: body.platformUrl,
        testCases: JSON.stringify(body.testCases),
        browser: body.browser || "chromium",
        viewport: body.viewport || "desktop",
        hasLogin: body.hasLogin || false,
        loginUser: body.loginUser,
        loginPass: body.loginPass,
        status: "pending",
      },
    })

    // Fire-and-forget background processing
    runTestsInBackground(run.id, body).catch((err) => {
      console.error("[runTestsInBackground uncaught]:", err)
    })

    return NextResponse.json({
      runId: run.id,
      message: "Test run started",
      totalTests: body.testCases.length,
    })
  } catch (err) {
    console.error("[test/generate POST]", err)
    return NextResponse.json({ error: "Failed to start test run" }, { status: 500 })
  }
}
