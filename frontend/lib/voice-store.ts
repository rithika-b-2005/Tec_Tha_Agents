// Voice Agent in-memory session and audio store
// Sessions: conversation history per active call (keyed by Twilio CallSid)
// Audio: ElevenLabs audio buffers with 5-minute TTL

interface Message {
  role: "assistant" | "user"
  content: string
}

interface VoiceSession {
  leadId: string
  leadName: string
  leadCompany: string
  leadIndustry: string
  needSignals: string
  icpLabel: string | null
  messages: Message[]
  lastActivity: number
}

const sessions = new Map<string, VoiceSession>()
const audioStore = new Map<string, Buffer>()

export function createSession(
  callSid: string,
  lead: {
    id: string
    name: string
    company?: string | null
    industry?: string | null
    needSignals?: string | null
    icpLabel?: string | null
  }
) {
  sessions.set(callSid, {
    leadId: lead.id,
    leadName: lead.name,
    leadCompany: lead.company || lead.name,
    leadIndustry: lead.industry || "business",
    needSignals: lead.needSignals || "",
    icpLabel: lead.icpLabel || null,
    messages: [],
    lastActivity: Date.now(),
  })
}

export function getSession(callSid: string): VoiceSession | undefined {
  return sessions.get(callSid)
}

export function addMessage(callSid: string, role: "assistant" | "user", content: string) {
  const s = sessions.get(callSid)
  if (s) {
    s.messages.push({ role, content })
    s.lastActivity = Date.now()
  }
}

export function deleteSession(callSid: string) {
  sessions.delete(callSid)
}

export function storeAudio(id: string, buffer: Buffer) {
  audioStore.set(id, buffer)
  // Auto-expire after 5 minutes
  setTimeout(() => audioStore.delete(id), 5 * 60 * 1000)
}

export function getAudio(id: string): Buffer | undefined {
  return audioStore.get(id)
}

export function getSessionTranscript(callSid: string): string {
  const s = sessions.get(callSid)
  if (!s) return ""
  return s.messages
    .map((m) => `${m.role === "assistant" ? "Priya" : s.leadName}: ${m.content}`)
    .join("\n")
}
