// Voice Agent — TwiML webhook (initial greeting when lead picks up)
// Required env vars:
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (default: EXAVITQu4vr4xnSDxMaL — Bella, warm female)
//   NEXT_PUBLIC_BASE_URL

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSession, storeAudio, addMessage } from "@/lib/voice-store"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"

async function textToSpeech(text: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ElevenLabs error: ${res.status} — ${errText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function getLeadBySource(leadId: string, leadSource: string) {
  switch (leadSource) {
    case "crm":
      return prisma.crmContact.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, company: true, industry: true, needSignals: true, icpLabel: true },
      })
    case "sales":
      return prisma.salesLead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, company: true, industry: true, needSignals: true, icpLabel: true },
      })
    case "marketing":
      return prisma.marketingLead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, company: true, industry: true, needSignals: true, icpLabel: true },
      })
    default:
      return prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, company: true, industry: true, needSignals: true, icpLabel: true },
      })
  }
}

function buildTwiML(audioUrl: string, gatherAction: string, redirectUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" action="${gatherAction}" method="POST" speechTimeout="3" speechModel="phone_call" language="en-IN">
  </Gather>
  <Redirect>${redirectUrl}</Redirect>
</Response>`
}

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url)
    const callRecordId = url.searchParams.get("callRecordId") || ""
    const leadId = url.searchParams.get("leadId") || ""
    const leadSource = url.searchParams.get("leadSource") || "leads"
    const callSid = url.searchParams.get("CallSid") || ""

    if (!leadId) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "application/xml" } }
      )
    }

    // Fetch lead details
    const lead = await getLeadBySource(leadId, leadSource)
    if (!lead) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error. Goodbye.</Say><Hangup/></Response>`,
        { status: 200, headers: { "Content-Type": "application/xml" } }
      )
    }

    // Also get callSid from form data if this is a POST from Twilio
    let resolvedCallSid = callSid
    if (request.method === "POST") {
      try {
        const formData = await request.formData()
        resolvedCallSid = (formData.get("CallSid") as string) || callSid
      } catch {
        // ignore parse errors
      }
    }

    // Create session in voice store (use callRecordId as fallback key if no callSid yet)
    const sessionKey = resolvedCallSid || callRecordId
    createSession(sessionKey, lead)

    // Generate opening greeting
    const firstName = lead.name.split(" ")[0]
    const greeting = `Hello! Am I speaking with ${firstName}? This is Priya calling from Tec Tha.`

    // Convert to speech
    const audioBuffer = await textToSpeech(greeting)
    const audioId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    storeAudio(audioId, audioBuffer)

    // Track greeting in session
    addMessage(sessionKey, "assistant", greeting)

    // Build TwiML
    const audioUrl = `${BASE_URL}/api/voice/audio/${audioId}`
    const gatherAction = `${BASE_URL}/api/voice/respond?callRecordId=${callRecordId}`
    const redirectUrl = `${BASE_URL}/api/voice/twiml?callRecordId=${callRecordId}&leadId=${leadId}&leadSource=${leadSource}`
    const twiml = buildTwiML(audioUrl, gatherAction, redirectUrl)

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    })
  } catch (err) {
    console.error("[voice/twiml]", err)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was a technical error. Goodbye.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "application/xml" } }
    )
  }
}
