import { NextResponse } from "next/server"
import { syncAllLeads } from "@/lib/crm-sync"

const CRON_SECRET = process.env.CRON_SECRET ?? "tectha-cron-secret-2026"

/**
 * Scheduled sync for CRM leads
 * Call via: curl -H "x-cron-secret: <secret>" https://yoursite/api/cron/sync-crm
 * Or set up external scheduler (Vercel Cron, GitHub Actions, etc)
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret")
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[cron/sync-crm] Starting scheduled sync...")
    const result = await syncAllLeads()
    console.log("[cron/sync-crm] Sync complete", result)
    return NextResponse.json({
      success: true,
      message: "CRM sync completed",
      ...result,
    })
  } catch (err) {
    console.error("[cron/sync-crm] Failed", err)
    return NextResponse.json(
      { error: "Sync failed", details: String(err) },
      { status: 500 }
    )
  }
}
