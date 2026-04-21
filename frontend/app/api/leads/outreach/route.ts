import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendColdOutreachEmail } from "@/lib/email"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function POST(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { leadId, to, subject, emailBody, senderName, senderCompany } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "to, subject, and emailBody are required." },
        { status: 400 }
      )
    }

    await sendColdOutreachEmail(to, subject, emailBody, senderName, senderCompany)

    // Mark lead as email_sent
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data:  { outreachStatus: "email_sent" },
      }).catch(() => {})
    } else {
      await prisma.lead.updateMany({
        where: { email: to, outreachStatus: "new" },
        data:  { outreachStatus: "email_sent" },
      }).catch(() => {})
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("[leads/outreach POST]", err)
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 })
  }
}
