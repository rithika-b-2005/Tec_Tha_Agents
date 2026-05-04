"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"
import {
  ArrowLeft, ArrowRight, Copy, Check, Share2,
  Loader2, RefreshCcw, Sparkles,
} from "lucide-react"

interface LinkedInResult {
  post: string
  hashtags: string
  hookAlternative: string
  postType: string
  error?: string
}

const POST_TYPES = [
  { key: "thought_leadership", label: "Thought Leadership", desc: "Opinion + insight" },
  { key: "how_to",             label: "How-To",             desc: "Step-by-step value" },
  { key: "story",              label: "Story",              desc: "Before/after journey" },
  { key: "results",            label: "Results",            desc: "Numbers + proof" },
]

const TOPIC_IDEAS = [
  "How AI automation saves 10 hours/week for small businesses",
  "Why most cold email campaigns fail (and how to fix it)",
  "We generated 50 leads in 30 minutes using AI — here's how",
  "The real cost of manual lead generation",
  "Stop spending hours on research — let AI do it",
]

export default function LinkedInGeneratorPage() {
  const [topic, setTopic]               = useState("")
  const [postType, setPostType]         = useState("thought_leadership")
  const [targetIndustry, setTarget]     = useState("")
  const [painPoint, setPainPoint]       = useState("")
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<LinkedInResult | null>(null)
  const [error, setError]               = useState("")
  const [copied, setCopied]             = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/marketing/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postType, targetIndustry, painPoint }),
      })
      const data = await res.json() as LinkedInResult
      if (!res.ok || data.error) { setError(data.error ?? "Failed to generate."); return }
      setResult(data)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function copyPost() {
    if (!result) return
    const full = `${result.post}\n\n${result.hashtags}`
    await navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/marketing" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#7c3aed] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Marketing
        </Link>
      </div>

      <section className="pt-6 pb-8 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/20 bg-[#f5f3ff] px-4 py-1.5 mb-4"
          >
            <Share2 className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span className="text-xs font-medium text-[#7c3aed]">LinkedIn Content Agent</span>
          </motion.div>
          <motion.h1
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="text-3xl font-normal leading-[1.15] tracking-tight text-black mb-3"
          >
            Generate LinkedIn Posts
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Create high-engagement posts that attract inbound leads to Tec Tha.
            Thought leadership, how-tos, stories, and results — all AI-written.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Form */}
            <form onSubmit={handleGenerate}>
              <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-[#f0f2f5]">
                  <p className="text-base font-semibold text-gray-900">Post Settings</p>
                  <p className="text-xs text-gray-400 mt-0.5">Define your topic and style</p>
                </div>

                <div className="px-8 py-7 space-y-6">
                  {/* Post type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Post Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {POST_TYPES.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setPostType(t.key)}
                          className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                            postType === t.key
                              ? "border-[#7c3aed] bg-[#f5f3ff] text-[#7c3aed]"
                              : "border-[#e0e0e0] text-gray-600 hover:border-[#7c3aed]/40"
                          }`}
                        >
                          <p className="text-xs font-semibold">{t.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" /> Topic
                    </Label>
                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. How AI automation saves 10 hours/week"
                      className="rounded-xl border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
                      disabled={loading}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {TOPIC_IDEAS.map(idea => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() => setTopic(idea)}
                          className="text-[10px] text-[#7c3aed] bg-[#f5f3ff] border border-[#ddd6fe] rounded px-2 py-0.5 hover:bg-[#ede9fe] transition-colors"
                          disabled={loading}
                        >
                          {idea.length > 45 ? idea.slice(0, 45) + "…" : idea}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target industry */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Target Industry (optional)</Label>
                    <Input
                      value={targetIndustry}
                      onChange={e => setTarget(e.target.value)}
                      placeholder="e.g. restaurants, roofing companies, dentists"
                      className="rounded-xl border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
                      disabled={loading}
                    />
                  </div>

                  {/* Pain point */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Pain Point to Address (optional)</Label>
                    <Input
                      value={painPoint}
                      onChange={e => setPainPoint(e.target.value)}
                      placeholder="e.g. wasting hours on manual lead research"
                      className="rounded-xl border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
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
                    disabled={loading || !topic.trim()}
                    className="w-full rounded-xl text-white font-semibold h-11 text-sm border-0"
                    style={{ background: "#7c3aed" }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating post…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Generate Post <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Output */}
            <div className="space-y-4">
              {result ? (
                <>
                  {/* Post */}
                  <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#f0f2f5] flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">LinkedIn Post</p>
                        <p className="text-xs text-gray-400 mt-0.5">Ready to copy and post</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setResult(null); setError("") }}
                          className="p-2 rounded-lg border border-[#e0e0e0] text-gray-400 hover:text-[#7c3aed] hover:border-[#7c3aed]/40 transition-colors"
                          title="Generate new"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={copyPost}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-xs font-medium text-gray-600 hover:border-[#7c3aed]/40 hover:text-[#7c3aed] transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                        {result.post}
                      </pre>
                      {result.hashtags && (
                        <p className="text-sm text-[#7c3aed] mt-4">{result.hashtags}</p>
                      )}
                    </div>
                  </div>

                  {/* Hook alternative */}
                  {result.hookAlternative && (
                    <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#f0f2f5]">
                        <p className="text-sm font-semibold text-gray-900">A/B Hook Alternative</p>
                        <p className="text-xs text-gray-400 mt-0.5">Try this opening line instead</p>
                      </div>
                      <div className="px-6 py-4">
                        <p className="text-sm text-gray-700 italic">&ldquo;{result.hookAlternative}&rdquo;</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(result.hookAlternative)}
                          className="mt-2 text-xs text-[#7c3aed] hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy hook
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm h-full min-h-[300px] flex flex-col items-center justify-center text-center px-8 py-16">
                  <div className="w-12 h-12 rounded-full bg-[#f5f3ff] flex items-center justify-center mb-3">
                    <Share2 className="w-6 h-6 text-[#7c3aed]" />
                  </div>
                  <p className="text-gray-900 font-medium mb-1">Post will appear here</p>
                  <p className="text-sm text-gray-400">Fill in the form and click Generate</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
