import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendColdOutreachEmail } from "@/lib/email"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { to, subject, emailBody, senderName = "Team", senderCompany = "Tec Tha" } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "to, subject, and emailBody are required" },
        { status: 400 }
      )
    }

    const contact = await prisma.crmContact.findUnique({
      where: { id },
    })
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    // Send email
    await sendColdOutreachEmail(to, subject, emailBody, senderName, senderCompany)

    // Update contact stage and last contacted
    await prisma.crmContact.update({
      where: { id },
      data: {
        pipelineStage: "contacted",
        lastContactedAt: new Date(),
      },
    })

    // Log activity
    await prisma.crmActivity.create({
      data: {
        contactId: id,
        type: "email",
        summary: `Email sent: "${subject}"`,
      },
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("[crm/[id]/outreach POST]", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
