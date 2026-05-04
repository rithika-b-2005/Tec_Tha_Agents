// Voice Agent — Conversation turn handler
// Receives transcribed speech from Twilio, generates Priya's AI response,
// converts to audio via ElevenLabs, returns TwiML to continue conversation.
// Required env vars:
//   GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
//   NEXT_PUBLIC_BASE_URL

import { prisma } from "@/lib/prisma"
import { getSession, addMessage, deleteSession, getSessionTranscript, storeAudio } from "@/lib/voice-store"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"

// ElevenLabs TTS helper
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

// Build Groq system prompt for Priya
function buildSystemPrompt(session: {
  leadName: string
  leadCompany: string
  leadIndustry: string
  needSignals: string
  icpLabel: string | null
}): string {
  return `You are Priya, a friendly sales executive at Tec Tha, an AI automation company based in India.
You're calling ${session.leadName} from ${session.leadCompany} (${session.leadIndustry} industry).

About this lead: ${session.needSignals || "No specific signals available."}${session.icpLabel ? `\nICP classification: ${session.icpLabel}` : ""}

Your goal: have a warm natural conversation, understand their pain, briefly pitch how Tec Tha's AI automation can help them, and try to book a 15-minute discovery call.

CRITICAL RULES:
- Sound exactly like a real person. NEVER say you are AI.
- Keep responses to 1-2 short sentences MAX. This is a phone call.
- If they say "hello" just say "Hello! Is this ${session.leadName}?" warmly
- Match their energy and language
- Use natural fillers: "actually", "basically", "you know", "right"
- If busy: "No problem! Can I call back later? When works for you?"
- If interested: guide toward "Can we schedule a quick 15-min call?"
- If not interested: "No worries at all! Have a great day!" then end
- NEVER be pushy
- Respond in the same language they use (Hindi/English mix is fine)`
}

// Detect if conversation should end based on speech/response content
function detectCallEnd(text: string): { shouldEnd: boolean; outcome: string | null } {
  const lower = text.toLowerCase()
  if (["bye", "goodbye", "good bye", "take care", "tata"].some((w) => lower.includes(w))) {
    return { shouldEnd: true, outcome: "completed" }
  }
  if (["not interested", "no thanks", "don't call", "don't contact", "remove me", "stop calling"].some((w) => lower.includes(w))) {
    return { shouldEnd: true, outcome: "not_interested" }
  }
  if (["call back", "callback", "call me later", "call me back", "busy right now", "in a meeting"].some((w) => lower.includes(w))) {
    return { shouldEnd: true, outcome: "callback" }
  }
  if (["voicemail", "leave a message", "not available"].some((w) => lower.includes(w))) {
    return { shouldEnd: true, outcome: "voicemail" }
  }
  if (["schedule", "15 minutes", "discovery call", "book a call", "sounds good", "interested", "tell me more"].some((w) => lower.includes(w))) {
    return { shouldEnd: false, outcome: "interested" }
  }
  return { shouldEnd: false, outcome: null }
}

function buildHangupTwiML(audioUrl?: string): string {
  if (audioUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Hangup/>
</Response>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`
}

function buildContinueTwiML(audioUrl: string, gatherAction: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" action="${gatherAction}" method="POST" speechTimeout="3" speechModel="phone_call" language="en-IN">
  </Gather>
  <Redirect>${gatherAction}</Redirect>
</Response>`
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const callRecordId = url.searchParams.get("callRecordId") || ""

    // Parse Twilio's form-encoded body
    const formData = await request.formData()
    const speechResult = formData.get("SpeechResult") as string | null
    const callSid = formData.get("CallSid") as string
    const callStatus = formData.get("CallStatus") as string

    console.log(`[voice/respond] CallSid=${callSid} Status=${callStatus} Speech="${speechResult}"`)

    // If call ended or no speech, hang up
    if (!speechResult || callStatus === "completed" || callStatus === "failed") {
      return new Response(buildHangupTwiML(), {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })
    }

    // Get session (try callSid first, then callRecordId as fallback)
    const sessionKey = callSid || callRecordId
    let session = getSession(sessionKey)
    if (!session && callRecordId && callSid !== callRecordId) {
      session = getSession(callRecordId)
    }

    if (!session) {
      console.error(`[voice/respond] No session found for CallSid=${callSid}`)
      return new Response(buildHangupTwiML(), {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })
    }

    // Add user's speech to history
    addMessage(sessionKey, "user", speechResult)

    // Check if lead wants to end the call
    const userEndCheck = detectCallEnd(speechResult)

    // Build messages for Groq
    const systemPrompt = buildSystemPrompt(session)
    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...session.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    // Call Groq API (llama-3.3-70b-versatile)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error("[voice/respond] Groq error:", errText)
      return new Response(buildHangupTwiML(), {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })
    }

    const groqData = await groqRes.json()
    const priyaResponse: string = groqData.choices?.[0]?.message?.content?.trim() || "I see. Can you tell me more about that?"

    // Add Priya's response to session history
    addMessage(sessionKey, "assistant", priyaResponse)

    // Check if Priya's response signals end of call
    const responseEndCheck = detectCallEnd(priyaResponse)
    const shouldEnd = userEndCheck.shouldEnd || responseEndCheck.shouldEnd
    const outcome = responseEndCheck.outcome || userEndCheck.outcome

    // Generate audio for Priya's response via ElevenLabs
    const audioBuffer = await textToSpeech(priyaResponse)
    const audioId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    storeAudio(audioId, audioBuffer)
    const audioUrl = `${BASE_URL}/api/voice/audio/${audioId}`

    if (shouldEnd) {
      // Save transcript and outcome to DB before ending call
      try {
        const transcript = getSessionTranscript(sessionKey)
        await prisma.voiceCall.update({
          where: { id: callRecordId },
          data: {
            status: "completed",
            transcript,
            outcome: outcome || "completed",
          },
        })
        deleteSession(sessionKey)
      } catch (dbErr) {
        console.error("[voice/respond] DB update error:", dbErr)
      }

      return new Response(buildHangupTwiML(audioUrl), {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })
    }

    // Mark as interested in DB if detected during ongoing call
    if (outcome === "interested" && callRecordId) {
      try {
        await prisma.voiceCall.update({
          where: { id: callRecordId },
          data: { outcome: "interested" },
        })
      } catch {
        // non-fatal
      }
    }

    // Continue conversation: play response and gather next input
    const gatherAction = `${BASE_URL}/api/voice/respond?callRecordId=${callRecordId}`
    return new Response(buildContinueTwiML(audioUrl, gatherAction), {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    })
  } catch (err) {
    console.error("[voice/respond]", err)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was a technical error.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "application/xml" } }
    )
  }
}
