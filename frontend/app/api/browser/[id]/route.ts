import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const task = await prisma.browserTask.findUnique({ where: { id } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    return NextResponse.json({ task })
  } catch (err) {
    console.error("[browser/id GET]", err)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}
