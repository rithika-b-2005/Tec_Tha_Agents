"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Globe, Monitor, Play, Camera, Mail, Link2, Search,
  Loader2, CheckCircle2, XCircle, ArrowLeft, Trash2,
  RefreshCw, Zap, Eye, Terminal, ChevronRight, X,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#0891b2"

const EXTRACT_TYPES = [
  { value: "screenshot", label: "Screenshot",   icon: Camera, color: "#f472b6", bg: "#fdf2f8" },
  { value: "text",       label: "Extract Text", icon: Search, color: "#34d399", bg: "#f0fdf9" },
  { value: "emails",     label: "Find Emails",  icon: Mail,   color: "#60a5fa", bg: "#eff6ff" },
  { value: "links",      label: "Find Links",   icon: Link2,  color: "#fb923c", bg: "#fff7ed" },
  { value: "custom",     label: "Custom",       icon: Zap,    color: "#a78bfa", bg: "#faf5ff" },
]

const TYPE_DESCRIPTIONS: Record<string, string> = {
  screenshot: "Capture a full or viewport screenshot of any page",
  text:       "Scrape specific text, data, or content from a page",
  emails:     "Find all email addresses (and optionally phone numbers)",
  links:      "Extract all links — internal, external, or both",
  custom:     "Give the agent any instruction in plain English",
}

const CUSTOM_EXAMPLES = [
  { label: "Product prices",  instruction: "Scrape all product names and prices from the page"                          },
  { label: "Contact info",    instruction: "Find all contact information including phone, emails, and addresses"        },
  { label: "Page summary",    instruction: "Summarize what this page is about and its key content"                     },
  { label: "Social links",    instruction: "Find all social media profile links on the page"                           },
  { label: "Latest news",     instruction: "Extract the latest 5 news article headlines and their links"               },
]

interface BrowserStep { action: string; selector?: string | null; value?: string | null; description: string }
interface BrowserTask  {
  id: string; instruction: string; url: string; status: string
  steps?: string | null; result?: string | null; error?: string | null
  screenshot?: string | null; createdAt: string
}

type TermLine =
  | { kind: "status";  msg: string }
  | { kind: "step";    index: number; action: string; desc: string; state: "running" | "done" | "error"; err?: string }
  | { kind: "info";    msg: string }
  | { kind: "error";   msg: string }
  | { kind: "success"; msg: string }

function actionColor(action: string) {
  const map: Record<string, string> = {
    navigate:   "#38bdf8",
    click:      "#fb923c",
    type:       "#a78bfa",
    extract:    "#34d399",
    screenshot: "#f472b6",
    wait:       "#fbbf24",
    scroll:     "#94a3b8",
  }
  return map[action] || "#e2e8f0"
}

function TerminalPanel({ lines, running }: { lines: TermLine[]; running: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [lines])

  return (
    <div className="bg-[#0d1117] rounded-2xl border border-[#21262d] overflow-hidden h-full flex flex-col">
      {/* Terminal top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#21262d]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-xs text-[#8b949e] font-mono flex items-center gap-1.5">
          <Terminal className="w-3 h-3" /> browser-agent
          {running && <Loader2 className="w-3 h-3 animate-spin ml-1 text-[#58a6ff]" />}
        </span>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 min-h-[300px]">
        {lines.length === 0 ? (
          <p className="text-[#484f58]">$ waiting for task...</p>
        ) : (
          lines.map((line, i) => {
            if (line.kind === "status") return (
              <p key={i} className="text-[#8b949e]">
                <span className="text-[#58a6ff]">›</span> {line.msg}
              </p>
            )
            if (line.kind === "info") return (
              <p key={i} className="text-[#3fb950]">✓ {line.msg}</p>
            )
            if (line.kind === "error") return (
              <p key={i} className="text-[#f85149]">✗ {line.msg}</p>
            )
            if (line.kind === "success") return (
              <p key={i} className="text-[#3fb950] font-semibold">✓ {line.msg}</p>
            )
            if (line.kind === "step") return (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {line.state === "running" && <Loader2 className="w-3 h-3 animate-spin text-[#58a6ff]" />}
                  {line.state === "done"    && <span className="text-[#3fb950]">✓</span>}
                  {line.state === "error"   && <span className="text-[#f85149]">✗</span>}
                </span>
                <span>
                  <span style={{ color: actionColor(line.action) }} className="uppercase font-bold tracking-wider text-[10px]">
                    [{line.action}]
                  </span>
                  <span className="text-[#e6edf3] ml-1.5">{line.desc}</span>
                  {line.err && <span className="text-[#f85149] ml-2">— {line.err}</span>}
                </span>
              </div>
            )
            return null
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    running:   { label: "Running",   cls: "bg-blue-100 text-blue-700 border-blue-200"       },
    completed: { label: "Done",      cls: "bg-green-100 text-green-700 border-green-200"    },
    failed:    { label: "Failed",    cls: "bg-red-100 text-red-700 border-red-200"          },
  }
  const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {status === "running"   && <Loader2    className="w-3 h-3 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="w-3 h-3" />}
      {status === "failed"    && <XCircle     className="w-3 h-3" />}
      {s.label}
    </span>
  )
}

function ResultModal({ task, onClose }: { task: BrowserTask; onClose: () => void }) {
  let steps: BrowserStep[] = []
  if (task.steps) try { steps = JSON.parse(task.steps) } catch { /**/ }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 border-b border-[#e8edf5] flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{task.instruction}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{task.url}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {task.screenshot && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Screenshot
              </p>
              <img
                src={`data:image/png;base64,${task.screenshot}`}
                alt="Page screenshot"
                className="w-full rounded-xl border border-[#e8edf5] shadow-sm"
              />
            </div>
          )}

          {task.result && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Result
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap border border-[#e8edf5] font-mono leading-relaxed">
                {task.result}
              </div>
            </div>
          )}

          {task.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <strong>Error:</strong> {task.error}
            </div>
          )}

          {steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Steps Executed ({steps.length})
              </p>
              <div className="bg-[#0d1117] rounded-xl p-4 space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-xs">
                    <span className="text-[#484f58] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ color: actionColor(step.action) }} className="uppercase font-bold shrink-0">[{step.action}]</span>
                    <span className="text-[#e6edf3]">{step.description}</span>
                    {step.selector && <code className="text-[#8b949e] ml-1">{step.selector}</code>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function BrowserAgentPage() {
  const [url, setUrl]               = useState("")
  const [instruction, setInstruction] = useState("")
  const [extractType, setExtractType] = useState("custom")
  const [running, setRunning]       = useState(false)

  // type-specific options
  const [viewport,      setViewport]      = useState<"desktop"|"mobile"|"tablet">("desktop")
  const [fullPage,      setFullPage]      = useState(false)
  const [cssSelector,   setCssSelector]   = useState("")
  const [includePhones, setIncludePhones] = useState(false)
  const [linkFilter,    setLinkFilter]    = useState<"all"|"internal"|"external">("all")

  function buildInstruction(): string {
    switch (extractType) {
      case "screenshot":
        return `Take a ${fullPage ? "full-page" : "viewport"} screenshot of the page on ${viewport} viewport`
      case "text":
        return cssSelector
          ? `Extract all text content from the element matching CSS selector "${cssSelector}"`
          : instruction.trim() || "Extract the main text content from the page"
      case "emails":
        return includePhones
          ? "Find all email addresses and phone numbers on the page"
          : "Extract all email addresses from the page"
      case "links":
        return linkFilter === "internal"
          ? "Find all internal links (same domain) on the page"
          : linkFilter === "external"
            ? "Find all external links (other domains) on the page"
            : "Find all links on the page"
      case "custom":
        return instruction.trim()
    }
    return instruction.trim()
  }
  const [tasks, setTasks]           = useState<BrowserTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [activeResult, setActiveResult] = useState<BrowserTask | null>(null)
  const [error, setError]           = useState("")
  const [clearing, setClearing]     = useState(false)
  const [termLines, setTermLines]   = useState<TermLine[]>([])
  const [liveScreenshot, setLiveScreenshot] = useState("")
  const [liveResult, setLiveResult] = useState("")
  const [showTerminal, setShowTerminal] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res  = await fetch("/api/browser")
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch { /**/ }
    finally { setLoadingTasks(false) }
  }, [])

  useEffect(() => {
    fetchTasks()
    const iv = setInterval(fetchTasks, 10000)
    return () => clearInterval(iv)
  }, [fetchTasks])

  function addLine(line: TermLine) {
    setTermLines((prev) => [...prev, line])
  }

  function updateStepState(index: number, state: "done" | "error", err?: string) {
    setTermLines((prev) =>
      prev.map((l) => l.kind === "step" && l.index === index ? { ...l, state, err } : l)
    )
  }

  async function runAgent() {
    const finalInstruction = buildInstruction()
    if (!url.trim()) { setError("Enter a URL."); return }
    if (!finalInstruction) { setError("Enter an instruction."); return }
    setError("")
    setRunning(true)
    setShowTerminal(true)
    setTermLines([])
    setLiveScreenshot("")
    setLiveResult("")

    try {
      const res = await fetch("/api/browser/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ instruction: finalInstruction, url: url.trim(), extractType, viewport, fullPage }),
      })

      if (!res.body) throw new Error("No stream")
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const raw of lines) {
          if (!raw.startsWith("data: ")) continue
          let event: Record<string, unknown>
          try { event = JSON.parse(raw.slice(6)) } catch { continue }

          switch (event.type) {
            case "init":
              addLine({ kind: "status", msg: `Task created — ID: ${event.taskId}` })
              break
            case "status":
              addLine({ kind: "status", msg: event.message as string })
              break
            case "plan":
              addLine({ kind: "info", msg: `Planned ${(event.steps as unknown[]).length} steps` })
              break
            case "step_start":
              addLine({ kind: "step", index: event.index as number, action: event.action as string, desc: event.description as string, state: "running" })
              break
            case "step_done":
              updateStepState(event.index as number, "done")
              break
            case "step_error":
              updateStepState(event.index as number, "error", event.error as string)
              break
            case "extracted":
              addLine({ kind: "info", msg: `Extracted ${event.chars} characters` })
              break
            case "emails_found":
              addLine({ kind: "info", msg: `Found ${event.count} email(s)` })
              break
            case "links_found":
              addLine({ kind: "info", msg: `Found ${event.count} link(s)` })
              break
            case "screenshot_ready":
              addLine({ kind: "info", msg: "Screenshot captured" })
              break
            case "browser_error":
              addLine({ kind: "error", msg: event.message as string })
              break
            case "result":
              setLiveResult(event.content as string)
              setLiveScreenshot(event.screenshot as string)
              addLine({ kind: "success", msg: "Analysis complete" })
              break
            case "complete":
              addLine({ kind: "success", msg: `Task ${event.status} ✓` })
              await fetchTasks()
              break
            case "error":
              addLine({ kind: "error", msg: event.message as string })
              setError(event.message as string)
              break
          }
        }
      }
    } catch (err) {
      setError("Network error. Please try again.")
      addLine({ kind: "error", msg: "Connection lost" })
    } finally {
      setRunning(false)
    }
  }

  async function clearAll() {
    setClearing(true)
    try {
      await fetch("/api/browser", { method: "DELETE", headers: { "x-api-secret": "tectha-n8n-secret-2026" } })
      await fetchTasks()
      setTermLines([])
      setLiveResult("")
      setLiveScreenshot("")
      setShowTerminal(false)
    } catch { /**/ }
    finally { setClearing(false) }
  }

  const completedTasks = tasks.filter((t) => t.status === "completed")
  const runningTasks   = tasks.filter((t) => t.status === "running")
  const failedTasks    = tasks.filter((t) => t.status === "failed")

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <AnimatePresence>
        {activeResult && <ResultModal task={activeResult} onClose={() => setActiveResult(null)} />}
      </AnimatePresence>

      {/* Top nav */}
      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={fetchTasks} className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-gray-700 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {tasks.length > 0 && (
            <button
              onClick={clearAll}
              disabled={clearing}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <section className="pt-5 pb-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: ACCENT }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              Browser Agent <Monitor className="w-5 h-5 text-gray-400" />
            </h1>
            <p className="text-sm text-gray-500">
              {tasks.length} tasks · {completedTasks.length} done · {runningTasks.length} running
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">

          {/* Two-column: form + terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Left — Input */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={transition}
              className="bg-white border border-[#e8edf5] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: ACCENT }} /> New Task
              </h2>

              {/* URL */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Target URL</label>
                <input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[#e8edf5] rounded-xl focus:outline-none focus:border-[#0891b2]"
                />
              </div>

              {/* Task Type tabs */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Task Type</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {EXTRACT_TYPES.map(({ value, label, icon: Icon, color, bg }) => (
                    <button
                      key={value}
                      onClick={() => setExtractType(value)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-semibold border transition-all ${
                        extractType === value ? "border-transparent shadow-sm" : "bg-white text-gray-500 border-[#e8edf5] hover:border-gray-300"
                      }`}
                      style={extractType === value ? { background: bg, color, borderColor: color + "40" } : {}}
                    >
                      <Icon className="w-4 h-4" style={extractType === value ? { color } : {}} />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{TYPE_DESCRIPTIONS[extractType]}</p>
              </div>

              {/* Dynamic fields per type */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={extractType}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-3"
                >
                  {/* SCREENSHOT */}
                  {extractType === "screenshot" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Viewport</label>
                        <div className="flex gap-2">
                          {(["desktop", "mobile", "tablet"] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => setViewport(v)}
                              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                                viewport === v ? "bg-[#fdf2f8] text-[#f472b6] border-[#f472b6]/40" : "text-gray-500 border-[#e8edf5] hover:border-gray-300"
                              }`}
                            >
                              {v === "desktop" ? "🖥 Desktop" : v === "mobile" ? "📱 Mobile" : "📟 Tablet"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={fullPage} onChange={(e) => setFullPage(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#f472b6]" />
                        <span className="text-xs text-gray-600">Capture full page (scroll height)</span>
                      </label>
                    </>
                  )}

                  {/* EXTRACT TEXT */}
                  {extractType === "text" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">What to extract</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. all product names and prices, main article text, table data..."
                          value={instruction}
                          onChange={(e) => setInstruction(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-[#e8edf5] rounded-xl focus:outline-none focus:border-[#34d399] resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                          Target CSS selector <span className="normal-case font-normal text-gray-400">(optional — leave blank for whole page)</span>
                        </label>
                        <input
                          placeholder=".product-list, #main-content, table.prices"
                          value={cssSelector}
                          onChange={(e) => setCssSelector(e.target.value)}
                          className="w-full h-9 px-3 text-sm font-mono border border-[#e8edf5] rounded-xl focus:outline-none focus:border-[#34d399]"
                        />
                      </div>
                    </>
                  )}

                  {/* FIND EMAILS */}
                  {extractType === "emails" && (
                    <>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                        Agent will scan the page and extract all email addresses using regex matching.
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={includePhones} onChange={(e) => setIncludePhones(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#60a5fa]" />
                        <span className="text-xs text-gray-600">Also extract phone numbers</span>
                      </label>
                    </>
                  )}

                  {/* FIND LINKS */}
                  {extractType === "links" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Link Filter</label>
                        <div className="flex gap-2">
                          {(["all", "internal", "external"] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setLinkFilter(f)}
                              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                                linkFilter === f ? "bg-[#fff7ed] text-[#fb923c] border-[#fb923c]/40" : "text-gray-500 border-[#e8edf5] hover:border-gray-300"
                              }`}
                            >
                              {f === "all" ? "🔗 All" : f === "internal" ? "🏠 Internal" : "🌐 External"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* CUSTOM */}
                  {extractType === "custom" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Instruction</label>
                        <textarea
                          rows={3}
                          placeholder="What should the agent do on this page?"
                          value={instruction}
                          onChange={(e) => setInstruction(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-[#e8edf5] rounded-xl focus:outline-none focus:border-[#a78bfa] resize-none"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Quick fill:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CUSTOM_EXAMPLES.map((ex) => (
                            <button
                              key={ex.label}
                              onClick={() => setInstruction(ex.instruction)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 border border-[#e8edf5] text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all"
                            >
                              <ChevronRight className="w-3 h-3" /> {ex.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              {/* Run button — label changes per type */}
              <Button
                onClick={runAgent}
                disabled={running}
                className="w-full rounded-xl h-11 text-white font-semibold text-sm gap-2 shadow-sm"
                style={{ background: EXTRACT_TYPES.find(t => t.value === extractType)?.color || ACCENT }}
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Agent browsing...</>
                ) : extractType === "screenshot" ? (
                  <><Camera className="w-4 h-4" /> Capture Screenshot</>
                ) : extractType === "emails" ? (
                  <><Mail className="w-4 h-4" /> Find Emails</>
                ) : extractType === "links" ? (
                  <><Link2 className="w-4 h-4" /> Extract Links</>
                ) : extractType === "text" ? (
                  <><Search className="w-4 h-4" /> Extract Text</>
                ) : (
                  <><Play className="w-4 h-4" /> Run Agent</>
                )}
              </Button>
            </motion.div>

            {/* Right — Terminal */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ ...transition, delay: 0.05 }}
              className="flex flex-col gap-3">
              {(showTerminal || termLines.length > 0) && (
                <div className="h-full min-h-[400px]">
                  <TerminalPanel lines={termLines} running={running} />
                </div>
              )}
              {!showTerminal && termLines.length === 0 && (
                <div className="bg-[#0d1117] border border-[#21262d] rounded-2xl flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <Terminal className="w-10 h-10 text-[#484f58] mx-auto mb-3" />
                    <p className="text-[#484f58] text-sm font-mono">$ run a task to see live execution</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Live Results */}
          <AnimatePresence>
            {(liveScreenshot || liveResult) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden mb-5"
              >
                <div className="px-5 py-3.5 border-b border-[#e8edf5] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-semibold text-gray-800">Latest Result</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#e8edf5]">
                  {liveScreenshot && (
                    <div className="p-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Screenshot
                      </p>
                      <img src={`data:image/png;base64,${liveScreenshot}`} alt="screenshot" className="w-full rounded-xl border border-[#e8edf5] shadow-sm" />
                    </div>
                  )}
                  {liveResult && (
                    <div className="p-5 flex flex-col">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Analysis
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap border border-[#e8edf5] font-mono leading-relaxed flex-1 overflow-auto max-h-[400px]">
                        {liveResult}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {(completedTasks.length > 0 || failedTasks.length > 0) && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ ...transition, delay: 0.1 }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                History ({completedTasks.length + failedTasks.length})
              </p>
              <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-[#f0f2f5]">
                  {[...completedTasks, ...failedTasks].map((task) => (
                    <div key={task.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#fafafa] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.instruction}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{task.url}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={task.status} />
                        <p className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleTimeString()}</p>
                        {(task.result || task.screenshot) && (
                          <button
                            onClick={() => setActiveResult(task)}
                            className="flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: ACCENT }}
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {!loadingTasks && tasks.length === 0 && !showTerminal && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ ...transition, delay: 0.1 }}
              className="bg-white border border-[#e8edf5] rounded-2xl p-12 text-center">
              <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No tasks yet</p>
              <p className="text-sm text-gray-400 mt-1">Enter a URL and instruction to get started</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
