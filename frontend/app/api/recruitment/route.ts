import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const jobs = await prisma.recruitmentJob.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { candidates: true } },
      },
    })
    return NextResponse.json({ jobs })
  } catch (err) {
    console.error("[recruitment GET]", err)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.recruitmentJob.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[recruitment DELETE]", err)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
