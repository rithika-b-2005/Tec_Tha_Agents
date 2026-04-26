"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, ArrowRight, Film, Mic, Sparkles, Download,
  CheckCircle2, AlertCircle, Globe, Clock, Video,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#e11d48"

const STYLES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "documentary", label: "Documentary" },
  { value: "commercial advertisement", label: "Commercial" },
  { value: "animated motion graphic", label: "Motion Graphic" },
  { value: "product showcase", label: "Product Demo" },
  { value: "aerial drone footage", label: "Aerial / Drone" },
]

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calm · Female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Soft · Female" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Clear · Male" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Deep · Male" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Neutral · Male" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", desc: "Energetic · Male" },
]

const STATUS_STEPS = [
  { key: "queued",           label: "Job queued" },
  { key: "scripting",        label: "AI writing video script & voiceover..." },
  { key: "generating_video", label: "Sending to Replicate video model..." },
  { key: "processing_video", label: "Rendering video frames (1–2 min)..." },
  { key: "generating_voice", label: "Generating voiceover with ElevenLabs..." },
  { key: "merging",          label: "Merging video + audio with FFmpeg..." },
  { key: "done",             label: "Complete!" },
]

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key)

interface VideoProject {
  id: string
  topic: string
  prompt?: string
  voiceText?: string
  style: string
  status: string
  videoUrl?: string
  finalPath?: string
  error?: string
  createdAt: string
}

export default function VideoGeneratePage() {
  const [topic, setTopic] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [duration, setDuration] = useState(3)
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [project, setProject] = useState<VideoProject | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!topic.trim()) { setError("Topic is required"); return }

    setSubmitting(true)
    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), style, duration, voiceId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to start"); setSubmitting(false); return }

      // Start polling
      const proj: VideoProject = { id: data.projectId, topic: topic.trim(), style, status: "queued", createdAt: new Date().toISOString() }
      setProject(proj)

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/video/${data.projectId}`)
          const d = await r.json()
          if (d.project) {
            setProject(d.project)
            if (d.project.status === "done" || d.project.status === "failed") {
              if (pollRef.current) clearInterval(pollRef.current)
            }
          }
        } catch {}
      }, 4000)
    } catch {
      setError("Something went wrong")
      setSubmitting(false)
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setProject(null)
    setSubmitting(false)
    setTopic("")
    setError("")
  }

  const currentStepIdx = project ? STATUS_ORDER.indexOf(project.status) : -1

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      <section className="pt-6 pb-8 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <motion.h1
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-3"
          >
            AI Video Generator
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Enter a topic. AI writes the script, generates the video, adds a voiceover,
            and merges everything into one ready-to-download clip.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Input form */}
          <AnimatePresence>
            {!project && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="px-8 py-5 border-b border-[#f0f2f5]">
                  <p className="text-base font-semibold text-gray-900">Video Configuration</p>
                  <p className="text-xs text-gray-400 mt-0.5">AI handles scripting, generation, voice, and editing</p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                  )}

                  {/* Topic */}
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Video Topic
                    </Label>
                    <Input
                      placeholder="e.g. A futuristic city at night with flying cars"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <p className="text-xs text-gray-400">AI generates the detailed video prompt + voiceover from this</p>
                  </div>

                  {/* Style */}
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Style
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStyle(s.value)}
                          className="h-10 rounded-lg text-sm font-medium transition-all border"
                          style={style === s.value
                            ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                            : { background: "#fff", color: "#374151", borderColor: "#e0e0e0" }
                          }
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration + Voice */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Duration
                      </Label>
                      <div className="flex gap-2">
                        {[{ v: 3, label: "3s" }, { v: 5, label: "5s" }, { v: 6, label: "6s" }].map((d) => (
                          <button
                            key={d.v}
                            type="button"
                            onClick={() => setDuration(d.v)}
                            className="flex-1 h-11 rounded-lg text-sm font-medium transition-all border"
                            style={duration === d.v
                              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                              : { background: "#fff", color: "#374151", borderColor: "#e0e0e0" }
                            }
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Voiceover
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {VOICES.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVoiceId(v.id)}
                            className="px-2 py-2 rounded-lg text-xs font-medium transition-all border text-left"
                            style={voiceId === v.id
                              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                              : { background: "#fff", color: "#374151", borderColor: "#e0e0e0" }
                            }
                          >
                            <p className="font-semibold leading-tight">{v.name}</p>
                            <p className="opacity-70 text-[10px] leading-tight mt-0.5">{v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                    style={{ background: ACCENT }}
                  >
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Generate Video
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                  <p className="text-center text-xs text-gray-400">Takes 2–5 minutes · Requires Replicate + ElevenLabs API keys</p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress panel */}
          {project && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {project.status === "done" ? "Video Ready" : project.status === "failed" ? "Generation Failed" : "Generating Video..."}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{project.topic}</p>
                </div>
                {(project.status === "done" || project.status === "failed") && (
                  <button
                    onClick={reset}
                    className="text-xs px-3 py-1.5 border border-[#e0e0e0] rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    New Video
                  </button>
                )}
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Pipeline steps */}
                <div className="space-y-2">
                  {STATUS_STEPS.map((step, i) => {
                    const done = currentStepIdx > i || project.status === "done"
                    const active = STATUS_ORDER[currentStepIdx] === step.key && project.status !== "done"
                    const failed = project.status === "failed" && active

                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT }} />
                          ) : active && !failed ? (
                            <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "#ffd0d9", borderTopColor: ACCENT }} />
                          ) : failed ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />
                          )}
                        </div>
                        <p className={`text-sm ${done ? "text-gray-700" : active ? "font-medium text-gray-900" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        {active && !failed && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#ffe4e9", color: ACCENT }}>
                            Running
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* AI Generated Script (shown when available) */}
                {(project.prompt || project.voiceText) && (
                  <div className="rounded-xl border border-[#ffd0d9] overflow-hidden" style={{ background: "#fff9fa" }}>
                    <div className="px-4 py-2.5 border-b border-[#ffd0d9]" style={{ background: "#ffe4e9" }}>
                      <p className="text-xs font-semibold" style={{ color: ACCENT }}>AI Generated Script</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {project.prompt && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Video Prompt</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{project.prompt}</p>
                        </div>
                      )}
                      {project.voiceText && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Voiceover</p>
                          <p className="text-xs text-gray-700 leading-relaxed italic">"{project.voiceText}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {project.status === "failed" && project.error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-xs font-semibold text-red-600 mb-1">Error</p>
                    <p className="text-xs text-red-500">{project.error}</p>
                    {project.error.includes("ffmpeg not found") && (
                      <p className="text-xs text-gray-500 mt-2">
                        Install FFmpeg: run <code className="bg-gray-100 px-1 rounded">winget install FFmpeg</code> then restart the dev server
                      </p>
                    )}
                  </div>
                )}

                {/* Done — merge error (video still available without audio) */}
                {project.status === "done" && project.error && (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                    <p className="text-xs text-amber-700">{project.error}</p>
                  </div>
                )}

                {/* Video result */}
                {project.status === "done" && project.finalPath && (
                  <div className="space-y-3">
                    <video
                      src={project.finalPath}
                      controls
                      autoPlay
                      loop
                      className="w-full rounded-xl border border-[#e8edf5]"
                      style={{ maxHeight: "420px", background: "#000" }}
                    />
                    <a
                      href={project.finalPath}
                      download={`video-${project.id}.mp4`}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                      style={{ background: ACCENT }}
                    >
                      <Download className="w-4 h-4" />
                      Download Video
                    </a>
                    <Link
                      href="/video"
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-medium border border-[#ffd0d9] transition-colors hover:bg-[#fff5f7]"
                      style={{ color: ACCENT }}
                    >
                      <Globe className="w-4 h-4" />
                      View All Videos
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </section>
    </div>
  )
}
