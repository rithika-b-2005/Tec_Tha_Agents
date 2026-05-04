"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { motion, AnimatePresence } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"
import {
  ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, Mail, Phone,
  Send, Bot, Sparkles, CheckCircle2, X, Loader2, LayoutDashboard,
  Plus, Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const ACCENT = "#0ea5e9"

interface ScheduledClass {
  id: string
  title: string
  date: string
  time: string
  location: string | null
  attendees: string[]
  emailSent: boolean
}

interface ChatMsg {
  role: "user" | "ai"
  content: string
  cls?: ScheduledClass
  emailsSent?: number
  whatsappSent?: number
  error?: boolean
}

const EXAMPLES = [
  "Schedule Python Basics on May 10 at 3pm for alice@gmail.com",
  "Book a React workshop tomorrow at 2pm in Room 204 for team@example.com",
  "Schedule Data Science class on May 15 at 10am for 918807412810",
  "Set up UX Design session next Monday at 4pm for bob@gmail.com, carol@gmail.com",
  "Intro to Machine Learning on May 20 at 11am at Hall A for three@mail.com",
]

const FLOW_STEPS = [
  { icon: Bot,          label: "Parse Intent",     color: "#0284c7" },
  { icon: CalendarDays, label: "Schedule Class",   color: "#0ea5e9" },
  { icon: Mail,         label: "Send Email",       color: "#276ef1" },
  { icon: CheckCircle2, label: "Confirm",          color: "#059669" },
]

function isEmail(val: string) { return val.includes("@") }

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })
}

export default function ClassesRunPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Manual schedule form
  const [showForm, setShowForm]         = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [successMsg, setSuccessMsg]     = useState("")
  const [errorMsg, setErrorMsg]         = useState("")
  const [generatingMeeting, setGeneratingMeeting] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", location: "", attendees: "",
  })

  async function generateMeeting() {
    setGeneratingMeeting(true)
    try {
      const id  = crypto.randomUUID()
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: form.title || "Class Session", date: form.date, time: form.time }),
      })
      if (!res.ok) throw new Error()
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setForm((f) => ({ ...f, location: `${base}/meeting/room?id=${id}&auto=1` }))
    } catch {
      setErrorMsg("Could not generate meeting link.")
    } finally {
      setGeneratingMeeting(false)
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")
    setSuccessMsg("")
    try {
      const res  = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || "Failed to schedule class"); return }
      const emlCount = (data.emailsSent   ?? 0) as number
      const waCount  = (data.whatsappSent ?? 0) as number
      const parts    = []
      if (emlCount > 0) parts.push(`email to ${emlCount}`)
      if (waCount  > 0) parts.push(`WhatsApp to ${waCount}`)
      setSuccessMsg(
        parts.length > 0
          ? `Class scheduled! Sent ${parts.join(", ")} attendee${(emlCount + waCount) > 1 ? "s" : ""}.`
          : "Class scheduled!"
      )
      setForm({ title: "", description: "", date: "", time: "", location: "", attendees: "" })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setLoading(true)
    try {
      const res  = await fetch("/api/classes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setMessages((m) => [...m, { role: "ai", content: data.error || "Something went wrong.", error: true }])
      } else {
        setMessages((m) => [...m, {
          role: "ai",
          content: data.message,
          cls: data.class,
          emailsSent: data.emailsSent,
          whatsappSent: data.whatsappSent,
        }])
      }
    } catch {
      setMessages((m) => [...m, { role: "ai", content: "Network error. Please try again.", error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-sky-500 transition-colors">
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
            Class Scheduler Agent
          </motion.h1>
          <motion.p
            initial={fadeUp.hidden} animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.2 }}
            className="text-sm text-[#7a8899] leading-relaxed"
          >
            Describe your class in plain English — AI schedules it and sends invite emails to every attendee instantly.
          </motion.p>
        </div>
      </section>

      {/* Flow indicator */}
      <motion.div
        initial={fadeUp.hidden} animate={fadeUp.visible}
        transition={{ ...transition, delay: 0.25 }}
        className="flex items-center justify-center gap-2 mb-6 flex-wrap px-6"
      >
        {FLOW_STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-white border border-[#e8edf5] rounded-lg px-3 py-1.5 shadow-sm">
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
              </div>
              {i < FLOW_STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
            </div>
          )
        })}
      </motion.div>

      {/* Chat card — full width */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 580 }}>

            {/* Card header */}
            <div className="px-8 py-5 border-b border-[#f0f2f5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#f0f9ff" }}>
                  <Bot className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">AI Class Scheduler</p>
                  <p className="text-xs text-gray-400 mt-0.5">Powered by Llama 3.3 · Schedules + sends invites automatically</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="flex items-center gap-1.5 text-xs text-sky-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scheduling...
                  </span>
                )}
                <Button
                  onClick={() => { setShowForm(true); setSuccessMsg(""); setErrorMsg("") }}
                  className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5"
                  style={{ background: ACCENT }}
                >
                  <Plus className="w-4 h-4" /> Schedule Class
                </Button>
                <Button asChild variant="outline" className="rounded-xl text-sm gap-1.5 h-9 px-3"
                  style={{ borderColor: "#bae6fd", color: "#0284c7", background: "#f0f9ff" }}>
                  <Link href="/classes"><LayoutDashboard className="w-3.5 h-3.5" /> Dashboard</Link>
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4" style={{ minHeight: 400 }}>

              {/* Welcome / examples */}
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#f0f9ff" }}>
                      <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                    </div>
                    <div className="bg-gray-50 border border-[#e8edf5] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-600 leading-relaxed max-w-2xl">
                      Hi! Tell me about the class you want to schedule — include the title, date, time, location (optional), and who to invite. I&apos;ll schedule it and send invite emails automatically.
                    </div>
                  </div>

                  <div className="ml-11">
                    <p className="text-xs text-gray-400 font-medium mb-3">Try an example:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setInput(ex)}
                          className="text-left text-sm px-4 py-3 rounded-xl border transition-colors leading-snug"
                          style={{ borderColor: "#bae6fd", color: "#0284c7", background: "#f0f9ff" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#e0f2fe" }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f9ff" }}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[60%] leading-relaxed" style={{ background: ACCENT }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.error ? "bg-red-50" : "bg-sky-50"}`}>
                          {msg.error
                            ? <X className="w-4 h-4 text-red-500" />
                            : <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${msg.error ? "bg-red-50 border border-red-100 text-red-700" : "bg-gray-50 border border-[#e8edf5] text-gray-700"}`}>
                            {msg.content}
                          </div>

                          {/* Scheduled class result card */}
                          {msg.cls && (
                            <div className="bg-white border border-[#e8edf5] rounded-xl p-5 space-y-3 max-w-2xl">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-sky-500" />
                                <p className="font-semibold text-gray-900">{msg.cls.title}</p>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                  <CalendarDays className="w-3.5 h-3.5" /> {formatDate(msg.cls.date)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {msg.cls.time}
                                </span>
                                {msg.cls.location && (
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {msg.cls.location}
                                  </span>
                                )}
                              </div>

                              {msg.cls.attendees.filter(isEmail).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email Invites
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.cls.attendees.filter(isEmail).map((e) => (
                                      <span key={e} className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-medium">
                                        <Mail className="w-2.5 h-2.5" /> {e}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {msg.cls.attendees.filter((v) => !isEmail(v)).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> WhatsApp
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.cls.attendees.filter((v) => !isEmail(v)).map((p) => (
                                      <span key={p} className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-100 px-2.5 py-0.5 rounded-full font-medium">
                                        <Phone className="w-2.5 h-2.5" /> {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2 border-t border-[#f0f2f5]">
                                {(msg.emailsSent ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                                    <Mail className="w-3 h-3" /> {msg.emailsSent} invite email{(msg.emailsSent ?? 0) > 1 ? "s" : ""} sent
                                  </span>
                                )}
                                {(msg.whatsappSent ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                                    <Phone className="w-3 h-3" /> {msg.whatsappSent} WhatsApp sent
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                  </div>
                  <div className="bg-gray-50 border border-[#e8edf5] rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-8 py-5 border-t border-[#f0f2f5] bg-white">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder="e.g. Schedule Python Basics on May 10 at 3pm in Room 101 for alice@gmail.com, bob@gmail.com"
                  rows={2}
                  className="flex-1 px-4 py-3 text-sm border border-[#e0e0e0] rounded-xl focus:outline-none resize-none transition-colors"
                  style={{ borderColor: input ? ACCENT : undefined }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="self-end w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                  style={{ background: ACCENT }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Enter to send · Shift+Enter for new line · Emails and WhatsApp sent automatically on schedule
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-5 py-3 rounded-xl shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-3"><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-5 py-3 rounded-xl shadow-lg">
          <X className="w-4 h-4 shrink-0" />{errorMsg}
          <button onClick={() => setErrorMsg("")} className="ml-3"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Schedule Class Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-sky-500" />
                </div>
                <p className="font-semibold text-gray-900">Schedule a Class</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Class Title *</label>
                <input required value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Introduction to Python"
                  className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Date *</label>
                  <input required type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Time *</label>
                  <input required type="text" value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    placeholder="e.g. 3:30 PM or 15:30"
                    className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Location / Meeting Link</label>
                <div className="flex gap-2">
                  <input value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Room 204 or generate a meeting →"
                    className="flex-1 h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 min-w-0"
                  />
                  <button type="button" onClick={generateMeeting} disabled={generatingMeeting}
                    className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors disabled:opacity-60">
                    {generatingMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                    Generate
                  </button>
                </div>
                {form.location?.includes("/meeting/room?id=") && (
                  <p className="text-[11px] text-sky-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Meeting created
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What will be covered in this class?"
                  className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Attendees <span className="text-gray-400 font-normal">(email or WhatsApp, comma-separated)</span>
                </label>
                <textarea rows={2} value={form.attendees}
                  onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                  placeholder="student@gmail.com, 918807412810, ..."
                  className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Emails → invite email · Phone → WhatsApp · India: 91XXXXXXXXXX</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{ background: ACCENT }}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                    : <><Mail className="w-4 h-4" /> Schedule &amp; Notify</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
