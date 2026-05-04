"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus, RefreshCw, Trash2, CalendarDays, Clock, MapPin,
  ArrowLeft, Users, Mail, CheckCircle2, X, Loader2, Video, Phone, Bot,
} from "lucide-react"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"

interface ScheduledClass {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  location: string | null
  attendees: string[]
  status: string
  emailSent: boolean
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "text-blue-600 bg-blue-50 border-blue-200",
  completed:  "text-green-600 bg-green-50 border-green-200",
  cancelled:  "text-red-500 bg-red-50 border-red-200",
}

function isEmail(val: string) { return val.includes("@") }

export default function ClassesPage() {
  const [classes, setClasses]       = useState<ScheduledClass[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg]     = useState("")
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [generatingMeeting, setGeneratingMeeting] = useState(false)
  const [addingTo, setAddingTo]     = useState<string | null>(null)  // class id being expanded
  const [addInput, setAddInput]     = useState("")
  const [addingLoading, setAddingLoading] = useState(false)
  const [addMsg, setAddMsg]         = useState<{ id: string; text: string; ok: boolean } | null>(null)

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
      if (!res.ok) throw new Error("Failed to create meeting")
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setForm((f) => ({ ...f, location: `${base}/meeting/room?id=${id}&auto=1` }))
    } catch {
      setErrorMsg("Could not generate meeting link.")
    } finally {
      setGeneratingMeeting(false)
    }
  }

  const fetchClasses = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const res  = await fetch("/api/classes")
      const data = await res.json()
      setClasses(data.classes ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  async function handleSubmit(e: React.FormEvent) {
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
      const waCount  = (data.whatsappSent ?? 0) as number
      const emlCount = (data.emailsSent   ?? 0) as number
      const parts    = []
      if (emlCount > 0) parts.push(`email to ${emlCount}`)
      if (waCount  > 0) parts.push(`WhatsApp to ${waCount}`)
      const errors = [data.whatsappError, data.emailError].filter(Boolean).join(" | ")
      setSuccessMsg(
        parts.length > 0
          ? `Class scheduled! Sent ${parts.join(", ")} attendee${(waCount + emlCount) > 1 ? "s" : ""}.`
          : errors ? `Class scheduled. Notification failed: ${errors}` : "Class scheduled! (No attendees.)"
      )
      setForm({ title: "", description: "", date: "", time: "", location: "", attendees: "" })
      setShowForm(false)
      await fetchClasses(true)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteClass(id: string) {
    setDeleteId(null)
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" })
      setClasses((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setErrorMsg("Failed to delete class")
    }
  }

  async function markStatus(id: string, status: string) {
    try {
      const res  = await fetch(`/api/classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok) setClasses((prev) => prev.map((c) => (c.id === id ? data.class : c)))
    } catch {
      setErrorMsg("Failed to update status")
    }
  }

  async function handleAddAttendees(classId: string) {
    const raw = addInput.trim()
    if (!raw) return
    setAddingLoading(true)
    try {
      const res  = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addAttendees: raw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddMsg({ id: classId, text: data.error || "Failed to add.", ok: false })
      } else {
        const parts = []
        if ((data.emailsSent  ?? 0) > 0) parts.push(`email to ${data.emailsSent}`)
        if ((data.whatsappSent ?? 0) > 0) parts.push(`WhatsApp to ${data.whatsappSent}`)
        setAddMsg({
          id: classId,
          text: data.added === 0
            ? data.message || "Already added."
            : `Added ${data.added} member${data.added > 1 ? "s" : ""}${parts.length ? ". Sent " + parts.join(", ") : ""}.`,
          ok: true,
        })
        setAddInput("")
        setClasses((prev) => prev.map((c) => (c.id === classId ? data.class : c)))
        setTimeout(() => { setAddMsg(null); setAddingTo(null) }, 3000)
      }
    } finally {
      setAddingLoading(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    })
  }

  const upcoming = classes.filter((c) => c.status === "scheduled")
  const past     = classes.filter((c) => c.status !== "scheduled")

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-[#0891b2] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Title row */}
      <section className="pt-4 pb-5 px-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <motion.div initial={fadeUp.hidden} animate={fadeUp.visible} transition={transition}>
            <h1 className="text-2xl font-semibold text-gray-900 mb-0.5">Class Scheduler Agent</h1>
            <p className="text-sm text-gray-400">
              Schedule classes · auto-send invite emails · track upcoming &amp; past
            </p>
          </motion.div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchClasses(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-[#e0e0e0] bg-white text-gray-500 hover:text-sky-500 hover:border-sky-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Button asChild variant="outline" className="rounded-xl text-sm font-medium h-9 px-4 gap-1.5"
              style={{ borderColor: "#bae6fd", color: "#0284c7", background: "#f0f9ff" }}>
              <Link href="/classes/run"><Bot className="w-4 h-4" /> Run Agent</Link>
            </Button>
            <Button
              onClick={() => { setShowForm(true); setSuccessMsg(""); setErrorMsg("") }}
              className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5"
              style={{ background: "#0ea5e9" }}
            >
              <Plus className="w-4 h-4" /> Schedule Class
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-5">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-3">
          {[
            { label: "Total Classes",       value: classes.length,  color: "text-gray-900" },
            { label: "Upcoming",            value: upcoming.length, color: "text-sky-500"  },
            { label: "Completed/Cancelled", value: past.length,     color: "text-gray-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alerts */}
      {successMsg && (
        <div className="px-6 pb-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
            <button onClick={() => setSuccessMsg("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="px-6 pb-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            <X className="w-4 h-4 shrink-0" />{errorMsg}
            <button onClick={() => setErrorMsg("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Class list — full width */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-4">
          {loading ? (
            <div className="bg-white border border-[#e8edf5] rounded-2xl flex items-center justify-center py-24 gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white border border-[#e8edf5] rounded-2xl flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                <CalendarDays className="w-6 h-6 text-sky-500" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No classes scheduled yet</p>
              <p className="text-sm text-gray-400 mb-5">Use the AI agent or form to schedule your first class</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="rounded-xl text-sm gap-1.5"
                  style={{ borderColor: "#bae6fd", color: "#0284c7", background: "#f0f9ff" }}>
                  <Link href="/classes/run"><Bot className="w-4 h-4" /> Run Agent</Link>
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-xl text-white text-sm font-semibold h-9 px-4 gap-1.5"
                  style={{ background: "#0ea5e9" }}
                >
                  <Plus className="w-4 h-4" /> Schedule Class
                </Button>
              </div>
            </div>
          ) : (
            classes.map((cls) => {
              const emailAttendees = cls.attendees.filter(isEmail)
              const phoneAttendees = cls.attendees.filter((v) => !isEmail(v))
              return (
                <div key={cls.id} className="bg-white border border-[#e8edf5] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Title + badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{cls.title}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${STATUS_COLORS[cls.status] ?? "text-gray-500 bg-gray-50 border-gray-200"}`}
                        >
                          {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                        </Badge>
                        {cls.emailSent && emailAttendees.length > 0 && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 border-blue-200 flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" /> Email sent
                          </Badge>
                        )}
                        {cls.emailSent && phoneAttendees.length > 0 && (
                          <Badge variant="outline" className="text-[10px] text-green-600 bg-green-50 border-green-200 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> WhatsApp sent
                          </Badge>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(cls.date)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cls.time}</span>
                        {cls.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cls.location}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cls.attendees.length} attendee{cls.attendees.length !== 1 ? "s" : ""}</span>
                      </div>

                      {cls.description && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{cls.description}</p>
                      )}

                      {/* Email attendees */}
                      {emailAttendees.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email Invites
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {emailAttendees.map((email) => (
                              <span key={email} className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-medium">
                                <Mail className="w-2.5 h-2.5" /> {email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Phone attendees */}
                      {phoneAttendees.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> WhatsApp
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {phoneAttendees.map((phone) => (
                              <span key={phone} className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-100 px-2.5 py-0.5 rounded-full font-medium">
                                <Phone className="w-2.5 h-2.5" /> {phone}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cls.location && cls.status === "scheduled" && (
                        cls.location.startsWith("/") ? (
                          <Link href={cls.location}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: "#0ea5e9" }}>
                            <Video className="w-3.5 h-3.5" /> Join
                          </Link>
                        ) : (
                          <a href={cls.location} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: "#0ea5e9" }}>
                            <Video className="w-3.5 h-3.5" /> Join
                          </a>
                        )
                      )}
                      <button
                        onClick={() => { setAddingTo(addingTo === cls.id ? null : cls.id); setAddInput(""); setAddMsg(null) }}
                        className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-gray-400 hover:text-sky-500 hover:border-sky-300 transition-colors"
                        title="Add members"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      {cls.status === "scheduled" && (
                        <button
                          onClick={() => markStatus(cls.id, "completed")}
                          className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-gray-400 hover:text-green-600 hover:border-green-300 transition-colors"
                          title="Mark completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteId(cls.id)}
                        className="p-1.5 rounded-lg border border-[#e0e0e0] bg-white text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add members inline */}
                  {addingTo === cls.id && (
                    <div className="mt-3 pt-3 border-t border-[#f0f2f5]">
                      <p className="text-xs font-medium text-gray-600 mb-2">Add members — email or WhatsApp, comma-separated</p>
                      <div className="flex gap-2">
                        <input
                          value={addInput}
                          onChange={(e) => setAddInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddAttendees(cls.id) }}
                          placeholder="newstudent@gmail.com, 918807412810, ..."
                          className="flex-1 h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400"
                        />
                        <button
                          onClick={() => handleAddAttendees(cls.id)}
                          disabled={!addInput.trim() || addingLoading}
                          className="h-9 px-4 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                          style={{ background: "#0ea5e9" }}
                        >
                          {addingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add & Notify"}
                        </button>
                        <button onClick={() => setAddingTo(null)} className="h-9 px-2 text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {addMsg?.id === cls.id && (
                        <p className={`text-xs mt-2 ${addMsg.ok ? "text-green-600" : "text-red-500"}`}>{addMsg.text}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

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

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Class Title *</label>
                <input
                  required
                  value={form.title}
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
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Room 204 or generate a meeting →"
                    className="flex-1 h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={generateMeeting}
                    disabled={generatingMeeting}
                    className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors disabled:opacity-60"
                  >
                    {generatingMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                    Generate
                  </button>
                </div>
                {form.location?.includes("/meeting/room?id=") && (
                  <p className="text-[11px] text-sky-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Meeting created — hosted inside AI Automation
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What will be covered in this class?"
                  className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Attendees <span className="text-gray-400 font-normal">(email or WhatsApp number, comma-separated)</span>
                </label>
                <textarea rows={3} value={form.attendees}
                  onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                  placeholder="student@gmail.com, 918807412810, another@email.com, ..."
                  className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-sky-400 resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">Emails → invite email · Phone numbers → WhatsApp · India: 91XXXXXXXXXX</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{ background: "#0ea5e9" }}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                    : <><Mail className="w-4 h-4" /> Schedule &amp; Notify Attendees</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete this class?</p>
                <p className="text-sm text-gray-400 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteClass(deleteId)}
                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
