import { NextResponse } from "next/server"
import { syncAllLeads } from "@/lib/crm-sync"

export async function POST(request: Request) {
  try {
    const result = await syncAllLeads()
    return NextResponse.json(result)
  } catch (err) {
    console.error("[crm/sync POST]", err)
    return NextResponse.json({ error: "Failed to sync leads" }, { status: 500 })
  }
}
