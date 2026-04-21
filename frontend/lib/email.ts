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
