"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Plus, RefreshCw, Mail, Globe, MapPin, Building2,
  ExternalLink, X, ChevronRight, Trash2, Megaphone, ArrowLeft,
} from "lucide-react"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"

interface MarketingLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  website: string | null
  location: string | null
  industry: string | null
  source: string
  score: number | null
  icpLabel: string | null
  companyBio: string | null
  campaignIdea: string | null
  contentAngle: string | null
  adCopy: string | null
  emailSubject: string | null
  emailBody: string | null
  outreachStatus: string
  notes: string | null
  createdAt: string
}

type Filter = "all" | "Hot" | "Warm" | "Cold" | "email_sent"

function ScoreBadge({ label, score }: { label: string | null; score: number | null }) {
  if (!label) return <Badge variant="outline" className="text-xs text-gray-400">Unscored</Badge>
  const cls =
    label === "Hot"  ? "bg-red-50 text-red-600 border-red-200" :
    label === "Warm" ? "bg-amber-50 text-amber-600 border-amber-200" :
                       "bg-sky-50 text-sky-500 border-sky-200"
  const icon = label === "Hot" ? "🔥" : label === "Warm" ? "🟡" : "❄️"
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${cls}`}>
      {icon} {label}{score != null ? ` · ${score}` : ""}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new:        { cls: "bg-gray-50 text-gray-500 border-gray-200",       label: "New" },
    email_sent: { cls: "bg-blue-50 text-blue-600 border-blue-200",       label: "Email Sent" },
    replied:    { cls: "bg-green-50 text-green-600 border-green-200",    label: "Replied" },
    converted:  { cls: "bg-purple-50 text-purple-600 border-purple-200", label: "Converted" },
  }
  const { cls, label } = map[status] ?? map.new
  return <Badge variant="outline" className={`text-xs ${cls}`}>{label}</Badge>
}

export default function MarketingDashboard() {
  const [leads, setLeads]                   = useState<MarketingLead[]>([])
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)
  const [clearing, setClearing]             = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [filter, setFilter]                 = useState<Filter>("all")
  const [selected, setSelected]             = useState<MarketingLead | null>(null)

  const fetchLeads = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const res  = await fetch("/api/marketing")
      const data = await res.json()
      setLeads(data.leads ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function clearAllLeads() {
    setClearing(true)
    setShowDeleteModal(false)
    try {
      await fetch("/api/marketing", {
        method: "DELETE",
        headers: { "x-api-secret": "tectha-n8n-secret-2026" },
      })
      setLeads([])
      setSelected(null)
    } finally {
      setClearing(false)
    }
  }

  const filtered = leads.filter(l => {
    if (filter === "all")        return true
    if (filter === "email_sent") return l.outreachStatus === "email_sent"
    return l.icpLabel === filter
  })

  const stats = {
    total:     leads.length,
    hot:       leads.filter(l => l.icpLabel === "Hot").length,
    emailSent: leads.filter(l => l.outreachStatus === "email_sent").length,
    replied:   leads.filter(l => l.outreachStatus === "replied").length,
  }

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "all",        label: `All (${leads.length})` },
    { key: "Hot",        label: `🔥 Hot (${stats.hot})` },
    { key: "Warm",       label: `🟡 Warm (${leads.filter(l => l.icpLabel === "Warm").length})` },
    { key: "Cold",       label: `❄️ Cold (${leads.filter(l => l.icpLabel === "Cold").length})` },
    { key: "email_sent", label: `✉️ Emailed (${stats.emailSent})` },
  ]

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#276ef1] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      <section className="pt-4 pb-5 px-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <motion.div initial={fadeUp.hidden} animate={fadeUp.visible} transition={transition}>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-violet-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Marketing Agent</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5 ml-9">
              AI-generated marketing prospects — campaigns, content angles &amp; ad hooks
            </p>
          </motion.div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-[#e0e0e0] bg-white text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {leads.length > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={clearing}
                className="p-2 rounded-lg border border-[#e0e0e0] bg-white text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors"
                title="Clear all"
              >
                <Trash2 className={`w-4 h-4 ${clearing ? "opacity-50" : ""}`} />
              </button>
            )}
            <Button
              asChild
              className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5"
              style={{ background: "#7c3aed" }}
            >
              <Link href="/marketing/generate">
                <Plus className="w-4 h-4" /> Find Prospects
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-6 pb-5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Prospects", value: stats.total,     color: "text-gray-900" },
            { label: "Hot",             value: stats.hot,       color: "text-red-500" },
            { label: "Emails Sent",     value: stats.emailSent, color: "text-blue-600" },
            { label: "Replied",         value: stats.replied,   color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === t.key
                  ? "bg-[#7c3aed] text-white"
                  : "bg-white border border-[#e0e0e0] text-gray-600 hover:border-violet-400 hover:text-violet-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-sm text-gray-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading prospects...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                  <Megaphone className="w-6 h-6 text-violet-500" />
                </div>
                <p className="text-gray-900 font-medium mb-1">
                  {filter === "all" ? "No prospects yet" : `No ${filter} prospects`}
                </p>
                <p className="text-sm text-gray-400 mb-5">Find businesses to target with your marketing campaigns</p>
                <Button asChild className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5" style={{ background: "#7c3aed" }}>
                  <Link href="/marketing/generate"><Plus className="w-4 h-4" /> Find Prospects</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0f2f5]">
                      {["Company", "Contact", "Location", "Campaign Idea", "Score", "Status", ""].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f9fafb]">
                    {filtered.map(lead => (
                      <tr key={lead.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <p className="font-semibold text-gray-900 truncate">{lead.name}</p>
                          {lead.industry && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="w-3 h-3 shrink-0" />{lead.industry}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 max-w-[160px]">
                          {lead.email
                            ? <p className="text-xs text-violet-600 flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{lead.email}</p>
                            : <p className="text-xs text-gray-300">No email</p>
                          }
                          {lead.phone && <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>}
                        </td>
                        <td className="px-5 py-3.5 max-w-[150px]">
                          {lead.location
                            ? <p className="text-xs text-gray-600 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{lead.location}</p>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          {lead.campaignIdea
                            ? <p className="text-xs text-gray-600 line-clamp-2">{lead.campaignIdea}</p>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5">
                          <ScoreBadge label={lead.icpLabel} score={lead.score} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={lead.outreachStatus} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-violet-600 transition-colors">
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button onClick={() => setSelected(lead)}
                              className="text-gray-400 hover:text-violet-600 transition-colors">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete all prospects?</p>
                <p className="text-sm text-gray-400 mt-0.5">This will permanently remove all {leads.length} marketing prospects. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={clearAllLeads}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f0f2f5] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selected.name}</p>
                {selected.industry && <p className="text-xs text-gray-400 truncate">{selected.industry}</p>}
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <ScoreBadge label={selected.icpLabel} score={selected.score} />
                <StatusBadge status={selected.outreachStatus} />
                <Badge variant="outline" className="text-xs text-gray-400">{selected.source}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                {selected.phone && <p className="flex items-center gap-2 text-gray-600"><span className="w-3.5 h-3.5 text-gray-400">📱</span>{selected.phone}</p>}
                {selected.location && <p className="flex items-center gap-2 text-gray-600"><MapPin className="w-3.5 h-3.5 text-gray-400" />{selected.location}</p>}
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-violet-600 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />{selected.website}
                  </a>
                )}
              </div>

              <Separator className="bg-[#f0f2f5]" />

              {selected.companyBio && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Overview</p>
                  <p className="text-sm text-gray-700">{selected.companyBio}</p>
                </div>
              )}

              {(selected.campaignIdea || selected.contentAngle || selected.adCopy) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Marketing Brief</p>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
                    {selected.campaignIdea && (
                      <div>
                        <p className="text-xs font-semibold text-violet-700 mb-1">Campaign Idea</p>
                        <p className="text-sm text-gray-700">{selected.campaignIdea}</p>
                      </div>
                    )}
                    {selected.contentAngle && (
                      <>
                        <Separator className="bg-violet-100" />
                        <div>
                          <p className="text-xs font-semibold text-violet-700 mb-1">Content Angle</p>
                          <p className="text-sm text-gray-600 italic">{selected.contentAngle}</p>
                        </div>
                      </>
                    )}
                    {selected.adCopy && (
                      <>
                        <Separator className="bg-violet-100" />
                        <div>
                          <p className="text-xs font-semibold text-violet-700 mb-1">Ad Hook</p>
                          <p className="text-sm text-gray-900 font-medium">&ldquo;{selected.adCopy}&rdquo;</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selected.emailBody && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outreach Email</p>
                  <div className="bg-[#f9fafb] border border-[#e8edf5] rounded-xl p-4 space-y-3">
                    <div className="space-y-1 text-sm border-b border-[#f0f2f5] pb-3">
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-14 shrink-0">To:</span>
                        <span className="text-gray-900">{selected.email ?? selected.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-14 shrink-0">Subject:</span>
                        <span className="text-gray-900 font-medium">{selected.emailSubject ?? "—"}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selected.emailBody}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
