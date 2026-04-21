import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const leads = await prisma.salesLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    return NextResponse.json({ leads })
  } catch (err) {
    console.error("[sales GET]", err)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { name, email, phone, company, website, location, industry,
      source, score, icpLabel, companyBio, painPoint, salesPitch,
      proposalSummary, emailSubject, emailBody, notes, processedAt } = body
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const lead = await prisma.salesLead.create({
      data: {
        name, email: email || null, phone: phone || null,
        company: company || null, website: website || null,
        location: location || null, industry: industry || null,
        source: source || "n8n", score: score != null ? Number(score) : 0,
        icpLabel: icpLabel || null, companyBio: companyBio || null,
        painPoint: painPoint || null, salesPitch: salesPitch || null,
        proposalSummary: proposalSummary || null,
        emailSubject: emailSubject || null, emailBody: emailBody || null,
        notes: notes || null,
        processedAt: processedAt ? new Date(processedAt) : null,
      },
    })
    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error("[sales POST]", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.salesLead.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[sales DELETE]", err)
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 })
  }
}
