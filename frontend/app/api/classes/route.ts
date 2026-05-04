import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendClassInviteEmail } from "@/lib/email"

async function sendWhatsApp(to: string, body: string) {
  const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID  || ""
  const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN    || ""
  const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || ""
  const phone = to.replace(/\D/g, "")
  const toWA  = `whatsapp:+${phone}`
  const creds = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString("base64")
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: toWA, Body: body }).toString(),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || "Twilio error")
  return data.sid
}

function isEmail(val: string) { return val.includes("@") }
function isPhone(val: string) { return val.replace(/\D/g, "").length >= 7 }

export async function GET() {
  try {
    const classes = await prisma.scheduledClass.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ classes })
  } catch (err) {
    console.error("[classes GET]", err)
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, date, time, location, attendees } = body

    if (!title || !date || !time) {
      return NextResponse.json({ error: "title, date, and time are required" }, { status: 400 })
    }

    // Parse comma-separated emails and/or phone numbers
    const raw: string[] = (
      Array.isArray(attendees) ? attendees : typeof attendees === "string" ? attendees.split(",") : []
    ).map((v: string) => v.trim()).filter(Boolean)

    const emails = raw.filter(isEmail)
    const phones = raw.filter((v) => !isEmail(v) && isPhone(v))

    let scheduledClass
    try {
      scheduledClass = await prisma.scheduledClass.create({
        data: {
          title,
          description: description || null,
          date,
          time,
          location: location || null,
          attendees: raw,   // store all (emails + phones)
          emailSent: false,
        },
      })
    } catch (dbErr) {
      console.error("[classes POST] DB error:", dbErr)
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      return NextResponse.json({ error: "DB error: " + msg }, { status: 500 })
    }

    // WhatsApp message body
    const waMsg = [
      `*Class Scheduled: ${title}*`,
      `Date: ${date}`,
      `Time: ${time}`,
      location    ? `Location: ${location}`  : null,
      description ? `About: ${description}`  : null,
      `\n_Tec Tha Class Scheduler_`,
    ].filter(Boolean).join("\n")

    // Send WhatsApp
    let whatsappSent = 0
    let whatsappError: string | null = null
    if (phones.length > 0) {
      const _sid = process.env.TWILIO_ACCOUNT_SID
      const _auth = process.env.TWILIO_AUTH_TOKEN
      const _from = process.env.TWILIO_WHATSAPP_FROM
      console.log("[classes] TWILIO_ACCOUNT_SID:", _sid ? _sid.slice(0,6)+"…" : "MISSING")
      console.log("[classes] TWILIO_AUTH_TOKEN:", _auth ? "SET" : "MISSING")
      console.log("[classes] TWILIO_WHATSAPP_FROM:", _from || "MISSING")
      if (!_sid || !_auth || !_from) {
        whatsappError = `Twilio credentials not configured (SID:${_sid?"ok":"missing"} AUTH:${_auth?"ok":"missing"} FROM:${_from?"ok":"missing"})`
      } else {
        const results = await Promise.allSettled(phones.map((p) => sendWhatsApp(p, waMsg)))
        whatsappSent  = results.filter((r) => r.status === "fulfilled").length
        const fails   = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]
        if (fails.length) whatsappError = fails.map((f) => String(f.reason)).join("; ")
      }
    }

    // Send emails
    let emailsSent = 0
    let emailError: string | null = null
    if (emails.length > 0) {
      const results = await Promise.allSettled(
        emails.map((e) => sendClassInviteEmail(e, title, date, time, location, description))
      )
      emailsSent      = results.filter((r) => r.status === "fulfilled").length
      const fails     = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]
      if (fails.length) emailError = fails.map((f) => String(f.reason)).join("; ")
    }

    const anySent = whatsappSent > 0 || emailsSent > 0
    if (anySent) {
      await prisma.scheduledClass.update({
        where: { id: scheduledClass.id },
        data: { emailSent: true },
      })
    }

    return NextResponse.json({
      class: { ...scheduledClass, emailSent: anySent },
      whatsappSent,
      emailsSent,
      whatsappError,
      emailError,
    })
  } catch (err) {
    console.error("[classes POST] Outer error:", err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: "Failed to schedule class: " + msg }, { status: 500 })
  }
}
