"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Globe, FileText,
  Settings, Lock, Monitor, Upload, FlaskConical,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#0891b2"

const TIPS = [
  "Generating test plans with AI...",
  "Creating realistic test data...",
  "Launching Playwright browser...",
  "Capturing screenshots on failure...",
  "Analyzing failures with AI...",
]

export default function GenerateTestPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState("")
  const [testCases, setTestCases] = useState("")
  const [browser, setBrowser] = useState("chromium")
  const [viewport, setViewport] = useState("desktop")
  const [hasLogin, setHasLogin] = useState(false)
  const [loginUser, setLoginUser] = useState("")
  const [loginPass, setLoginPass] = useState("")

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [tipIndex, setTipIndex] = useState(0)

  // Pre-fill from Test Suggester agent
  useEffect(() => {
    const cases = sessionStorage.getItem("suggest_testcases")
    const prefillUrl = sessionStorage.getItem("suggest_url")
    if (cases) { setTestCases(cases); sessionStorage.removeItem("suggest_testcases") }
    if (prefillUrl) { setUrl(prefillUrl); sessionStorage.removeItem("suggest_url") }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!url || !testCases.trim()) {
      setError("Platform URL and test cases are required")
      return
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("URL must start with http:// or https://")
      return
    }

    const cases = testCases.split("\n").map(c => c.trim()).filter(c => c.length > 0)
    if (cases.length === 0) {
      setError("At least one test case is required")
      return
    }
    if (hasLogin && (!loginUser.trim() || !loginPass.trim())) {
      setError("Username and password are required when login is enabled")
      return
    }

    setLoading(true)
    setTipIndex(0)

    const timer = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 3000)

    try {
      const res = await fetch("/api/test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformUrl: url, testCases: cases, browser, viewport, hasLogin, loginUser: hasLogin ? loginUser : undefined, loginPass: hasLogin ? loginPass : undefined }),
      })
      const data = await res.json()
      clearInterval(timer)
      if (!res.ok) { setError(data.error || "Failed to start test run"); setLoading(false); return }
      setDone(true)
      setTimeout(() => router.push(`/test/${data.runId}`), 1000)
    } catch {
      setError("Something went wrong. Please try again.")
      clearInterval(timer)
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try { setTestCases(await file.text()) } catch { setError("Failed to read file") }
  }

  if (done) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f3f4f6" }}>
          <div className="max-w-md w-full bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-10 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: ACCENT }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Test Run Started!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">
                  AI is generating scripts, executing them, analyzing failures, and building your bug report. Taking you there now...
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 text-left w-full space-y-1.5" style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
                <p className="text-xs font-semibold" style={{ color: ACCENT }}>Pipeline running</p>
                {["Claude generates test plans", "AI creates test data", "Playwright executes tests", "Claude analyzes failures", "Bug report generated"].map((step, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACCENT }} />{step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] transition-colors" style={{ ["--hover-color" as any]: ACCENT }}>
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
            Run AI Test Suite
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Provide a platform URL and describe your test cases in plain English. AI generates Playwright scripts,
            runs them in a real browser, and delivers a full bug report with root cause analysis.
          </motion.p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">Test Configuration</p>
                  <p className="text-xs text-gray-400 mt-0.5">Describe what to test — AI writes the scripts and runs them</p>
                </div>
              </div>

              {loading ? (
                <div className="px-8 py-16 text-center">
                  <div className="mb-5 flex justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: ACCENT }} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Running test suite...</p>
                  <p className="text-sm text-gray-500 h-5">{TIPS[tipIndex]}</p>
                </div>
              ) : (
                <div className="px-8 py-7 space-y-6">
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                  )}

                  {/* Platform URL */}
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Platform URL
                    </Label>
                    <Input
                      placeholder="https://app.example.com"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <p className="text-xs text-gray-400">Must be publicly accessible</p>
                  </div>

                  {/* Test Cases */}
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Test Cases
                    </Label>
                    <Textarea
                      placeholder={"User can login with valid credentials\nShopping cart updates quantity\nCheckout completes payment\nUser receives confirmation email"}
                      value={testCases}
                      onChange={e => setTestCases(e.target.value)}
                      className="rounded-lg resize-none border-[#e0e0e0] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">One test case per line, describe in plain English</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-[#e0e0e0] rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="h-3 w-3" /> Upload .txt / .md
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} hidden />
                  </div>

                  {/* Browser + Viewport */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Browser
                      </Label>
                      <Select
                        value={browser}
                        onChange={e => setBrowser(e.target.value)}
                        options={[
                          { value: "chromium", label: "Chromium" },
                          { value: "firefox", label: "Firefox" },
                          { value: "webkit", label: "Safari (WebKit)" },
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Viewport
                      </Label>
                      <div className="flex gap-2">
                        {[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }, { value: "tablet", label: "Tablet" }].map(v => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => setViewport(v.value)}
                            className="flex-1 h-11 rounded-lg text-sm font-medium transition-all border"
                            style={viewport === v.value
                              ? { background: ACCENT, color: "#fff", borderColor: ACCENT }
                              : { background: "#fff", color: "#374151", borderColor: "#e0e0e0" }
                            }
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Login */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasLogin}
                        onChange={e => setHasLogin(e.target.checked)}
                        className="rounded border-gray-300"
                        style={{ accentColor: ACCENT }}
                      />
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Test requires login
                      </span>
                    </label>
                    {hasLogin && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Input placeholder="Username / Email" value={loginUser} onChange={e => setLoginUser(e.target.value)}
                          className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <Input placeholder="Password" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                          className="rounded-lg h-11 border-[#e0e0e0] focus-visible:ring-0 focus-visible:ring-offset-0" />
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={loading}
                    className="w-full rounded-xl text-white font-semibold h-11 text-sm"
                    style={{ background: ACCENT }}>
                    <span className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" />
                      Start Test Run
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>

                  <p className="text-center text-xs text-gray-400">Takes 30–120 seconds depending on test count.</p>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
