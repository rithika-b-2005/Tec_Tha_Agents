import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stage = url.searchParams.get("stage")
    const icpLabel = url.searchParams.get("icpLabel")
    const source = url.searchParams.get("source")
    const search = url.searchParams.get("search")
    const hasEmail = url.searchParams.get("hasEmail")
    const minScore = url.searchParams.get("minScore")
    const maxScore = url.searchParams.get("maxScore")

    let where: any = {}
    if (stage && stage !== "all") {
      where.pipelineStage = stage
    }
    if (icpLabel && icpLabel !== "all") {
      where.icpLabel = icpLabel
    }
    if (source && source !== "all") {
      where.sources = { has: source }
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    if (hasEmail === "true") {
      where.email = { not: null }
    } else if (hasEmail === "false") {
      where.email = null
    }

    if (minScore) {
      where.score = { gte: parseInt(minScore) }
    }
    if (maxScore) {
      if (where.score) {
        where.score.lte = parseInt(maxScore)
      } else {
        where.score = { lte: parseInt(maxScore) }
      }
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        activities: { take: 5, orderBy: { createdAt: "desc" } },
        tasks: { where: { completedAt: null }, orderBy: { scheduledAt: "asc" } }
      },
    })

    return NextResponse.json({ contacts })
  } catch (err) {
    console.error("[crm GET]", err)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }
}
