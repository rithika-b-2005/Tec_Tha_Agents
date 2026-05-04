// Voice Agent — Initiate outbound call
// Required env vars:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
//   NEXT_PUBLIC_BASE_URL (e.g. ngrok URL for dev, prod domain for prod)

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"

function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (raw.trim().startsWith("+")) return raw.trim()
  // Already has India country code (12 digits starting with 91)
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  // Other full country codes
  if (digits.length > 10) return `+${digits}`
  return `+91${digits}`
}

async function getLeadBySource(
  leadId: string,
  leadSource: string
): Promise<{ id: string; name: string; phone: string | null; company?: string | null } | null> {
  switch (leadSource) {
    case "crm":
      return prisma.crmContact.findUnique({ where: { id: leadId }, select: { id: true, name: true, phone: true, company: true } })
    case "sales":
      return prisma.salesLead.findUnique({ where: { id: leadId }, select: { id: true, name: true, phone: true, company: true } })
    case "marketing":
      return prisma.marketingLead.findUnique({ where: { id: leadId }, select: { id: true, name: true, phone: true, company: true } })
    default:
      return prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true, phone: true, company: true } })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadId, leadSource = "leads", phone: directPhone, name: directName } = body

    if (!leadId && !directPhone) {
      return NextResponse.json({ error: "leadId or phone is required" }, { status: 400 })
    }

    let lead: { id: string; name: string; phone: string | null; company?: string | null }

    if (directPhone) {
      // Direct call — no lead lookup needed
      lead = {
        id:      "direct",
        name:    directName?.trim() || "Direct Call",
        phone:   directPhone.trim(),
        company: null,
      }
    } else {
      // Fetch lead from the appropriate table
      const found = await getLeadBySource(leadId, leadSource)
      if (!found) return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      if (!found.phone) return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 })
      lead = found
    }

    const cleanedPhone = cleanPhone(lead.phone!)

    // Create VoiceCall record in DB
    const voiceCall = await prisma.voiceCall.create({
      data: {
        leadId:      lead.id,
        leadName:    lead.name,
        leadPhone:   cleanedPhone,
        leadCompany: lead.company || null,
        status:      "initiated",
      },
    })

    // Build TwiML webhook URL
    const twimlUrl = `${BASE_URL}/api/voice/twiml?callRecordId=${voiceCall.id}&leadId=${leadId}&leadSource=${leadSource}`
    const statusCallbackUrl = `${BASE_URL}/api/voice/status`

    // Call Twilio REST API to initiate outbound call
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER!

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: cleanedPhone,
          Url: twimlUrl,
          StatusCallback: statusCallbackUrl,
          StatusCallbackMethod: "POST",
          StatusCallbackEvent: "completed ringing answered",
        }).toString(),
      }
    )

    if (!twilioResponse.ok) {
      const err = await twilioResponse.text()
      console.error("[voice/initiate] Twilio error:", err)
      await prisma.voiceCall.update({
        where: { id: voiceCall.id },
        data: { status: "failed" },
      })
      return NextResponse.json({ error: "Twilio call initiation failed", details: err }, { status: 502 })
    }

    const twilioData = await twilioResponse.json()
    const callSid = twilioData.sid

    // Update record with callSid from Twilio
    await prisma.voiceCall.update({
      where: { id: voiceCall.id },
      data: { callSid, status: "in_progress" },
    })

    return NextResponse.json({ callSid, callRecordId: voiceCall.id })
  } catch (err) {
    console.error("[voice/initiate]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
