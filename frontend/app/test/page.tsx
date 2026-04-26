"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ArrowLeft, Zap, AlertCircle, CheckCircle2, X } from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface TestRun {
  id: string
  platformUrl: string
  status: string
  totalTests: number
  passed: number
  failed: number
  duration?: number
  summary?: string
  createdAt: string
  _count: { bugs: number; results: number }
  bugs?: Array<{ id: string; title: string; severity: string; category: string }>
  results?: Array<{ id: string; testName: string; status: string; error?: string }>
}

const ACCENT = "#0891b2"

export default function TestPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<TestRun[]>([])
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRuns()
  }, [filter])

  async function fetchRuns() {
    try {
      setLoading(true)
      const res = await fetch("/api/test")
      const data = await res.json()
      setRuns(data.runs || [])
    } catch (err) {
      console.error("Error fetching runs:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = runs.filter((r) => {
    if (filter === "all") return true
    if (filter === "running") return r.status === "pending" || r.status === "running"
    if (filter === "completed") return r.status === "completed"
    if (filter === "failed") return r.status === "failed" || r.failed > 0
    return true
  })

  const stats = {
    total: runs.length,
    bugsFound: runs.reduce((sum, r) => sum + r._count.bugs, 0),
    avgPassRate: runs.length > 0 ? Math.round((runs.reduce((sum, r) => sum + (r.totalTests > 0 ? r.passed / r.totalTests : 0), 0) / runs.length) * 100) : 0,
    active: runs.filter((r) => r.status === "running" || r.status === "pending").length,
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Link href="/workflow" className="text-[#7a8899] hover:text-[#276ef1] text-sm mb-4 inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Workflow
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Test Agent</h1>
              <p className="text-gray-600 text-sm">Automated platform testing. Provide URL + test cases, get AI-powered bug reports with root cause analysis.</p>
            </div>
            <Button
              onClick={() => router.push("/test/generate")}
              className="text-white rounded-xl flex-shrink-0"
              style={{ background: ACCENT }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Test Run
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {[
            { label: "Total Runs", value: stats.total, color: "text-gray-900" },
            { label: "Bugs Found", value: stats.bugsFound, color: "text-red-500" },
            { label: "Pass Rate", value: `${stats.avgPassRate}%`, color: "text-green-600" },
            { label: "Active", value: stats.active, color: "text-blue-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Filter Tabs */}
        <motion.div className="mb-4 flex gap-2 overflow-x-auto pb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {[
            { key: "all", label: "All" },
            { key: "running", label: "Running" },
            { key: "completed", label: "Completed" },
            { key: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key ? "text-white" : "bg-white border border-[#e0e0e0] text-gray-600 hover:bg-gray-50"
              }`}
              style={filter === tab.key ? { background: ACCENT } : {}}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Runs Grid */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <div className="col-span-2 text-center py-8 text-gray-500">Loading test runs...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">No test runs yet. Create one to get started.</div>
          ) : (
            filtered.map((run) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedRun(run)}
                className="bg-white border border-[#e8edf5] rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all"
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 truncate">
                      {(() => { try { return new URL(run.platformUrl).hostname.replace(/^www\./, "") } catch { return run.platformUrl } })()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      run.status === "completed"
                        ? "bg-green-50 text-green-600 border-green-200 ml-2 flex-shrink-0"
                        : run.status === "running" || run.status === "pending"
                          ? "bg-blue-50 text-blue-600 border-blue-200 ml-2 flex-shrink-0 animate-pulse"
                          : "bg-red-50 text-red-600 border-red-200 ml-2 flex-shrink-0"
                    }
                  >
                    {run.status === "pending" || run.status === "running" ? "🔄 Running" : run.status === "completed" ? "✅ Done" : "❌ Failed"}
                  </Badge>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Tests</p>
                    <p className="font-semibold text-gray-900">{run.totalTests}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Passed</p>
                    <p className="font-semibold text-green-600">{run.passed}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Failed</p>
                    <p className="font-semibold text-red-600">{run.failed}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bugs</p>
                    <p className="font-semibold text-orange-600">{run._count.bugs}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{new Date(run.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs font-medium" style={{ color: ACCENT }}>View Details →</p>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Detail Drawer - Backdrop */}
      <AnimatePresence>
        {selectedRun && (
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRun(null)}
          />
        )}
      </AnimatePresence>

      {/* Detail Drawer - Panel */}
      <AnimatePresence>
        {selectedRun && (
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto scrollbar-hide"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#f0f2f5] sticky top-0 bg-white flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {(() => { try { return new URL(selectedRun.platformUrl).hostname.replace(/^www\./, "") } catch { return selectedRun.platformUrl } })()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(selectedRun.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-5 space-y-5">
              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  selectedRun.status === "completed" ? "bg-green-50 text-green-600 border-green-200" :
                  selectedRun.status === "running" || selectedRun.status === "pending" ? "bg-blue-50 text-blue-600 border-blue-200" :
                  "bg-red-50 text-red-600 border-red-200"
                } variant="outline">
                  {selectedRun.status === "pending" || selectedRun.status === "running" ? "🔄 Running" : selectedRun.status === "completed" ? "✅ Done" : "❌ Failed"}
                </Badge>
              </div>

              {/* Test Results */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Results</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Tests</p>
                    <p className="text-xl font-bold text-gray-900">{selectedRun.totalTests}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Passed</p>
                    <p className="text-xl font-bold text-green-600">{selectedRun.passed}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-xl font-bold text-red-600">{selectedRun.failed}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Bugs Found</p>
                    <p className="text-xl font-bold text-orange-600">{selectedRun._count.bugs}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#f0f2f5]" />

              {/* Summary */}
              {selectedRun.summary && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</p>
                  <p className="text-sm text-gray-700">{selectedRun.summary}</p>
                </div>
              )}

              {/* Bugs */}
              {selectedRun.bugs && selectedRun.bugs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bugs Found ({selectedRun.bugs.length})</p>
                  <div className="space-y-2">
                    {selectedRun.bugs.slice(0, 5).map(bug => (
                      <div key={bug.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-900">{bug.title}</p>
                            <p className="text-xs text-red-600 mt-1">
                              <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                                {bug.severity}
                              </Badge>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Results List */}
              {selectedRun.results && selectedRun.results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Details</p>
                  <div className="space-y-2">
                    {selectedRun.results.slice(0, 5).map(result => (
                      <div key={result.id} className={`border rounded-lg p-3 ${result.status === "passed" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                        <div className="flex items-start gap-2">
                          {result.status === "passed" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{result.testName}</p>
                            {result.error && <p className="text-xs text-gray-600 mt-1">{result.error}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
