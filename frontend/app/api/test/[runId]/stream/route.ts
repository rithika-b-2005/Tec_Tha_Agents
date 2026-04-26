import { testEmitter, TestEvent } from "@/lib/test-events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: TestEvent) => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (err) {
          console.error("[SSE] encode error", err)
        }

        if (event.type === "run_complete" || event.type === "run_error") {
          testEmitter.off(runId, send)
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }

      testEmitter.on(runId, send)

      // Send initial heartbeat
      try {
        controller.enqueue(new TextEncoder().encode(`: connected\n\n`))
      } catch (err) {
        console.error("[SSE] heartbeat error", err)
      }

      // Cleanup on disconnect
      const abortListener = () => {
        testEmitter.off(runId, send)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener("abort", abortListener)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
