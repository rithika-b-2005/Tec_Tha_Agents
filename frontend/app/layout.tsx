import type { Metadata } from "next"
import { Titillium_Web } from "next/font/google"
import "./globals.css"

const titilliumWeb = Titillium_Web({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "900"],
  variable: "--font-titillium-web",
})

export const metadata: Metadata = {
  title: "Tec Tha - AI Automation Agents",
  description: "Automate your outreach with AI agents",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${titilliumWeb.variable} antialiased`}>{children}</body>
    </html>
  )
}
