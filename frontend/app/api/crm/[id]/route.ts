import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        tasks: { where: { completedAt: null }, orderBy: { scheduledAt: "asc" } }
      },
    })
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }
    return NextResponse.json({ contact })
  } catch (err) {
    console.error("[crm/[id] GET]", err)
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { pipelineStage, notes } = body

    const existing = await prisma.crmContact.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const data: any = {
      ...(notes != null && { notes }),
      ...(pipelineStage && { pipelineStage, lastContactedAt: new Date() }),
    }

    const updated = await prisma.crmContact.update({
      where: { id },
      data,
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        tasks: { where: { completedAt: null }, orderBy: { scheduledAt: "asc" } }
      },
    })

    // Log stage change as activity
    if (pipelineStage && pipelineStage !== existing.pipelineStage) {
      await prisma.crmActivity.create({
        data: {
          contactId: id,
          type: "stage_change",
          summary: `Moved from ${existing.pipelineStage} to ${pipelineStage}`,
        },
      })
    }

    return NextResponse.json({ contact: updated })
  } catch (err) {
    console.error("[crm/[id] PATCH]", err)
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 })
  }
}
