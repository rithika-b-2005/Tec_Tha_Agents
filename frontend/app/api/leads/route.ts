import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    return NextResponse.json({ leads })
  } catch (err) {
    console.error("[leads GET]", err)
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.lead.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[leads DELETE]", err)
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name, email, phone, company, website, title, location, industry,
      source, linkedinUrl, score, icpLabel, companyBio, automationOpportunity,
      leadContext, outreachLine, emailSubject, emailBody, notes, processedAt,
      needSignals, contactStatus,
    } = body

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const data = {
      name,
      phone:                phone               || null,
      company:              company             || null,
      website:              website             || null,
      title:                title               || null,
      location:             location            || null,
      industry:             industry            || null,
      source:               source              || "n8n",
      linkedinUrl:          linkedinUrl         || null,
      score:                score != null ? Number(score) : 0,
      icpLabel:             icpLabel            || null,
      companyBio:           companyBio          || null,
      automationOpportunity: automationOpportunity || null,
      leadContext:          leadContext         || null,
      outreachLine:         outreachLine        || null,
      emailSubject:         emailSubject        || null,
      emailBody:            emailBody           || null,
      notes:                notes               || null,
      processedAt:          processedAt ? new Date(processedAt) : null,
      needSignals:          needSignals         || null,
      contactStatus:        contactStatus       || undefined,
    }

    let lead
    if (email) {
      const existing = await prisma.lead.findFirst({ where: { email } })
      if (existing) {
        lead = await prisma.lead.update({
          where: { id: existing.id },
          data: {
            score:                data.score,
            icpLabel:             data.icpLabel,
            companyBio:           data.companyBio,
            automationOpportunity: data.automationOpportunity,
            emailSubject:         data.emailSubject,
            emailBody:            data.emailBody,
            processedAt:          data.processedAt,
          },
        })
      } else {
        lead = await prisma.lead.create({ data: { ...data, email } })
      }
    } else {
      lead = await prisma.lead.create({ data: { ...data, email: null } })
    }

    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error("[leads POST]", err)
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 })
  }
}
