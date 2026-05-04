import { NextResponse } from "next/server"

export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET ?? "tectha-cron-secret-2026"

/**
 * Cron endpoint for Daily Brief generation
 * Called by Vercel cron or external scheduler at 08:00 IST daily.
 *
 * Example call:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" https://yoursite.com/api/cron/daily-brief
 *
 * Vercel cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/daily-brief", "schedule": "30 2 * * *" }] }
 *   (30 2 UTC = 08:00 IST)
 */
export async function GET(request: Request) {
  const auth = request.headers.get("Authorization")
  const expected = `Bearer ${CRON_SECRET}`

  if (auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/brief/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("[cron/daily-brief] Generate failed:", data)
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 })
    }

    console.log("[cron/daily-brief] Brief generated:", data)
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[cron/daily-brief] Exception:", error)
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
