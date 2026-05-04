import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendClassInviteEmail } from "@/lib/email"
import { createMeeting } from "@/lib/meeting-store"

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY || ""

function isEmail(val: string) { return val.includes("@") }
function isPhone(val: string) { return val.replace(/\D/g, "").length >= 7 }

async function sendWhatsApp(to: string, body: string) {
  const SID  = process.env.TWILIO_ACCOUNT_SID  || ""
  const AUTH = process.env.TWILIO_AUTH_TOKEN    || ""
  const FROM = process.env.TWILIO_WHATSAPP_FROM || ""
  if (!SID || !AUTH || !FROM) throw new Error("Twilio not configured")
  const phone = to.replace(/\D/g, "")
  const creds = Buffer.from(`${SID}:${AUTH}`).toString("base64")
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: FROM, To: `whatsapp:+${phone}`, Body: body }).toString(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || "Twilio error")
  return data.sid
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()
    if (!prompt?.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    if (!GROQ_KEY)       return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })

    const today = new Date().toISOString().split("T")[0]

    // Ask Groq to extract scheduling fields
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Today is ${today}. You are a class scheduling assistant. Extract scheduling details from the user's message.

Return ONLY valid JSON with these keys:
{
  "title": string,           // class/session title
  "date": "YYYY-MM-DD",     // convert relative dates (tomorrow, next Monday) relative to ${today}
  "time": "HH:MM",          // 24-hour format
  "location": string|null,   // room, address, or meeting link; null if not mentioned
  "description": string|null, // brief description of what the class covers; null if not mentioned
  "attendees": string[],     // array of email addresses and/or phone numbers (keep as-is)
  "message": string,         // friendly 1-sentence confirmation like "Scheduled Python Intro for May 5 at 3:00 PM"
  "error": string|null       // set if title/date/time cannot be determined, explain what's missing
}

Rules:
- If date/time is ambiguous but title is clear, ask for clarification via error field
- Phone numbers: keep in international format with country code (e.g. 918807412810 for India)
- Emails: validate they contain @ symbol
- description: extract any topic details the user mentions (e.g. "covering loops and functions")`,
          },
          { role: "user", content: prompt.trim() },
        ],
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error("[classes/ai] Groq error:", err)
      return NextResponse.json({ error: "AI service error" }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const rawContent = groqData?.choices?.[0]?.message?.content?.trim() || "{}"

    let extracted: {
      title?: string
      date?: string
      time?: string
      location?: string | null
      description?: string | null
      attendees?: string[]
      message?: string
      error?: string | null
    }
    try {
      extracted = JSON.parse(rawContent)
    } catch {
      return NextResponse.json({ error: "AI returned invalid response. Please rephrase your request." }, { status: 500 })
    }

    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 400 })
    }

    const { title, date, time, attendees = [], message } = extracted
    let { location, description } = extracted

    if (!title || !date || !time) {
      return NextResponse.json(
        { error: "Could not extract title, date, or time. Try: 'Schedule Python class on May 10 at 3pm for alice@email.com'" },
        { status: 400 }
      )
    }

    // Auto-generate meeting link if no location provided
    if (!location) {
      const meetingId = crypto.randomUUID()
      const baseUrl   = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      createMeeting({ id: meetingId, title, date: date!, time: time!, description: description ?? undefined })
      location = `${baseUrl}/meeting/room?id=${meetingId}&auto=1`
    }

    // Create the class record
    const scheduledClass = await prisma.scheduledClass.create({
      data: {
        title,
        description: description || null,
        date,
        time,
        location: location || null,
        attendees,
        emailSent: false,
      },
    })

    const emails = attendees.filter(isEmail)
    const phones = attendees.filter((v) => !isEmail(v) && isPhone(v))

    // WhatsApp message
    const waMsg = [
      `*Class Scheduled: ${title}*`,
      `Date: ${date}`,
      `Time: ${time}`,
      location    ? `Location: ${location}`    : null,
      description ? `About: ${description}`    : null,
      `\n_Tec Tha Class Scheduler_`,
    ].filter(Boolean).join("\n")

    let emailsSent    = 0
    let whatsappSent  = 0
    let emailError:   string | null = null
    let whatsappError: string | null = null

    if (emails.length > 0) {
      const results = await Promise.allSettled(
        emails.map((e) => sendClassInviteEmail(e, title, date, time, location ?? null, description ?? null))
      )
      emailsSent = results.filter((r) => r.status === "fulfilled").length
      const fails = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]
      if (fails.length) emailError = fails.map((f) => String(f.reason)).join("; ")
    }

    if (phones.length > 0) {
      const results = await Promise.allSettled(phones.map((p) => sendWhatsApp(p, waMsg)))
      whatsappSent = results.filter((r) => r.status === "fulfilled").length
      const fails  = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]
      if (fails.length) whatsappError = fails.map((f) => String(f.reason)).join("; ")
    }

    const anySent = emailsSent > 0 || whatsappSent > 0
    if (anySent) {
      await prisma.scheduledClass.update({ where: { id: scheduledClass.id }, data: { emailSent: true } })
    }

    return NextResponse.json({
      class: { ...scheduledClass, emailSent: anySent },
      message: message || `Scheduled "${title}" for ${date} at ${time}.`,
      emailsSent,
      whatsappSent,
      emailError,
      whatsappError,
    })
  } catch (err) {
    console.error("[classes/ai POST]", err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: "AI scheduling failed: " + msg }, { status: 500 })
  }
}
