"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus, RefreshCw, Trash2, Users, Briefcase, MapPin,
  ArrowLeft, ChevronRight, Loader2,
} from "lucide-react"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"

interface RecruitmentJob {
  id:          string
  title:       string
  skills:      string[]
  location:    string | null
  experience:  string | null
  jobType:     string | null
  createdAt:   string
  _count:      { candidates: number }
}

export default function RecruitmentDashboard() {
  const router = useRouter()

  const [jobs, setJobs]                     = useState<RecruitmentJob[]>([])
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)
  const [clearing, setClearing]             = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const fetchJobs = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const res  = await fetch("/api/recruitment")
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function clearAll() {
    setClearing(true)
    setShowDeleteModal(false)
    try {
      await fetch("/api/recruitment", {
        method: "DELETE",
        headers: { "x-api-secret": "tectha-n8n-secret-2026" },
      })
      setJobs([])
    } finally {
      setClearing(false)
    }
  }

  const totalCandidates = jobs.reduce((s, j) => s + j._count.candidates, 0)

  // To compute strong/potential, we'd need candidate data — show placeholder stats
  const stats = [
    { label: "Total Jobs",       value: jobs.length,     color: "text-gray-900" },
    { label: "Total Candidates", value: totalCandidates, color: "text-pink-700" },
  ]

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#db2777] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Title row */}
      <section className="pt-4 pb-5 px-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <motion.div initial={fadeUp.hidden} animate={fadeUp.visible} transition={transition}>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-pink-700" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Recruitment Agent</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5 ml-9">
              AI-powered candidate sourcing — LinkedIn, Naukri, GitHub &amp; more
            </p>
          </motion.div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchJobs(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-[#e0e0e0] bg-white text-gray-500 hover:text-pink-700 hover:border-pink-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {jobs.length > 0 && (
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
              style={{ background: "#db2777" }}
            >
              <Link href="/recruitment/generate">
                <Plus className="w-4 h-4" /> Find Candidates
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
          <div className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Strong Matches</p>
            <p className="text-2xl font-bold text-green-600">—</p>
          </div>
          <div className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Potential Matches</p>
            <p className="text-2xl font-bold text-amber-500">—</p>
          </div>
        </div>
      </section>

      {/* Jobs list */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-sm text-gray-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-pink-500" />
                </div>
                <p className="text-gray-900 font-medium mb-1">No recruitment jobs yet</p>
                <p className="text-sm text-gray-400 mb-5">
                  Paste a job description and let AI find candidates across the web
                </p>
                <Button
                  asChild
                  className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5"
                  style={{ background: "#db2777" }}
                >
                  <Link href="/recruitment/generate">
                    <Plus className="w-4 h-4" /> Find Candidates
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f2f5]">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/recruitment/${job.id}`)}
                    className="px-6 py-4 hover:bg-[#fafafa] transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-pink-100 flex items-center justify-center shrink-0">
                          <Briefcase className="w-3.5 h-3.5 text-pink-700" />
                        </div>
                        <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                        {job.jobType && (
                          <Badge variant="outline" className="text-[10px] text-pink-700 border-pink-200 bg-pink-50 shrink-0">
                            {job.jobType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap ml-8">
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />{job.location}
                          </span>
                        )}
                        {job.experience && (
                          <span className="text-xs text-gray-400">{job.experience}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(job.createdAt)}</span>
                      </div>
                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                          {job.skills.slice(0, 6).map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] text-gray-500 border-gray-200">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-pink-700">{job._count.candidates}</p>
                        <p className="text-[10px] text-gray-400">candidates</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
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
                <p className="font-semibold text-gray-900">Delete all jobs?</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  This will permanently remove all {jobs.length} jobs and their candidates. Cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
