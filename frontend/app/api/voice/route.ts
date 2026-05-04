// Voice Agent — List voice calls + admin clear
// GET  → returns all calls, newest first, with aggregate stats
// DELETE (x-api-secret header) → clear all records

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const calls = await prisma.voiceCall.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    const stats = {
      total: calls.length,
      completed: calls.filter((c) => c.status === "completed").length,
      inProgress: calls.filter((c) => c.status === "in_progress").length,
      failed: calls.filter((c) => c.status === "failed" || c.status === "no_answer").length,
      interested: calls.filter((c) => c.outcome === "interested").length,
      callbacks: calls.filter((c) => c.outcome === "callback").length,
      noAnswer: calls.filter((c) => c.outcome === "no_answer" || c.status === "no_answer").length,
    }

    return NextResponse.json({ calls, stats })
  } catch (err) {
    console.error("[voice GET]", err)
    return NextResponse.json({ error: "Failed to fetch voice calls" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.voiceCall.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[voice DELETE]", err)
    return NextResponse.json({ error: "Failed to delete voice calls" }, { status: 500 })
  }
}
