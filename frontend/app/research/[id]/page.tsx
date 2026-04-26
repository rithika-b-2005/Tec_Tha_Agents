"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, TrendingUp, Users, AlertTriangle, Lightbulb,
  Newspaper, Star, BarChart3, Download, Plus,
} from "lucide-react"
import Header from "@/app/components/Header"

const ACCENT = "#1e40af"

const SECTIONS = [
  { key: "summary",          label: "Executive Summary",        icon: Star,          color: "#1e40af", bg: "#eff6ff" },
  { key: "market",           label: "Market Size & Growth",     icon: BarChart3,     color: "#059669", bg: "#ecfdf5" },
  { key: "trends",           label: "Key Industry Trends",      icon: TrendingUp,    color: "#7c3aed", bg: "#f5f3ff" },
  { key: "competitors",      label: "Competitor Landscape",     icon: Users,         color: "#d97706", bg: "#fffbeb" },
  { key: "audience",         label: "Target Audience",          icon: Users,         color: "#0891b2", bg: "#ecfeff" },
  { key: "painPoints",       label: "Pain Points & Challenges", icon: AlertTriangle, color: "#e11d48", bg: "#fff1f2" },
  { key: "opportunities",    label: "Market Opportunities",     icon: Lightbulb,     color: "#059669", bg: "#ecfdf5" },
  { key: "news",             label: "Latest News & Developments", icon: Newspaper,   color: "#374151", bg: "#f9fafb" },
  { key: "recommendations",  label: "Strategic Recommendations", icon: Star,         color: "#1e40af", bg: "#eff6ff" },
]

interface Report {
  id: string
  industry: string
  topic?: string
  region: string
  status: string
  sections?: string
  error?: string
  createdAt: string
}

function renderContent(text: string) {
  // Convert **bold**: text bullet format to styled JSX
  const lines = text.split("\n").filter(Boolean)
  return lines.map((line, i) => {
    const boldMatch = line.match(/^\*\*(.+?)\*\*:(.*)$/)
    if (boldMatch) {
      return (
        <div key={i} className="flex gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: ACCENT }} />
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">{boldMatch[1]}: </span>
            {boldMatch[2].trim()}
          </p>
        </div>
      )
    }
    if (line.startsWith("•")) {
      return (
        <div key={i} className="flex gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: ACCENT }} />
          <p className="text-sm text-gray-700 leading-relaxed">{line.replace(/^•\s*/, "")}</p>
        </div>
      )
    }
    return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">{line}</p>
  })
}

export default function ResearchReportPage() {
  const params = useParams()
  const id = params.id as string
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/research/${id}`)
        const data = await res.json()
        setReport(data.report)
      } catch {}
      finally { setLoading(false) }
    }
    fetchReport()
  }, [id])

  const parsedSections = report?.sections ? JSON.parse(report.sections) : {}

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="flex justify-center items-center pt-40">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: ACCENT }} />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="flex flex-col items-center pt-40 gap-4">
          <p className="text-gray-500">Report not found</p>
          <Link href="/research" className="text-sm" style={{ color: ACCENT }}>← Back to Research</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/research" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> All Reports
        </Link>
        <Link href="/research/generate"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-medium"
          style={{ background: ACCENT }}>
          <Plus className="w-3 h-3" /> New Research
        </Link>
      </div>

      {/* Header */}
      <section className="pt-6 pb-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: ACCENT }}>
                    Market Research Report
                  </span>
                  <span className="text-xs text-gray-400">{report.region}</span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {report.topic ? `${report.topic} — ` : ""}{report.industry}
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Generated {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 mb-1">{SECTIONS.filter((s) => parsedSections[s.key]).length} sections</p>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-4">
          {SECTIONS.map((sec, i) => {
            const content = parsedSections[sec.key]
            if (!content) return null
            const Icon = sec.icon
            return (
              <motion.div
                key={sec.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[#f0f2f5] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: sec.bg }}>
                    <Icon className="w-4 h-4" style={{ color: sec.color }} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{sec.label}</p>
                </div>
                <div className="px-6 py-5">
                  {renderContent(content)}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
