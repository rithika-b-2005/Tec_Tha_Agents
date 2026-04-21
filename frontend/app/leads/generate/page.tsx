"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, Sparkles, CheckCircle2,
  Users, MapPin, Briefcase, Mail, Zap,
} from "lucide-react"
import { fadeUp, transition } from "@/lib/animations"

export default function GenerateLeadsPage() {
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState("")
  const [maxLeads, setMaxLeads]       = useState(10)
  const [sendEmail, setSendEmail]     = useState(true)
  const [estimated, setEstimated]     = useState(10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = e.target as HTMLFormElement
    const fd   = new FormData(form)

    try {
      const res = await fetch("/api/leads/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType:  fd.get("businessType"),
          location:      fd.get("location"),
          yourService:   fd.get("yourService"),
          senderName:    fd.get("senderName"),
          senderCompany: fd.get("senderCompany"),
          maxLeads,
          sendEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to start."); return }
      setEstimated(data.estimatedLeads || maxLeads)
      setDone(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /* ── Success screen ── */
  if (done) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f3f4f6" }}>
          <div className="max-w-md w-full bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-10 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Leads Generated!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                  Found up to <strong className="text-gray-900">{estimated} leads</strong>. The AI
                  searched Google Maps, enriched each contact, scored against your ICP, and
                  {sendEmail ? " wrote personalized cold emails." : " saved them to your dashboard."}
                </p>
              </div>

              <div className="bg-[#eff6ff] border border-blue-100 rounded-xl px-4 py-3 text-left w-full space-y-1.5">
                <p className="text-xs font-semibold text-[#1e40af]">Pipeline completed</p>
                {[
                  "Google Maps businesses fetched via Serper",
                  "AI researched each company",
                  "Personalized emails written by GPT-4o",
                  sendEmail ? "Cold emails queued for sending" : "Leads saved to dashboard",
                ].map((s, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#276ef1] shrink-0" />{s}
                  </p>
                ))}
                <p className="text-xs text-gray-400 pt-1">View your leads now in the dashboard</p>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-11 text-sm"
                  onClick={() => setDone(false)}
                >
                  Generate More
                </Button>
                <Button
                  asChild
                  className="flex-1 rounded-xl text-white font-semibold h-11 text-sm"
                  style={{ background: "#276ef1" }}
                >
                  <Link href="/leads">View Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  /* ── Main form ── */
  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link
          href="/workflow"
          className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#276ef1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Hero */}
      <section className="pt-6 pb-8 px-6 text-center">
        <div className="max-w-xl mx-auto">

          <motion.h1
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-3"
          >
            Generate Targeted Leads
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Describe your target business. AI scrapes Google Maps, enriches each contact,
            scores them against your ICP, and sends personalized cold emails — all automated.
          </motion.p>
        </div>
      </section>

      {/* Form */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">Target Audience</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Define your prospect — AI does the research and outreach
                  </p>
                </div>
              </div>

              <div className="px-8 py-7 space-y-6">

                {/* Target */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#276ef1]" /> Business Type
                    </Label>
                    <Input
                      name="businessType"
                      placeholder="e.g. digital marketing agency"
                      required
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#276ef1]" /> Location
                    </Label>
                    <Input
                      name="location"
                      placeholder="e.g. Bangalore, India"
                      required
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#276ef1]" /> Your Service / Value Proposition
                  </Label>
                  <Textarea
                    name="yourService"
                    placeholder="e.g. We help businesses save 10+ hours/week by automating their operations with AI — no code needed"
                    required
                    className="rounded-lg resize-none border-[#e0e0e0] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                  />
                </div>

                {/* Sender */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#276ef1]" /> Email Sender Details
                  </p>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium">Your Name</Label>
                      <Input
                        name="senderName"
                        placeholder="Your name"

                        required
                        className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium">Company</Label>
                      <Input
                        name="senderCompany"
                        placeholder="Your company"

                        required
                        className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#276ef1]" /> Generation Settings
                  </p>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm font-medium">Max leads</Label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMaxLeads(v => Math.max(5, v - 1))}
                          className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-[#276ef1] hover:text-[#276ef1] transition-colors text-lg font-medium"
                        >−</button>
                        <span className="w-10 text-center text-lg font-bold text-[#276ef1]">{maxLeads}</span>
                        <button
                          type="button"
                          onClick={() => setMaxLeads(v => Math.min(25, v + 1))}
                          className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-[#276ef1] hover:text-[#276ef1] transition-colors text-lg font-medium"
                        >+</button>
                        <span className="text-xs text-gray-400">max 25</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm font-medium">Auto-send cold emails</Label>
                      <div className="flex items-center gap-3 h-9">
                        <button
                          type="button"
                          onClick={() => setSendEmail(v => !v)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            width: 44,
                            height: 24,
                            borderRadius: 999,
                            padding: 2,
                            background: sendEmail ? "#276ef1" : "#e2e8f0",
                            border: `2px solid ${sendEmail ? "#276ef1" : "#cbd5e1"}`,
                            cursor: "pointer",
                            transition: "background 0.2s, border-color 0.2s",
                          }}
                        >
                          <span style={{
                            display: "block",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            transform: sendEmail ? "translateX(20px)" : "translateX(0px)",
                            transition: "transform 0.2s",
                          }} />
                        </button>
                        <span className="text-sm text-gray-600">
                          {sendEmail ? "Yes — send automatically" : "Save to dashboard only"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                  style={{ background: "#276ef1" }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Triggering AI pipeline...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate {maxLeads} Leads
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  Takes 10–30 seconds. Leads appear in your dashboard instantly.
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
