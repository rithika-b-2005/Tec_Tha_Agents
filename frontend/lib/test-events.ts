import { EventEmitter } from "events"

const globalForEmitter = globalThis as unknown as { testEmitter: EventEmitter }

export const testEmitter = globalForEmitter.testEmitter ?? new EventEmitter()
testEmitter.setMaxListeners(100)

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.testEmitter = testEmitter
}

export type TestEvent =
  | { type: "test_start"; runId: string; testName: string; index: number; total: number }
  | { type: "test_pass"; runId: string; testName: string; duration: number }
  | { type: "test_fail"; runId: string; testName: string; error: string; bugId?: string }
  | { type: "step_update"; runId: string; testName: string; step: string; status: "running" | "done" | "error" }
  | { type: "run_complete"; runId: string; passed: number; failed: number; skipped: number; summary?: string }
  | { type: "run_error"; runId: string; error: string }
