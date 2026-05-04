// Voice Agent — Twilio status callback
// Twilio posts call status updates here (ringing, completed, failed, etc.)

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteSession, getSessionTranscript } from "@/lib/voice-store"

// Map Twilio call status to VoiceCall status
function mapStatus(twilioStatus: string): string {
  switch (twilioStatus) {
    case "completed":   return "completed"
    case "no-answer":   return "no_answer"
    case "busy":        return "no_answer"
    case "failed":      return "failed"
    case "canceled":    return "failed"
    case "in-progress": return "in_progress"
    default:            return "completed"
  }
}

// Map Twilio status to outcome
function mapOutcome(twilioStatus: string): string | null {
  switch (twilioStatus) {
    case "no-answer": return "no_answer"
    case "busy":      return "no_answer"
    case "failed":    return null
    default:          return null
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const callSid = formData.get("CallSid") as string
    const callStatus = formData.get("CallStatus") as string
    const callDuration = formData.get("CallDuration") as string

    console.log(`[voice/status] CallSid=${callSid} Status=${callStatus} Duration=${callDuration}s`)

    if (!callSid) {
      return NextResponse.json({ error: "No CallSid" }, { status: 400 })
    }

    // Find the VoiceCall record by callSid
    const voiceCall = await prisma.voiceCall.findFirst({
      where: { callSid },
    })

    if (!voiceCall) {
      console.warn(`[voice/status] No VoiceCall found for callSid=${callSid}`)
      return NextResponse.json({ ok: true })
    }

    const mappedStatus = mapStatus(callStatus)
    const mappedOutcome = mapOutcome(callStatus)

    // Get transcript from session if available (may already be saved by respond route)
    const transcript = getSessionTranscript(callSid)

    const updateData: {
      status: string
      duration?: number | null
      transcript?: string
      outcome?: string
    } = {
      status: mappedStatus,
      duration: callDuration ? parseInt(callDuration) : null,
    }

    if (transcript && !voiceCall.transcript) {
      updateData.transcript = transcript
    }

    // Only set outcome if not already set (respond route may have already set it)
    if (mappedOutcome && !voiceCall.outcome) {
      updateData.outcome = mappedOutcome
    }

    await prisma.voiceCall.update({
      where: { id: voiceCall.id },
      data: updateData,
    })

    // Clean up in-memory session when call is truly over
    if (["completed", "failed", "no-answer", "busy", "canceled"].includes(callStatus)) {
      deleteSession(callSid)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[voice/status]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
