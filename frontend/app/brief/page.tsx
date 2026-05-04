"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sun,
  Newspaper,
  Target,
  Lightbulb,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Bell,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#f59e0b"

interface DailyBrief {
  id: string
  date: string
  news?: string | null
  weather?: string | null
  topLeads?: string | null
  tip?: string | null
  fullBrief?: string | null
  sentAt?: string | null
  status: string
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
        <Zap className="w-3 h-3" /> Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> Pending
    </span>
  )
}

function BriefCard({ brief }: { brief: DailyBrief }) {
  const [expanded, setExpanded] = useState(false)

  const preview = brief.fullBrief
    ? brief.fullBrief.slice(0, 160).replace(/\n/g, " ") + (brief.fullBrief.length > 160 ? "…" : "")
    : "No content available."

  const formattedDate = new Date(brief.date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={transition}
      className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
    >
      <button
        className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left hover:bg-gray-50/60 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: brief.status === "sent" ? "#fef3c7" : brief.status === "failed" ? "#fee2e2" : "#fff7ed" }}
          >
            <Sun className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{formattedDate}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{preview}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={brief.status} />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && brief.fullBrief && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-[#e8edf5]">
              <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {brief.fullBrief}
              </pre>
              {brief.sentAt && (
                <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
                  <Send className="w-3 h-3" />
                  Sent to Telegram at{" "}
                  {new Date(brief.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </motion.div>
        )}
        {expanded && !brief.fullBrief && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-[#e8edf5]">
              <p className="mt-4 text-sm text-gray-400 italic">No brief content recorded.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BriefPage() {
  const [briefs, setBriefs] = useState<DailyBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)

  async function fetchBriefs() {
    try {
      const res = await fetch("/api/brief")
      const data = await res.json()
      setBriefs(data.briefs || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefs()
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)
    setGenSuccess(null)
    try {
      const res = await fetch("/api/brief/generate", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || "Generation failed")
      } else if (data.alreadyExists) {
        setGenSuccess("Brief already generated for today.")
      } else {
        setGenSuccess(data.sent ? "Brief generated and sent to Telegram!" : "Brief generated (Telegram send failed — check credentials).")
        fetchBriefs()
      }
    } catch {
      setGenError("Network error. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const todayDate = new Date().toISOString().slice(0, 10)
  const hasTodayBrief = briefs.some((b) => b.date === todayDate)

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      {/* Top nav */}
      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Hero header */}
      <section className="pt-6 pb-6 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={transition}
            className="flex items-start justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: "#fef3c7" }}
              >
                <Sun className="w-6 h-6" style={{ color: ACCENT }} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Daily Brief Agent</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Morning news · top leads · sales tip · Telegram delivery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl text-white text-sm font-semibold gap-2 h-10 px-5 cursor-pointer disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : hasTodayBrief ? (
                  <>
                    <RefreshCw className="w-4 h-4" /> Regenerate Today
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Generate Today&apos;s Brief
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Feedback banners */}
          <AnimatePresence>
            {genError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 shrink-0" /> {genError}
              </motion.div>
            )}
            {genSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {genSuccess}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Newspaper, label: "Total Briefs", value: briefs.length },
              { icon: Send, label: "Sent to Telegram", value: briefs.filter((b) => b.status === "sent").length },
              { icon: Clock, label: "Pending", value: briefs.filter((b) => b.status === "pending").length },
              { icon: Target, label: "Failed", value: briefs.filter((b) => b.status === "failed").length },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm px-5 py-4 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef3c7" }}>
                  <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brief list */}
      <section className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Past Briefs</h2>
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : briefs.length === 0 ? (
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm py-20 text-center">
              <Sun className="w-10 h-10 mx-auto mb-4" style={{ color: "#fde68a" }} />
              <p className="text-gray-500 text-sm mb-4">No briefs generated yet</p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl text-white text-sm font-semibold gap-2 cursor-pointer disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                <Zap className="w-3.5 h-3.5" /> Generate Your First Brief
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {briefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Setup instructions */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm px-6 py-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7" }}>
                <Bell className="w-4.5 h-4.5" style={{ color: ACCENT }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Setup Instructions</h3>
                <p className="text-xs text-gray-400">Configure Telegram and auto-schedule</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 text-sm">
              {/* Telegram setup */}
              <div>
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4" style={{ color: ACCENT }} /> Telegram Setup
                </p>
                <ol className="space-y-1.5 text-gray-500 text-xs list-decimal list-inside">
                  <li>
                    Message <span className="font-mono bg-gray-100 px-1 rounded">@BotFather</span> on Telegram → create bot
                    → copy token
                  </li>
                  <li>
                    Add token as{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">TELEGRAM_BOT_TOKEN</span> in your .env
                  </li>
                  <li>
                    Start a chat with your bot or add to a group → get chat ID via{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">@userinfobot</span>
                  </li>
                  <li>
                    Add as <span className="font-mono bg-gray-100 px-1 rounded">TELEGRAM_CHAT_ID</span> in your .env
                  </li>
                </ol>
              </div>

              {/* Cron schedule */}
              <div>
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: ACCENT }} /> Cron Schedule (Vercel)
                </p>
                <ol className="space-y-1.5 text-gray-500 text-xs list-decimal list-inside">
                  <li>
                    Add to <span className="font-mono bg-gray-100 px-1 rounded">vercel.json</span>:
                  </li>
                  <div className="my-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre">
                    {`{\n  "crons": [{\n    "path": "/api/cron/daily-brief",\n    "schedule": "30 2 * * *"\n  }]\n}`}
                  </div>
                  <li>
                    Set <span className="font-mono bg-gray-100 px-1 rounded">CRON_SECRET</span> env var in Vercel dashboard
                  </li>
                  <li>
                    Vercel will call the endpoint at <strong>08:00 IST</strong> every day (02:30 UTC)
                  </li>
                  <li>
                    For external schedulers: send{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">Authorization: Bearer &lt;CRON_SECRET&gt;</span>{" "}
                    header
                  </li>
                </ol>
              </div>

              {/* Required env vars */}
              <div>
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: ACCENT }} /> Required Env Variables
                </p>
                <div className="space-y-1">
                  {[
                    ["GROQ_API_KEY", "Groq LLM for brief generation"],
                    ["SERPER_API_KEY", "Serper for live news headlines"],
                    ["TELEGRAM_BOT_TOKEN", "Bot token from @BotFather"],
                    ["TELEGRAM_CHAT_ID", "Chat or group ID"],
                    ["CRON_SECRET", "Secret to protect cron endpoint"],
                    ["NEXT_PUBLIC_APP_URL", "Your deployed app URL"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                        {key}
                      </span>
                      <span className="text-xs text-gray-400">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What the brief includes */}
              <div>
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Newspaper className="w-4 h-4" style={{ color: ACCENT }} /> What Each Brief Includes
                </p>
                <ul className="space-y-1.5 text-gray-500 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="text-base">📰</span> Top 5 AI &amp; business news via Serper
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-base">🎯</span> Top 3 hot CRM leads to call today
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-base">📋</span> Top 3 uncontacted leads from pipeline
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-base">💡</span> 1 actionable sales tip for the day
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-base">⚡</span> Motivational quote to start the day
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
