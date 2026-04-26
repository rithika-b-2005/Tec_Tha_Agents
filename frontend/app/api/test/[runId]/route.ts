import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  try {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: {
        results: { orderBy: { createdAt: "asc" } },
        bugs: { orderBy: { severity: "asc" } },
      },
    })

    if (!run) {
      return NextResponse.json({ error: "Test run not found" }, { status: 404 })
    }

    return NextResponse.json({ run })
  } catch (err) {
    console.error("[test/[runId] GET]", err)
    return NextResponse.json({ error: "Failed to fetch test run" }, { status: 500 })
  }
}
