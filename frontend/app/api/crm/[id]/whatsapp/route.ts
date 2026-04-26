import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ""
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ""
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "" // e.g. whatsapp:+14155238886

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 })
    }

    const contact = await prisma.crmContact.findUnique({ where: { id } })
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }
    if (!contact.phone) {
      return NextResponse.json({ error: "Contact has no phone number" }, { status: 400 })
    }
    if (!contact.emailBody) {
      return NextResponse.json({ error: "No message content — generate email first" }, { status: 400 })
    }

    // Clean phone: strip non-digits, ensure leading +
    const rawPhone = contact.phone.replace(/\D/g, "")
    const toPhone = `whatsapp:+${rawPhone}`

    const message = contact.emailSubject
      ? `${contact.emailSubject}\n\n${contact.emailBody}`
      : contact.emailBody

    // Twilio REST API
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_FROM,
          To: toPhone,
          Body: message,
        }).toString(),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      console.error("[whatsapp POST] Twilio error:", data)
      return NextResponse.json(
        { error: data?.message || "Twilio failed" },
        { status: 500 }
      )
    }

    // Update stage + log activity
    await prisma.crmContact.update({
      where: { id },
      data: { pipelineStage: "contacted", lastContactedAt: new Date() },
    })

    await prisma.crmActivity.create({
      data: {
        contactId: id,
        type: "email",
        summary: `WhatsApp message sent to ${contact.phone}`,
      },
    })

    return NextResponse.json({ sent: true, sid: data.sid })
  } catch (err) {
    console.error("[crm/[id]/whatsapp POST]", err)
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 })
  }
}
