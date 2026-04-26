import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const runs = await prisma.testRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: { select: { bugs: true, results: true } },
      },
    })

    return NextResponse.json({ runs })
  } catch (err) {
    console.error("[test GET]", err)
    return NextResponse.json({ error: "Failed to fetch test runs" }, { status: 500 })
  }
}
