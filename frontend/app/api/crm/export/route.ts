import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function csvEscape(value: any): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const stage = url.searchParams.get("stage")
    const icpLabel = url.searchParams.get("icpLabel")
    const source = url.searchParams.get("source")

    const where: any = {}
    if (stage) where.pipelineStage = stage
    if (icpLabel) where.icpLabel = icpLabel
    if (source) where.sources = { hasSome: [source] }

    const contacts = await prisma.crmContact.findMany({
      where,
      orderBy: { score: "desc" },
    })

    // Build CSV
    const headers = [
      "ID",
      "Name",
      "Company",
      "Email",
      "Phone",
      "Location",
      "Website",
      "LinkedIn",
      "Industry",
      "Score",
      "ICP Label",
      "Pipeline Stage",
      "Sources",
      "Need Signals",
      "Last Contacted",
      "Created At",
    ]

    const rows = [
      headers.join(","),
      ...contacts.map((c) =>
        [
          csvEscape(c.id),
          csvEscape(c.name),
          csvEscape(c.company),
          csvEscape(c.email),
          csvEscape(c.phone),
          csvEscape(c.location),
          csvEscape(c.website),
          csvEscape(c.linkedinUrl),
          csvEscape(c.industry),
          csvEscape(c.score),
          csvEscape(c.icpLabel),
          csvEscape(c.pipelineStage),
          csvEscape(c.sources.join("; ")),
          csvEscape(c.needSignals),
          csvEscape(c.lastContactedAt),
          csvEscape(c.createdAt),
        ].join(",")
      ),
    ]

    const csv = rows.join("\n")
    const timestamp = new Date().toISOString().split("T")[0]
    const filename = `crm-contacts-${timestamp}.csv`

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[crm/export GET]", err)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
