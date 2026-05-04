"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, MapPin, ExternalLink, X, Copy, Check,
  RefreshCw, Star, Code2, Mail, Globe, Filter,
  Briefcase, Building2, Users,
} from "lucide-react"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"

interface Candidate {
  id:              string
  name:            string
  profileUrl:      string
  platform:        string
  currentRole:     string | null
  location:        string | null
  skills:          string[]
  snippet:         string | null
  matchScore:      number | null
  matchLabel:      string | null
  outreachMessage: string | null
  status:          string
  createdAt:       string
}

interface RecruitmentJob {
  id:          string
  title:       string
  description: string
  skills:      string[]
  location:    string | null
  experience:  string | null
  jobType:     string | null
  createdAt:   string
  candidates:  Candidate[]
}

type FilterTab = "All" | "Strong" | "Potential" | "Weak"

// ── Platform badge ────────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    LinkedIn:    { cls: "bg-blue-50 text-blue-700 border-blue-200",    icon: <Globe className="w-3 h-3" /> },
    Internshala: { cls: "bg-orange-50 text-orange-700 border-orange-200", icon: <Briefcase className="w-3 h-3" /> },
    Naukri:      { cls: "bg-red-50 text-red-700 border-red-200",       icon: <Building2 className="w-3 h-3" /> },
    GitHub:      { cls: "bg-gray-100 text-gray-700 border-gray-300",   icon: <Code2 className="w-3 h-3" /> },
    Wellfound:   { cls: "bg-green-50 text-green-700 border-green-200", icon: <Star className="w-3 h-3" /> },
  }
  const { cls, icon } = cfg[platform] ?? { cls: "bg-gray-50 text-gray-600 border-gray-200", icon: <Globe className="w-3 h-3" /> }
  return (
    <Badge variant="outline" className={`text-[10px] font-medium flex items-center gap-1 ${cls}`}>
      {icon}{platform}
    </Badge>
  )
}

// ── Match score badge ─────────────────────────────────────────────────────────
function MatchBadge({ label, score }: { label: string | null; score: number | null }) {
  if (!label) return <Badge variant="outline" className="text-xs text-gray-400">Unscored</Badge>
  const cls =
    label === "Strong"    ? "bg-green-50 text-green-700 border-green-200" :
    label === "Potential" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-600 border-red-200"
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${cls}`}>
      {label}{score != null ? ` · ${score}` : ""}
    </Badge>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function JobCandidatesPage() {
  const params = useParams()
  const jobId  = params.jobId as string

  const [job, setJob]           = useState<RecruitmentJob | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [filter, setFilter]     = useState<FilterTab>("All")
  const [selected, setSelected] = useState<Candidate | null>(null)

  const fetchJob = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/recruitment/${jobId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load"); return }
      setJob(data.job)
    } catch {
      setError("Failed to load candidates")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchJob() }, [fetchJob])

  const candidates = job?.candidates ?? []

  const filtered = candidates.filter(c => {
    if (filter === "All") return true
    return c.matchLabel === filter
  })

  const counts = {
    All:       candidates.length,
    Strong:    candidates.filter(c => c.matchLabel === "Strong").length,
    Potential: candidates.filter(c => c.matchLabel === "Potential").length,
    Weak:      candidates.filter(c => c.matchLabel === "Weak").length,
  }

  const filterTabs: FilterTab[] = ["All", "Strong", "Potential", "Weak"]

  const tabColor: Record<FilterTab, string> = {
    All:       "#0891b2",
    Strong:    "#16a34a",
    Potential: "#d97706",
    Weak:      "#dc2626",
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading candidates...
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="text-center">
          <p className="text-red-500 mb-3">{error || "Job not found"}</p>
          <Link href="/recruitment" className="text-sm text-teal-600 hover:underline">
            ← Back to Recruitment
          </Link>
        </div>
      </div>
    )
  }

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

      {/* Job header */}
      <section className="pt-4 pb-5 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={fadeUp.hidden} animate={fadeUp.visible} transition={transition}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-teal-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
              {job.jobType && (
                <Badge variant="outline" className="text-xs text-teal-700 border-teal-200 bg-teal-50">
                  {job.jobType}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 ml-9 flex-wrap mb-3">
              {job.location && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />{job.location}
                </span>
              )}
              {job.experience && (
                <span className="text-xs text-gray-400">{job.experience}</span>
              )}
            </div>
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-9">
                {job.skills.map(s => (
                  <Badge key={s} variant="outline" className="text-xs text-teal-700 border-teal-200 bg-teal-50">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="px-6 pb-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
          {filterTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab
                  ? "text-white"
                  : "bg-white border border-[#e0e0e0] text-gray-600 hover:border-teal-400 hover:text-teal-600"
              }`}
              style={filter === tab ? { background: tabColor[tab] } : {}}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>
      </section>

      {/* Candidates table */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-teal-500" />
                </div>
                <p className="text-gray-900 font-medium mb-1">
                  No {filter !== "All" ? filter.toLowerCase() : ""} candidates
                </p>
                <p className="text-sm text-gray-400">
                  {filter === "All" ? "No candidates were found for this job." : `No candidates with ${filter} match score.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0f2f5]">
                      {["Candidate", "Platform", "Current Role", "Location", "Skills", "Match", ""].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f9fafb]">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-3.5 max-w-[180px]">
                          <a
                            href={c.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 hover:text-teal-600 transition-colors flex items-center gap-1 truncate"
                            onClick={e => e.stopPropagation()}
                          >
                            {c.name}
                            <ExternalLink className="w-3 h-3 shrink-0 text-gray-300" />
                          </a>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <PlatformBadge platform={c.platform} />
                        </td>
                        <td className="px-5 py-3.5 max-w-[160px]">
                          {c.currentRole
                            ? <p className="text-xs text-gray-600 truncate">{c.currentRole}</p>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 max-w-[140px]">
                          {c.location
                            ? <p className="text-xs text-gray-600 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{c.location}</p>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {c.skills.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" className="text-[10px] text-gray-500 border-gray-200">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <MatchBadge label={c.matchLabel} score={c.matchScore} />
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setSelected(c)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#e0e0e0] text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors whitespace-nowrap"
                          >
                            <Mail className="w-3 h-3" /> Outreach
                          </button>
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

      {/* Side panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-6 py-4 border-b border-[#f0f2f5] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={selected.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 hover:text-teal-600 flex items-center gap-1.5 transition-colors"
                >
                  {selected.name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {selected.currentRole && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{selected.currentRole}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <PlatformBadge platform={selected.platform} />
                <MatchBadge label={selected.matchLabel} score={selected.matchScore} />
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {selected.location && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />{selected.location}
                  </p>
                )}
                {selected.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selected.skills.map(s => (
                      <Badge key={s} variant="outline" className="text-xs text-teal-700 border-teal-200 bg-teal-50">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Snippet */}
              {selected.snippet && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile Snippet</p>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3 border border-[#e8edf5]">
                    {selected.snippet}
                  </p>
                </div>
              )}

              {/* Outreach message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outreach Message</p>
                  {selected.outreachMessage && (
                    <CopyButton text={selected.outreachMessage} />
                  )}
                </div>
                {selected.outreachMessage ? (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {selected.outreachMessage}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-[#e8edf5] rounded-xl p-4">
                    <p className="text-sm text-gray-400 italic">No outreach message generated.</p>
                  </div>
                )}
              </div>

              {/* Profile link */}
              <a
                href={selected.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[#e0e0e0] text-sm font-medium text-gray-700 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Profile on {selected.platform}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
