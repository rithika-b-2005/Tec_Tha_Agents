"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, Search, Globe, Building2,
  MapPin, CheckCircle2, AlertCircle,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#1e40af"

const INDUSTRIES = [
  "Real Estate", "Healthcare", "E-Commerce", "FinTech", "EdTech",
  "SaaS / Software", "Logistics", "Food & Beverage", "Retail",
  "Manufacturing", "Agriculture", "Tourism", "Legal", "Construction",
  "Energy / CleanTech", "Media & Entertainment",
]

const REGIONS = [
  "Global", "India", "GCC / Middle East", "USA", "Europe",
  "Southeast Asia", "Africa", "Latin America",
]

const STEPS = [
  { key: "pending",                  label: "Starting research..." },
  { key: "researching_market",       label: "Analysing market size & growth..." },
  { key: "researching_trends",       label: "Identifying key industry trends..." },
  { key: "researching_competitors",  label: "Mapping top competitors..." },
  { key: "researching_audience",     label: "Profiling target audience..." },
  { key: "researching_pain_points",  label: "Uncovering pain points & challenges..." },
  { key: "researching_opportunities",label: "Discovering market opportunities..." },
  { key: "researching_news",         label: "Scanning latest news & developments..." },
  { key: "synthesizing",             label: "Synthesising executive summary..." },
  { key: "done",                     label: "Research complete!" },
]

const STEP_ORDER = STEPS.map((s) => s.key)

export default function ResearchGeneratePage() {
  const router = useRouter()

  const [industry, setIndustry] = useState("")
  const [topic, setTopic] = useState("")
  const [region, setRegion] = useState("Global")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [reportId, setReportId] = useState("")
  const [failed, setFailed] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!industry.trim()) { setError("Industry is required"); return }

    setLoading(true)
    setStatus("pending")

    try {
      const res = await fetch("/api/research/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: industry.trim(), topic: topic.trim() || null, region }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to start"); setLoading(false); return }

      setReportId(data.reportId)

      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/research/${data.reportId}`)
          const d = await r.json()
          const s = d.report?.status
          if (s) setStatus(s)
          if (s === "done") {
            clearInterval(poll)
            router.push(`/research/${data.reportId}`)
          }
          if (s === "failed") {
            clearInterval(poll)
            setFailed(d.report?.error || "Research failed")
            setLoading(false)
          }
        } catch {}
      }, 3000)
    } catch {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  const currentIdx = STEP_ORDER.indexOf(status)

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
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
            AI Market Research Agent
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Enter any industry or topic. AI searches the web across 7 dimensions —
            market size, trends, competitors, audience, pain points, opportunities, and news —
            then delivers a full research report.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Input card */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-8 py-5 border-b border-[#f0f2f5]">
                <p className="text-base font-semibold text-gray-900">Research Configuration</p>
                <p className="text-xs text-gray-400 mt-0.5">AI searches the web and synthesises a full market report</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">
                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                {/* Industry */}
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Industry
                  </Label>
                  <Input
                    placeholder="e.g. Real Estate, FinTech, Healthcare..."
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setIndustry(ind)}
                        className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                        style={industry === ind
                          ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                          : { background: "#f3f4f6", color: "#374151", borderColor: "#e0e0e0" }
                        }
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific topic */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Specific Focus
                    <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. GPS attendance tracking, AI diagnostics, B2B SaaS pricing..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <p className="text-xs text-gray-400">Narrow down the research to a specific niche or use case</p>
                </div>

                {/* Region */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Market Region
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegion(r)}
                        className="px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                        style={region === r
                          ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                          : { background: "#fff", color: "#374151", borderColor: "#e0e0e0" }
                        }
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                  style={{ background: ACCENT }}
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Start Research
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
                <p className="text-center text-xs text-gray-400">Takes 1–3 minutes · Searches web across 7 research dimensions</p>
              </form>
            </motion.div>
          )}

          {/* Progress card */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-8 py-5 border-b border-[#f0f2f5]">
                <p className="text-base font-semibold text-gray-900">
                  {failed ? "Research Failed" : status === "done" ? "Research Complete!" : "Researching..."}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {topic ? `${topic} · ` : ""}{industry} · {region}
                </p>
              </div>

              <div className="px-8 py-6 space-y-2.5">
                {STEPS.map((step, i) => {
                  const done = currentIdx > i
                  const active = currentIdx === i && status !== "done"
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT }} />
                        ) : active ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                            style={{ borderColor: "#bfdbfe", borderTopColor: ACCENT }} />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />
                        )}
                      </div>
                      <p className={`text-sm ${done ? "text-gray-700" : active ? "font-medium text-gray-900" : "text-gray-300"}`}>
                        {step.label}
                      </p>
                      {active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#dbeafe", color: ACCENT }}>
                          Running
                        </span>
                      )}
                    </div>
                  )
                })}

                {failed && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600">{failed}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </section>
    </div>
  )
}
