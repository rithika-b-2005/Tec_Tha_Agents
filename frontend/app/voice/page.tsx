"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Phone, PhoneCall, PhoneOff, PhoneMissed,
  RefreshCw, Trash2, Users, Building2, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronRight, X, FileText, Mic, Volume2,
} from "lucide-react"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoiceCall {
  id: string
  leadId: string
  leadName: string
  leadPhone: string
  leadCompany: string | null
  status: string
  callSid: string | null
  duration: number | null
  transcript: string | null
  outcome: string | null
  callbackTime: string | null
  createdAt: string
  updatedAt: string
}

interface Stats {
  total: number
  completed: number
  inProgress: number
  failed: number
  interested: number
  callbacks: number
  noAnswer: number
}

type TabFilter = "all" | "interested" | "callback" | "no_answer"
type LeadSource = "leads" | "crm" | "sales" | "marketing"

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  leads: "Leads",
  crm: "CRM",
  sales: "Sales",
  marketing: "Marketing",
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    initiated:   { cls: "bg-gray-50 text-gray-500 border-gray-200",      label: "Initiated",    icon: <Phone className="w-3 h-3" /> },
    in_progress: { cls: "bg-blue-50 text-blue-600 border-blue-200",      label: "In Progress",  icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed:   { cls: "bg-green-50 text-green-600 border-green-200",   label: "Completed",    icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:      { cls: "bg-red-50 text-red-500 border-red-200",         label: "Failed",       icon: <XCircle className="w-3 h-3" /> },
    no_answer:   { cls: "bg-gray-50 text-gray-400 border-gray-200",      label: "No Answer",    icon: <PhoneMissed className="w-3 h-3" /> },
  }
  const { cls, label, icon } = map[status] ?? map.initiated
  return (
    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cls}`}>
      {icon} {label}
    </Badge>
  )
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null
  const map: Record<string, { cls: string; label: string }> = {
    interested:      { cls: "bg-green-50 text-green-600 border-green-200",   label: "Interested" },
    callback:        { cls: "bg-blue-50 text-blue-600 border-blue-200",      label: "Callback" },
    not_interested:  { cls: "bg-gray-50 text-gray-400 border-gray-200",      label: "Not Interested" },
    voicemail:       { cls: "bg-amber-50 text-amber-600 border-amber-200",   label: "Voicemail" },
    no_answer:       { cls: "bg-gray-50 text-gray-400 border-gray-200",      label: "No Answer" },
    completed:       { cls: "bg-green-50 text-green-500 border-green-200",   label: "Completed" },
  }
  const { cls, label } = map[outcome] ?? { cls: "bg-gray-50 text-gray-500 border-gray-200", label: outcome }
  return <Badge variant="outline" className={`text-xs ${cls}`}>{label}</Badge>
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl border border-black/[0.06] p-5 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VoiceDashboard() {
  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProgress: 0, failed: 0, interested: 0, callbacks: 0, noAnswer: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<TabFilter>("all")
  const [selected, setSelected] = useState<VoiceCall | null>(null)
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null)
  const [leadSource, setLeadSource] = useState<LeadSource>("leads")
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [quickPhone, setQuickPhone] = useState("")
  const [quickName, setQuickName] = useState("")
  const [quickCalling, setQuickCalling] = useState(false)
  const [quickMsg, setQuickMsg] = useState("")
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCalls = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const res = await fetch("/api/voice")
      const data = await res.json()
      setCalls(data.calls ?? [])
      setStats(data.stats ?? { total: 0, completed: 0, inProgress: 0, failed: 0, interested: 0, callbacks: 0, noAnswer: 0 })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  // Auto-refresh every 5s when there are in-progress calls
  useEffect(() => {
    const hasActive = calls.some((c) => c.status === "in_progress" || c.status === "initiated")
    if (hasActive) {
      autoRefreshRef.current = setInterval(() => fetchCalls(true), 5000)
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [calls, fetchCalls])

  async function handleCall(call: VoiceCall) {
    const leadId = call.leadId
    setCallingLeadId(leadId)
    try {
      const res = await fetch("/api/voice/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, leadSource }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Call failed: ${err.error || "Unknown error"}`)
      }
    } catch (err) {
      alert("Failed to initiate call. Check console for details.")
      console.error(err)
    } finally {
      // Refresh after 3s to show updated status
      setTimeout(() => {
        setCallingLeadId(null)
        fetchCalls(true)
      }, 3000)
    }
  }

  async function handleQuickCall() {
    if (!quickPhone.trim()) return
    setQuickCalling(true)
    setQuickMsg("")
    try {
      const res = await fetch("/api/voice/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: quickPhone.trim(), name: quickName.trim() || undefined }),
      })
      if (res.ok) {
        setQuickMsg("✓ Call initiated successfully")
        setQuickPhone("")
        setQuickName("")
        setTimeout(() => { fetchCalls(true); setQuickMsg("") }, 3000)
      } else {
        const err = await res.json()
        setQuickMsg(err.error || "Call failed")
      }
    } catch {
      setQuickMsg("Failed to initiate call")
    } finally {
      setQuickCalling(false)
    }
  }

  async function handleInitiateCall(leadId: string) {
    setCallingLeadId(leadId)
    try {
      const res = await fetch("/api/voice/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, leadSource }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Call failed: ${err.error || "Unknown error"}`)
        setCallingLeadId(null)
        return
      }
      // Keep spinner for 3s, then refresh
      setTimeout(() => {
        setCallingLeadId(null)
        fetchCalls(true)
      }, 3000)
    } catch (err) {
      alert("Failed to initiate call.")
      console.error(err)
      setCallingLeadId(null)
    }
  }

  async function handleClear() {
    setClearing(true)
    try {
      await fetch("/api/voice", {
        method: "DELETE",
        headers: { "x-api-secret": "tectha-n8n-secret-2026" },
      })
      await fetchCalls(true)
      setShowClearModal(false)
    } finally {
      setClearing(false)
    }
  }

  // Filter calls by tab
  const filteredCalls = calls.filter((c) => {
    if (tab === "all") return true
    if (tab === "interested") return c.outcome === "interested"
    if (tab === "callback") return c.outcome === "callback"
    if (tab === "no_answer") return c.status === "no_answer" || c.outcome === "no_answer"
    return true
  })

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: "all",       label: "All",       count: stats.total },
    { id: "interested",label: "Interested",count: stats.interested },
    { id: "callback",  label: "Callback",  count: stats.callbacks },
    { id: "no_answer", label: "No Answer", count: stats.noAnswer },
  ]

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Page Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16a34a]/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-[#16a34a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voice Agent</h1>
              <p className="text-sm text-gray-500">AI-powered outbound calls with Priya</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Lead Source Selector */}
            <div className="flex items-center gap-1 bg-white border border-black/[0.06] rounded-xl p-1">
              {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((src) => (
                <button
                  key={src}
                  onClick={() => setLeadSource(src)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    leadSource === src
                      ? "bg-[#16a34a] text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {LEAD_SOURCE_LABELS[src]}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearModal(true)}
              className="gap-1.5 text-xs text-red-500 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <StatCard label="Total Calls"  value={stats.total}      icon={<Phone className="w-5 h-5 text-[#16a34a]" />}       color="bg-[#16a34a]/10" />
          <StatCard label="Completed"    value={stats.completed}  icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50" />
          <StatCard label="Interested"   value={stats.interested} icon={<Volume2 className="w-5 h-5 text-purple-600" />}     color="bg-purple-50" />
          <StatCard label="Callbacks"    value={stats.callbacks}  icon={<PhoneCall className="w-5 h-5 text-amber-600" />}    color="bg-amber-50" />
        </motion.div>

        {/* Quick Call */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ ...transition, delay: 0.1 }}
          className="bg-white rounded-2xl border border-black/[0.06] p-5 mb-6"
        >
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Call</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Phone number (e.g. 9876543210)"
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              className="flex-1 border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="w-48 border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
            />
            <button
              onClick={handleQuickCall}
              disabled={quickCalling || !quickPhone.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {quickCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              {quickCalling ? "Calling…" : "Call Now"}
            </button>
          </div>
          {quickMsg && (
            <p className={`mt-2 text-xs font-medium ${quickMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
              {quickMsg}
            </p>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white border border-black/[0.06] rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                tab === t.id ? "bg-[#16a34a] text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-gray-100"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ ...transition, delay: 0.15 }}
          className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 text-[#16a34a] animate-spin" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <PhoneOff className="w-7 h-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-gray-500 font-medium">No calls yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Select a lead source above and click Call on a lead
                </p>
              </div>
              <button
                onClick={() => fetchCalls(true)}
                disabled={refreshing}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#16a34a]/30 text-[#16a34a] bg-[#16a34a]/5 hover:bg-[#16a34a]/10 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lead</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Duration</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Outcome</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => setSelected(call)}
                      className="border-b border-black/[0.03] hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] font-semibold text-xs shrink-0">
                            {call.leadName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{call.leadName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        {call.leadCompany ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{call.leadCompany}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">{call.leadPhone}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDuration(call.duration)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <OutcomeBadge outcome={call.outcome} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">
                        {formatDate(call.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {callingLeadId === call.leadId ? (
                            <Button size="sm" disabled className="gap-1.5 text-xs bg-[#16a34a]/80">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              In call...
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleInitiateCall(call.leadId)}
                              className="gap-1.5 text-xs bg-[#16a34a] hover:bg-[#16a34a]/90"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Call
                            </Button>
                          )}
                          <button
                            onClick={() => setSelected(call)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Source hint */}
        <p className="text-xs text-gray-400 mt-3 text-center">
          Showing calls for all leads. To place a new call, go to{" "}
          <Link href="/leads" className="text-[#16a34a] hover:underline">Leads</Link>,{" "}
          <Link href="/crm" className="text-[#16a34a] hover:underline">CRM</Link>, or any other module.
        </p>
      </main>

      {/* ─── Side Panel: Transcript ──────────────────────────────────────────── */}
      {selected && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-black/[0.06] shadow-2xl z-50 flex flex-col"
        >
          {/* Panel Header */}
          <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] font-semibold text-sm">
                {selected.leadName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{selected.leadName}</h3>
                {selected.leadCompany && (
                  <p className="text-xs text-gray-500">{selected.leadCompany}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Meta */}
          <div className="px-6 py-4 border-b border-black/[0.06] grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Outcome</p>
              {selected.outcome ? <OutcomeBadge outcome={selected.outcome} /> : <span className="text-xs text-gray-400">—</span>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="text-sm font-medium text-gray-700">{formatDuration(selected.duration)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Phone</p>
              <p className="text-sm font-mono text-gray-700">{selected.leadPhone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm text-gray-700">{formatDate(selected.createdAt)}</p>
            </div>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[#16a34a]" />
              <h4 className="text-sm font-semibold text-gray-700">Call Transcript</h4>
            </div>
            {selected.transcript ? (
              <div className="space-y-3">
                {selected.transcript.split("\n").filter(Boolean).map((line, i) => {
                  const isPriya = line.startsWith("Priya:")
                  return (
                    <div
                      key={i}
                      className={`flex gap-2 ${isPriya ? "justify-start" : "justify-end"}`}
                    >
                      {isPriya && (
                        <div className="w-7 h-7 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[#16a34a] text-xs font-bold shrink-0 mt-0.5">
                          P
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                          isPriya
                            ? "bg-[#16a34a]/5 text-gray-700 rounded-tl-sm"
                            : "bg-gray-100 text-gray-700 rounded-tr-sm"
                        }`}
                      >
                        <p className="text-xs text-gray-400 font-medium mb-0.5">
                          {isPriya ? "Priya (AI)" : selected.leadName}
                        </p>
                        <p>{line.replace(/^(Priya:|[^:]+:)\s*/, "")}</p>
                      </div>
                      {!isPriya && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 mt-0.5">
                          {selected.leadName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mic className="w-8 h-8 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No transcript available</p>
                <p className="text-xs text-gray-300 mt-1">
                  {selected.status === "in_progress"
                    ? "Call in progress — transcript will appear after the call ends"
                    : "Transcript is saved after the call completes"}
                </p>
              </div>
            )}
          </div>

          {/* Panel Footer Actions */}
          <div className="px-6 py-4 border-t border-black/[0.06]">
            <Button
              className="w-full gap-2 bg-[#16a34a] hover:bg-[#16a34a]/90"
              onClick={() => handleInitiateCall(selected.leadId)}
              disabled={callingLeadId === selected.leadId || selected.status === "in_progress"}
            >
              {callingLeadId === selected.leadId ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Calling...</>
              ) : (
                <><Phone className="w-4 h-4" /> Call Again</>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Backdrop for side panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setSelected(null)}
        />
      )}

      {/* ─── Clear Confirmation Modal ─────────────────────────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Clear all calls?</h3>
                <p className="text-sm text-gray-500">This will delete all {stats.total} call records and transcripts.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Clear All"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
