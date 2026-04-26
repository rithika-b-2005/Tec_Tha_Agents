"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Plus, Film, CheckCircle2, AlertCircle, Loader2, Download, ArrowLeft } from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const ACCENT = "#e11d48"

interface VideoProject {
  id: string
  topic: string
  style: string
  duration: number
  status: string
  finalPath?: string
  error?: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  queued:           "Queued",
  scripting:        "Writing Script",
  generating_video: "Generating Video",
  processing_video: "Processing Frames",
  generating_voice: "Generating Voice",
  merging:          "Merging",
  done:             "Done",
  failed:           "Failed",
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  queued:           { bg: "#f3f4f6", text: "#6b7280" },
  scripting:        { bg: "#ffe4e9", text: ACCENT },
  generating_video: { bg: "#ffe4e9", text: ACCENT },
  processing_video: { bg: "#ffe4e9", text: ACCENT },
  generating_voice: { bg: "#ffe4e9", text: ACCENT },
  merging:          { bg: "#ffe4e9", text: ACCENT },
  done:             { bg: "#dcfce7", text: "#166534" },
  failed:           { bg: "#fee2e2", text: "#991b1b" },
}

export default function VideoPage() {
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchProjects() {
    try {
      const res = await fetch("/api/video")
      const data = await res.json()
      setProjects(data.projects || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchProjects()
    // Poll if any in-progress
    const interval = setInterval(() => {
      fetchProjects()
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const inProgress = projects.filter((p) => !["done", "failed"].includes(p.status))
  const done = projects.filter((p) => p.status === "done")
  const failed = projects.filter((p) => p.status === "failed")

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
        <Button asChild className="rounded-xl text-white text-sm font-semibold gap-2 h-9" style={{ background: ACCENT }}>
          <Link href="/video/generate"><Plus className="w-3.5 h-3.5" /> New Video</Link>
        </Button>
      </div>

      <section className="pt-6 pb-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-normal text-gray-900">Video Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} total · {done.length} done · {inProgress.length} in progress</p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm py-20 text-center">
              <Film className="w-10 h-10 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm mb-4">No video projects yet</p>
              <Button asChild className="rounded-xl text-white text-sm font-semibold gap-2" style={{ background: ACCENT }}>
                <Link href="/video/generate"><Plus className="w-3.5 h-3.5" /> Generate Your First Video</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* In-progress */}
              {inProgress.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">In Progress</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgress.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Done */}
              {done.length > 0 && (
                <div>
                  {inProgress.length > 0 && <Separator className="my-5" />}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Completed</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {done.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Failed */}
              {failed.length > 0 && (
                <div>
                  {(inProgress.length > 0 || done.length > 0) && <Separator className="my-5" />}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Failed</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {failed.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ProjectCard({ project: p }: { project: VideoProject }) {
  const colors = STATUS_COLOR[p.status] || STATUS_COLOR.queued
  const isRunning = !["done", "failed"].includes(p.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Video preview or placeholder */}
      <div className="h-40 flex items-center justify-center relative overflow-hidden" style={{ background: "#fef2f4" }}>
        {p.finalPath ? (
          <video src={p.finalPath} className="w-full h-full object-cover" muted playsInline
            onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
            onMouseOut={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0 }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isRunning ? (
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-400" />
            )}
            <p className="text-xs text-gray-400">{isRunning ? "Generating..." : "Failed"}</p>
          </div>
        )}
        {/* Status badge */}
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: colors.bg, color: colors.text }}
        >
          {STATUS_LABEL[p.status] || p.status}
        </span>
      </div>

      <div className="p-4">
        <p className="text-sm font-medium text-gray-900 truncate">{p.topic}</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{p.style} · {p.duration}s</p>

        <div className="flex items-center gap-2 mt-3">
          {p.status === "done" && p.finalPath && (
            <a
              href={p.finalPath}
              download
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              <Download className="w-3 h-3" /> Download
            </a>
          )}
          {p.status === "done" && p.finalPath && (
            <a
              href={p.finalPath}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border border-[#ffd0d9] transition-colors hover:bg-[#fff5f7]"
              style={{ color: ACCENT }}
            >
              Preview
            </a>
          )}
          {p.status === "failed" && (
            <Link
              href="/video/generate"
              className="flex-1 flex items-center justify-center h-8 rounded-lg text-xs font-medium border border-[#e0e0e0] text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Try Again
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}
