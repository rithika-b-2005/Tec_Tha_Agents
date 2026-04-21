import { NextResponse } from "next/server"

const N8N_WEBHOOK = "https://rithika2005.app.n8n.cloud/webhook-test/sales-agent"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let errMsg = "n8n workflow failed"
      try { const d = await res.json(); errMsg = d.error ?? errMsg } catch {}
      return NextResponse.json({ error: errMsg }, { status: res.status })
    }
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error("[sales webhook proxy]", err)
    return NextResponse.json({ error: "Failed to trigger workflow" }, { status: 500 })
  }
}
