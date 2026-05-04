import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const ADMIN_EMAIL = process.env.GMAIL_USER ?? "tecthaofficial@gmail.com"
const FROM = `"Tec Tha" <${ADMIN_EMAIL}>`

function wrap(inner: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">${inner}</div>`
}

function header(title: string, subtitle = "") {
  return `
  <div style="background:linear-gradient(105deg,#0a1628,#1a56db);padding:24px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:20px;font-weight:600;">${title}</h2>
    ${subtitle ? `<p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">${subtitle}</p>` : ""}
  </div>`
}

export async function sendClassInviteEmail(
  to: string,
  classTitle: string,
  date: string,
  time: string,
  location: string | null | undefined,
  description: string | null | undefined
) {
  const locationLine = location
    ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Where:</strong> ${location}</p>`
    : ""
  const descLine = description
    ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.7;">${description}</p>`
    : ""

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Class Scheduled: ${classTitle} on ${date} at ${time}`,
    html: wrap(`
      ${header("Class Scheduled", classTitle)}
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="margin:0;font-size:14px;color:#374151;">You have been invited to the following class:</p>
        <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${classTitle}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#374151;"><strong>When:</strong> ${date} at ${time}</p>
          ${locationLine}
          ${descLine}
        </div>
        <p style="margin:0;font-size:13px;color:#6b7280;">This is an automated notification from Tec Tha Class Scheduler.</p>
      </div>
    `),
  })
}

export async function sendColdOutreachEmail(
  to: string,
  subject: string,
  emailBody: string,
  senderName = "Team",
  senderCompany = "Tec Tha"
) {
  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html: wrap(`
      ${header(senderCompany, "Reaching out with something relevant")}
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <div style="font-size:14px;color:#374151;line-height:1.9;white-space:pre-line;">
          ${emailBody.replace(/\n/g, "<br/>")}
        </div>
        <div style="margin-top:28px;padding-top:18px;border-top:1px solid #f0f2f5;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${senderName}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#1a56db;">${senderCompany}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${ADMIN_EMAIL}</p>
        </div>
      </div>
    `),
  })
}
