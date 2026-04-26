import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get all contacts
    const allContacts = await prisma.crmContact.findMany()

    // Stage distribution
    const byStage = {
      new: 0,
      contacted: 0,
      replied: 0,
      qualified: 0,
      proposal: 0,
      won: 0,
      lost: 0,
    }
    const stageLabels: Record<string, keyof typeof byStage> = {
      new: "new",
      contacted: "contacted",
      replied: "replied",
      qualified: "qualified",
      proposal: "proposal",
      won: "won",
      lost: "lost",
    }

    allContacts.forEach((c) => {
      const stage = stageLabels[c.pipelineStage] || "new"
      byStage[stage]++
    })

    // ICP distribution
    const byIcp = allContacts.reduce(
      (acc, c) => {
        const label = c.icpLabel || "unknown"
        acc[label] = (acc[label] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Source distribution
    const bySource: Record<string, number> = {}
    allContacts.forEach((c) => {
      c.sources.forEach((source) => {
        bySource[source] = (bySource[source] || 0) + 1
      })
    })

    // Score distribution
    const scores = allContacts.map((c) => c.score || 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0
    const topScores = allContacts
      .filter((c) => c.score)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)

    // Conversion metrics
    const contacted = byStage.contacted + byStage.replied + byStage.qualified + byStage.proposal + byStage.won
    const qualified = byStage.qualified + byStage.proposal + byStage.won
    const conversionRate = allContacts.length > 0 ? Math.round((qualified / allContacts.length) * 100) : 0
    const winRate = allContacts.length > 0 ? Math.round((byStage.won / allContacts.length) * 100) : 0

    // Activity stats
    const activities = await prisma.crmActivity.groupBy({
      by: ["type"],
      _count: { id: true },
    })

    const activityStats: Record<string, number> = {}
    activities.forEach((a) => {
      activityStats[a.type] = a._count.id
    })

    // Recent activity
    const recentActivities = await prisma.crmActivity.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { contact: { select: { name: true } } },
    })

    // Time-based stats
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const newContactsLast30Days = allContacts.filter(
      (c) => c.createdAt >= thirtyDaysAgo
    ).length

    const contactedLast30Days = await prisma.crmActivity.findMany({
      where: {
        type: "email",
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    return NextResponse.json({
      summary: {
        totalContacts: allContacts.length,
        contacted,
        qualified,
        won: byStage.won,
        conversionRate: `${conversionRate}%`,
        winRate: `${winRate}%`,
        avgScore,
      },
      distribution: {
        byStage,
        byIcp,
        bySource,
      },
      topContacts: topScores.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        score: c.score,
        stage: c.pipelineStage,
      })),
      activities: activityStats,
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        contactName: a.contact.name,
        createdAt: a.createdAt,
      })),
      timeSeries: {
        newContactsLast30Days,
        emailsSentLast30Days: contactedLast30Days.length,
      },
    })
  } catch (err) {
    console.error("[crm/metrics GET]", err)
    return NextResponse.json({ error: "Metrics failed" }, { status: 500 })
  }
}
