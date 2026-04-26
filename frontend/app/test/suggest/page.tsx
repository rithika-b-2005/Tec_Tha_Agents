"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, Globe, Sparkles, CheckCircle2,
  RefreshCw, FlaskConical, ListChecks,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#ea580c"

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Auth:        { bg: "#fef3c7", text: "#92400e" },
  Navigation:  { bg: "#ede9fe", text: "#5b21b6" },
  Forms:       { bg: "#dcfce7", text: "#166534" },
  UI:          { bg: "#fce7f3", text: "#9d174d" },
  API:         { bg: "#dbeafe", text: "#1e40af" },
  Performance: { bg: "#f3f4f6", text: "#374151" },
}

interface SuggestedCase {
  category: string
  name: string
  selected: boolean
}

export default function TestSuggestPage() {
  const router = useRouter()

  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [suggestions, setSuggestions] = useState<SuggestedCase[]>([])

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!url.trim()) { setError("Platform URL is required"); return }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("URL must start with http:// or https://")
      return
    }

    setLoading(true)
    setSuggestions([])

    try {
      const res = await fetch("/api/test/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to suggest test cases"); return }
      const cases: SuggestedCase[] = (data.testCases || []).map((tc: { category: string; name: string }) => ({
        ...tc,
        selected: true,
      }))
      setSuggestions(cases)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function toggle(i: number) {
    setSuggestions(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s))
  }

  function selectAll() {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: true })))
  }

  function selectNone() {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: false })))
  }

  function runSelected() {
    const selected = suggestions.filter(s => s.selected).map(s => s.name)
    if (selected.length === 0) return
    sessionStorage.setItem("suggest_testcases", selected.join("\n"))
    sessionStorage.setItem("suggest_url", url)
    router.push("/test/generate")
  }

  const selectedCount = suggestions.filter(s => s.selected).length
  const grouped = suggestions.reduce<Record<string, SuggestedCase[]>>((acc, s) => {
    ;(acc[s.category] = acc[s.category] || []).push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] transition-colors">
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
            AI Test Case Suggester
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Enter your platform URL. AI reads the page and generates a practical set of test cases
            covering auth, navigation, forms, UI, and API — ready to run instantly.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Input card */}
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-[#f0f2f5]">
              <p className="text-base font-semibold text-gray-900">Platform URL</p>
              <p className="text-xs text-gray-400 mt-0.5">AI will read the page and suggest relevant test cases</p>
            </div>
            <form onSubmit={handleSuggest} className="px-8 py-7 space-y-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" style={{ color: ACCENT }} /> URL to analyze
                </Label>
                <Input
                  placeholder="https://app.example.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <p className="text-xs text-gray-400">Must be publicly accessible</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                style={{ background: ACCENT }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 animate-spin" style={{ borderTopColor: "#fff" }} />
                    Analyzing page...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Suggest Test Cases
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Results card */}
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fff7ed" }}>
                    <ListChecks className="w-4 h-4" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {suggestions.length} Test Cases Suggested
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedCount} selected · {Object.keys(grouped).length} categories
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSuggest as any}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#e0e0e0] rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                  <div className="flex items-center gap-1 text-xs">
                    <button onClick={selectAll} className="px-2 py-1 rounded hover:bg-gray-100 transition-colors" style={{ color: ACCENT }}>All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={selectNone} className="px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-400">None</button>
                  </div>
                </div>
              </div>

              {/* Grouped test cases */}
              <div className="px-8 py-6 space-y-6">
                {Object.entries(grouped).map(([category, cases]) => {
                  const colors = CATEGORY_COLORS[category] || { bg: "#f3f4f6", text: "#374151" }
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {category}
                        </span>
                        <span className="text-xs text-gray-400">{cases.length} tests</span>
                      </div>
                      <div className="space-y-2">
                        {cases.map((s, _) => {
                          const globalIdx = suggestions.indexOf(s)
                          return (
                            <label
                              key={globalIdx}
                              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 border"
                              style={s.selected
                                ? { borderColor: "#fed7aa", background: "#fff7ed" }
                                : { borderColor: "#f0f2f5", background: "#fff" }
                              }
                            >
                              <input
                                type="checkbox"
                                checked={s.selected}
                                onChange={() => toggle(globalIdx)}
                                className="mt-0.5 rounded shrink-0"
                                style={{ accentColor: ACCENT }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-snug">{s.name}</p>
                              </div>
                              {s.selected && (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ACCENT }} />
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer CTA */}
              <div className="px-8 py-5 border-t border-[#f0f2f5] flex items-center justify-between" style={{ background: "#f9fafb" }}>
                <p className="text-xs text-gray-500">
                  {selectedCount === 0
                    ? "Select at least one test case to continue"
                    : `${selectedCount} test case${selectedCount !== 1 ? "s" : ""} will be sent to the Test Agent`}
                </p>
                <Button
                  onClick={runSelected}
                  disabled={selectedCount === 0}
                  className="rounded-xl text-white font-semibold text-sm gap-2 disabled:opacity-40"
                  style={{ background: ACCENT }}
                >
                  <FlaskConical className="w-4 h-4" />
                  Run {selectedCount > 0 ? selectedCount : ""} Selected Tests
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

        </div>
      </section>
    </div>
  )
}
