import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendClassInviteEmail } from "@/lib/email"

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.scheduledClass.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[classes/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    // ── Add attendees ──────────────────────────────────────────────────────
    if (body.addAttendees) {
      const cls = await prisma.scheduledClass.findUnique({ where: { id } })
      if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 })

      const raw: string[] = (
        typeof body.addAttendees === "string"
          ? body.addAttendees.split(",")
          : body.addAttendees
      ).map((v: string) => v.trim()).filter(Boolean)

      // Deduplicate — skip already-added attendees
      const existing  = new Set(cls.attendees)
      const newOnes   = raw.filter((v) => !existing.has(v))
      if (newOnes.length === 0) {
        return NextResponse.json({ class: cls, added: 0, message: "All attendees already in class." })
      }

      const merged = [...cls.attendees, ...newOnes]
      const updated = await prisma.scheduledClass.update({
        where: { id },
        data: { attendees: merged },
      })

      // Notify new attendees
      const emails = newOnes.filter(isEmail)
      const phones = newOnes.filter((v) => !isEmail(v) && isPhone(v))

      const waMsg = [
        `*Class Invite: ${cls.title}*`,
        `Date: ${cls.date}`,
        `Time: ${cls.time}`,
        cls.location    ? `Location: ${cls.location}`     : null,
        cls.description ? `About: ${cls.description}`     : null,
        `\n_Tec Tha Class Scheduler_`,
      ].filter(Boolean).join("\n")

      let emailsSent   = 0
      let whatsappSent = 0

      if (emails.length > 0) {
        const results = await Promise.allSettled(
          emails.map((e) =>
            sendClassInviteEmail(e, cls.title, cls.date, cls.time, cls.location, cls.description)
          )
        )
        emailsSent = results.filter((r) => r.status === "fulfilled").length
      }

      if (phones.length > 0) {
        const results = await Promise.allSettled(phones.map((p) => sendWhatsApp(p, waMsg)))
        whatsappSent = results.filter((r) => r.status === "fulfilled").length
      }

      return NextResponse.json({
        class: updated,
        added: newOnes.length,
        emailsSent,
        whatsappSent,
        newAttendees: newOnes,
      })
    }

    // ── Update status ──────────────────────────────────────────────────────
    const updated = await prisma.scheduledClass.update({
      where: { id },
      data: { status: body.status },
    })
    return NextResponse.json({ class: updated })
  } catch (err) {
    console.error("[classes/[id] PATCH]", err)
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}
