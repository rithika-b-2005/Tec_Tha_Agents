import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TWILIO_ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID    || ""
const TWILIO_AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN     || ""
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM  || ""

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 })
    }

    const lead = await prisma.marketingLead.findUnique({ where: { id } })
    if (!lead)        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    if (!lead.phone)  return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 })
    if (!lead.emailBody) return NextResponse.json({ error: "No message content — generate leads first" }, { status: 400 })

    const rawPhone = lead.phone.replace(/\D/g, "")
    const toPhone  = `whatsapp:+${rawPhone}`
    const message  = lead.emailSubject
      ? `${lead.emailSubject}\n\n${lead.emailBody}`
      : lead.emailBody

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
          To:   toPhone,
          Body: message,
        }).toString(),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      console.error("[marketing/whatsapp] Twilio error:", data)
      return NextResponse.json({ error: data?.message || "Twilio failed" }, { status: 500 })
    }

    await prisma.marketingLead.update({
      where: { id },
      data:  { contactStatus: "whatsapp_sent" },
    })

    return NextResponse.json({ sent: true, sid: data.sid })
  } catch (err) {
    console.error("[marketing/[id]/whatsapp POST]", err)
    return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 500 })
  }
}
