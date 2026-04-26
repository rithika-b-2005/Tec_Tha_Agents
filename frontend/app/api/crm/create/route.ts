import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, company, phone, location, industry, website, linkedinUrl, notes } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const contact = await prisma.crmContact.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        location: location?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
        linkedinUrl: linkedinUrl?.trim() || null,
        notes: notes?.trim() || null,
        sources: ["manual"],
        pipelineStage: "new",
        activities: {
          create: {
            type: "manual_create",
            summary: "Contact added manually",
          },
        },
      },
      include: {
        activities: { take: 5, orderBy: { createdAt: "desc" } },
        tasks: { where: { completedAt: null }, orderBy: { scheduledAt: "asc" } },
      },
    })

    return NextResponse.json({ contact })
  } catch (err) {
    console.error("[crm/create POST]", err)
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
  }
}
