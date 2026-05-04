"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Network,
  SearchIcon,
  Sparkles,
  TrendingUp,
  Users2,
  Zap,
  RefreshCcw,
} from "lucide-react"

interface Step {
  tool: string
  input: unknown
  result: string
}

interface OrchestratorResult {
  summary: string
  steps: Step[]
  totalSteps: number
  backend?: "anthropic" | "groq"
  error?: string
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  generate_leads:      { label: "Lead Generation",  icon: Zap,        color: "#276ef1", bg: "#eff6ff" },
  run_market_research: { label: "Market Research",  icon: SearchIcon, color: "#1e40af", bg: "#eff6ff" },
  sync_to_crm:         { label: "CRM Sync",         icon: Users2,     color: "#d97706", bg: "#fffbeb" },
  get_pipeline_stats:  { label: "Pipeline Stats",   icon: TrendingUp, color: "#059669", bg: "#ecfdf5" },
}

const EXAMPLES = [
  "Find 10 roofing companies in Dallas TX and add them to the CRM",
  "Research the dental industry in Texas, then generate 8 dental clinic leads in Austin",
  "Generate 15 law firm leads in New York and show pipeline stats after",
  "Find HVAC companies in Phoenix AZ, enrich them, sync to CRM",
]

function StepCard({ step, index }: { step: Step; index: number }) {
  const [open, setOpen] = useState(false)
  const meta = TOOL_META[step.tool] ?? { label: step.tool, icon: Bot, color: "#6b7280", bg: "#f3f4f6" }
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="border border-[#e8edf5] rounded-xl overflow-hidden bg-white"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
          <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{meta.label}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{step.result.split("\n")[0].slice(0, 100)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-[#f0f4fa]">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-3 leading-relaxed font-mono bg-gray-50 rounded-lg p-3">
                {step.result}
              </pre>
              {step.input && Object.keys(step.input as object).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View input</summary>
                  <pre className="text-xs text-gray-500 whitespace-pre-wrap mt-1 font-mono bg-gray-50 rounded p-2">
                    {JSON.stringify(step.input, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function OrchestratorPage() {
  const [goal, setGoal]       = useState("")
  const [context, setContext] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<OrchestratorResult | null>(null)
  const [error, setError]     = useState("")

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    if (!goal.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), context: context.trim() || undefined }),
      })
      const data = await res.json() as OrchestratorResult
      if (!res.ok || data.error) { setError(data.error ?? "Orchestrator failed."); return }
      setResult(data)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /* ── Success screen ── */
  if (result) {
    return (
      <>
        <Header />
        <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
          <div className="pt-20 px-6 max-w-7xl mx-auto">
            <button
              onClick={() => { setResult(null); setError("") }}
              className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#7c3aed] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Run Again
            </button>
          </div>

          <section className="pt-6 pb-8 px-6 text-center">
            <div className="max-w-xl mx-auto">
              <motion.h1
                initial={fadeUp.hidden} animate={fadeUp.visible}
                transition={{ ...transition, delay: 0.05 }}
                className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-2"
              >
                Pipeline Complete
              </motion.h1>
              <motion.p
                initial={fadeUp.hidden} animate={fadeUp.visible}
                transition={{ ...transition, delay: 0.15 }}
                className="text-sm text-[#7a8899]"
              >
                {result.totalSteps} agent{result.totalSteps !== 1 ? "s" : ""} ran
                {result.backend && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-[#e8edf5] text-gray-500">
                    {result.backend === "anthropic" ? "Claude" : "Groq / Llama"}
                  </span>
                )}
              </motion.p>
            </div>
          </section>

          <section className="px-6 pb-16">
            <div className="max-w-7xl mx-auto space-y-5">

              {/* Summary card */}
              <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">Orchestrator Summary</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI analysis of what was done and next steps</p>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                </div>
              </div>

              {/* Steps grid */}
              {result.steps.length > 0 && (
                <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#f0f2f5]">
                    <p className="text-base font-semibold text-gray-900">Agent Steps</p>
                    <p className="text-xs text-gray-400 mt-0.5">Click each step to see full output</p>
                  </div>
                  <div className="px-8 py-6 space-y-3">
                    {result.steps.map((step, i) => (
                      <StepCard key={i} step={step} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => { setResult(null); setError("") }}
                  variant="outline"
                  className="flex-1 rounded-xl gap-2 text-sm font-medium border-[#e8edf5] h-11"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Run Again
                </Button>
                <Button
                  asChild
                  className="flex-1 rounded-xl text-white gap-2 text-sm font-semibold border-0 h-11"
                  style={{ background: "#d97706" }}
                >
                  <Link href="/crm">
                    <Users2 className="w-3.5 h-3.5" /> View CRM <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </>
    )
  }

  /* ── Main form ── */
  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link
          href="/workflow"
          className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#7c3aed] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Hero */}
      <section className="pt-6 pb-8 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <motion.h1
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-3"
          >
            AI Orchestrator
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Describe your goal. The orchestrator runs Research → Lead Gen → CRM Sync
            automatically — one command, full pipeline.
          </motion.p>
        </div>
      </section>

      {/* Pipeline flow indicator */}
      <motion.div
        initial={fadeUp.hidden} animate={fadeUp.visible}
        transition={{ ...transition, delay: 0.25 }}
        className="flex items-center justify-center gap-2 mb-6 flex-wrap px-6"
      >
        {[
          { icon: SearchIcon, label: "Research",  color: "#1e40af" },
          { icon: Zap,        label: "Lead Gen",  color: "#276ef1" },
          { icon: Users2,     label: "CRM Sync",  color: "#d97706" },
          { icon: TrendingUp, label: "Report",    color: "#059669" },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-white border border-[#e8edf5] rounded-lg px-3 py-1.5 shadow-sm">
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
              </div>
              {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300" />}
            </div>
          )
        })}
      </motion.div>

      {/* Form */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleRun}>
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f3ff] flex items-center justify-center">
                  <Network className="w-5 h-5 text-[#7c3aed]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">Your Goal</p>
                  <p className="text-xs text-gray-400 mt-0.5">Describe what you want to achieve — AI handles the rest</p>
                </div>
              </div>

              <div className="px-8 py-7 space-y-6">

                {/* Goal textarea */}
                <div className="space-y-2">
                  <Textarea
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="e.g. Find 10 roofing companies in Dallas TX and add them to the CRM pipeline"
                    rows={4}
                    className="resize-none rounded-xl border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                    disabled={loading}
                  />
                </div>

                {/* Example prompts */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Quick examples — click to use
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {EXAMPLES.map(ex => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setGoal(ex)}
                        className="text-xs text-[#7c3aed] bg-[#f5f3ff] border border-[#ddd6fe] rounded-lg px-3 py-2 hover:bg-[#ede9fe] transition-colors text-left"
                        disabled={loading}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional context */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Additional context (optional)</p>
                  <Textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="e.g. We sell AI automation — sender is John from Tec Tha. Focus on companies without websites."
                    rows={2}
                    className="resize-none rounded-xl border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !goal.trim()}
                  className="w-full rounded-xl text-white font-semibold h-11 text-sm border-0"
                  style={{ background: "#7c3aed" }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running pipeline…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Run Orchestrator
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                {loading && (
                  <p className="text-center text-xs text-gray-400">
                    Takes 1–3 minutes while agents run in sequence…
                  </p>
                )}

                <p className="text-center text-xs text-gray-400">
                  Uses Groq / Llama 3.3 by default — no extra API key needed
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
