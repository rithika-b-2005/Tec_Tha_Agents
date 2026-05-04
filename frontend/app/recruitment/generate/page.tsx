"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Users, MapPin,
  Briefcase, Search, Loader2,
} from "lucide-react"
import { fadeUp, transition } from "@/lib/animations"

export default function RecruitmentGeneratePage() {
  const router = useRouter()

  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)
  const [error, setError]               = useState("")
  const [maxCandidates, setMaxCandidates] = useState(15)
  const [resultCount, setResultCount]   = useState(0)
  const [resultJobId, setResultJobId]   = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = e.target as HTMLFormElement
    const fd   = new FormData(form)

    try {
      const res = await fetch("/api/recruitment/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: fd.get("jobDescription"),
          maxCandidates,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to generate candidates."); return }
      setResultCount(data.total ?? 0)
      setResultJobId(data.jobId ?? "")
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
              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-teal-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Candidates Found!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                  The AI searched across LinkedIn, Internshala, Naukri, GitHub, and Wellfound.
                  Found <strong className="text-gray-900">{resultCount} candidates</strong> — scored,
                  ranked, and ready to review.
                </p>
              </div>

              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-left w-full space-y-1.5">
                <p className="text-xs font-semibold text-teal-700">Pipeline completed</p>
                {[
                  "Job description parsed with Groq AI",
                  "Candidates searched on 5 platforms in parallel",
                  "Each candidate scored 0–100 for job fit",
                  "Personalized outreach messages generated",
                ].map((s, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{s}
                  </p>
                ))}
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-11 text-sm"
                  onClick={() => setDone(false)}
                >
                  Search Again
                </Button>
                <Button
                  asChild
                  className="flex-1 rounded-xl text-white font-semibold h-11 text-sm"
                  style={{ background: "#0891b2" }}
                >
                  <Link href={resultJobId ? `/recruitment/${resultJobId}` : "/recruitment"}>
                    View Candidates
                  </Link>
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
          href="/recruitment"
          className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#0891b2] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Recruitment
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
            Recruitment Agent
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Paste a job description. AI parses the requirements, searches LinkedIn, Internshala,
            Naukri, GitHub and Wellfound in parallel, then scores and ranks every candidate.
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
                  <p className="text-base font-semibold text-gray-900">Job Description</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    AI extracts skills, title, and location — then hunts candidates automatically
                  </p>
                </div>
              </div>

              <div className="px-8 py-7 space-y-6">

                {/* Job Description */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0891b2]" /> Job Description
                  </Label>
                  <Textarea
                    name="jobDescription"
                    placeholder="Paste full job description here..."
                    required
                    className="rounded-lg resize-none border-[#e0e0e0] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[200px]"
                  />
                </div>

                {/* Location override */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0891b2]" /> Location Override{" "}
                    <span className="text-gray-400 font-normal">(optional — uses JD location if blank)</span>
                  </Label>
                  <Input
                    name="locationOverride"
                    placeholder="e.g. Bangalore, India"
                    className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                {/* Max candidates */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0891b2]" /> Max Candidates
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMaxCandidates(v => Math.max(5, v - 5))}
                      className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-[#0891b2] hover:text-[#0891b2] transition-colors text-lg font-medium"
                    >−</button>
                    <span className="w-10 text-center text-lg font-bold text-[#0891b2]">{maxCandidates}</span>
                    <button
                      type="button"
                      onClick={() => setMaxCandidates(v => Math.min(30, v + 5))}
                      className="w-8 h-8 rounded-lg border border-[#e0e0e0] flex items-center justify-center text-gray-600 hover:border-[#0891b2] hover:text-[#0891b2] transition-colors text-lg font-medium"
                    >+</button>
                    <span className="text-xs text-gray-400">5–30 candidates</span>
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
                  style={{ background: "#0891b2" }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching candidates across LinkedIn, Internshala, Naukri, GitHub...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Find {maxCandidates} Candidates
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  Takes 30–90 seconds. Searches 5 platforms, scores each candidate, writes outreach.
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
