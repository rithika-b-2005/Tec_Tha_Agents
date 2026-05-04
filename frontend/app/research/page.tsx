"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, ArrowLeft, Search, Loader2, ArrowRight, Globe } from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"

const ACCENT = "#6366f1"

interface Report {
  id: string
  industry: string
  topic?: string
  region: string
  status: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Starting",
  researching_market: "Market",
  researching_trends: "Trends",
  researching_competitors: "Competitors",
  researching_audience: "Audience",
  researching_pain_points: "Pain Points",
  researching_opportunities: "Opportunities",
  researching_news: "News",
  synthesizing: "Synthesising",
  done: "Complete",
  failed: "Failed",
}

export default function ResearchPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchReports() {
    try {
      const res = await fetch("/api/research")
      const data = await res.json()
      setReports(data.reports || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchReports()
    const interval = setInterval(fetchReports, 6000)
    return () => clearInterval(interval)
  }, [])

  const done = reports.filter((r) => r.status === "done")
  const inProgress = reports.filter((r) => !["done", "failed"].includes(r.status))
  const failed = reports.filter((r) => r.status === "failed")

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
        <Button asChild className="rounded-xl text-white text-sm font-semibold gap-2 h-9" style={{ background: ACCENT }}>
          <Link href="/research/generate"><Plus className="w-3.5 h-3.5" /> New Research</Link>
        </Button>
      </div>

      <section className="pt-6 pb-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-normal text-gray-900">Research Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} total · {done.length} complete · {inProgress.length} in progress</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm py-20 text-center">
              <Search className="w-10 h-10 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm mb-4">No research reports yet</p>
              <Button asChild className="rounded-xl text-white text-sm font-semibold gap-2" style={{ background: ACCENT }}>
                <Link href="/research/generate"><Plus className="w-3.5 h-3.5" /> Start Your First Research</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {[...inProgress, ...done, ...failed].map((r, i) => {
                const isRunning = !["done", "failed"].includes(r.status)
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: r.status === "done" ? "#eef2ff" : r.status === "failed" ? "#fee2e2" : "#f0f9ff" }}>
                        {isRunning
                          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
                          : r.status === "done"
                          ? <Search className="w-5 h-5" style={{ color: ACCENT }} />
                          : <Search className="w-5 h-5 text-red-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {r.topic ? `${r.topic} — ` : ""}{r.industry}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-400">{r.region}</p>
                          <span className="text-gray-300">·</span>
                          <p className="text-xs text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={r.status === "done"
                          ? { background: "#c7d2fe", color: ACCENT }
                          : r.status === "failed"
                          ? { background: "#fee2e2", color: "#991b1b" }
                          : { background: "#f0f9ff", color: "#0369a1" }
                        }>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                      {r.status === "done" && (
                        <Link href={`/research/${r.id}`}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: ACCENT }}>
                          View Report <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
