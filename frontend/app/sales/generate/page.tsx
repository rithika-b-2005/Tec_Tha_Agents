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
  ArrowLeft, ArrowRight, TrendingUp, CheckCircle2,
  Users, MapPin, Briefcase, Mail, Zap,
} from "lucide-react"
import { fadeUp, transition } from "@/lib/animations"

export default function SalesGeneratePage() {
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState("")
  const [maxLeads, setMaxLeads]   = useState(10)
  const [count, setCount]         = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = e.target as HTMLFormElement
    const fd   = new FormData(form)

    try {
      const res = await fetch("/api/sales/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType:   fd.get("businessType"),
          location:       fd.get("location"),
          productService: fd.get("productService"),
          idealCustomer:  fd.get("idealCustomer"),
          senderName:     fd.get("senderName"),
          senderCompany:  fd.get("senderCompany"),
          maxLeads,
        }),
      })
      if (!res.ok) {
        let errMsg = "Failed to start."
        try { const d = await res.json(); errMsg = d.error ?? errMsg } catch {}
        setError(errMsg); return
      }
      setCount(maxLeads)
      setDone(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f3f4f6" }}>
          <div className="max-w-md w-full bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-10 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Sales Prospects Found!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                  Found <strong className="text-gray-900">{count} prospects</strong> with identified pain points,
                  tailored sales pitches, proposal summaries, and discovery call emails ready.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-left w-full space-y-1.5">
                <p className="text-xs font-semibold text-emerald-700">Pipeline completed</p>
                {[
                  "Google Maps businesses fetched via Serper",
                  "Pain points identified by GPT-4o",
                  "Sales pitches & proposals written",
                  "Personalized discovery call emails ready",
                ].map((s, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{s}
                  </p>
                ))}
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1 rounded-xl h-11 text-sm" onClick={() => setDone(false)}>
                  Find More
                </Button>
                <Button asChild className="flex-1 rounded-xl text-white font-semibold h-11 text-sm" style={{ background: "#059669" }}>
                  <Link href="/sales">View Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      <section className="pt-6 pb-8 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <motion.h1
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-3"
          >
            Find Sales Prospects
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            AI searches Google Maps, qualifies each business, identifies their pain point,
            writes a tailored pitch and discovery call email — ready to close.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">Target Market</p>
                  <p className="text-xs text-gray-400 mt-0.5">Define your ideal buyer — AI qualifies and pitches for you</p>
                </div>
              </div>

              <div className="px-8 py-7 space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" /> Business Type
                    </Label>
                    <Input name="businessType" placeholder="e.g. law firm" required
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Location
                    </Label>
                    <Input name="location" placeholder="e.g. Hyderabad, India" required
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" /> Your Product / Service
                  </Label>
                  <Textarea name="productService"
                    placeholder="e.g. AI-powered CRM that automates follow-ups and saves 5+ hours per week"
                    required
                    className="rounded-lg resize-none border-[#e0e0e0] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[72px]" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" /> Ideal Customer Profile
                  </Label>
                  <Input name="idealCustomer"
                    placeholder="e.g. SMBs with 5-50 employees struggling to scale operations"
                    required
                    className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Sender Details
                  </p>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium">Your Name</Label>
                      <Input name="senderName" placeholder="Your name" required
                        className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium">Company</Label>
                      <Input name="senderCompany" placeholder="Your company" required
                        className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Volume
                  </p>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">Max prospects</Label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setMaxLeads(v => Math.max(5, v - 1))}
                        className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-lg font-medium">−</button>
                      <span className="w-10 text-center text-lg font-bold text-emerald-600">{maxLeads}</span>
                      <button type="button" onClick={() => setMaxLeads(v => Math.min(25, v + 1))}
                        className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors text-lg font-medium">+</button>
                      <span className="text-xs text-gray-400">max 25</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" disabled={loading}
                  className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                  style={{ background: "#059669" }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running sales agent...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Find {maxLeads} Sales Prospects
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">Takes 10–30 seconds. Results appear instantly.</p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
