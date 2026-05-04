"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Mic, MicOff, Video, VideoOff, MessageSquare, Users,
  PhoneOff, Loader2, Send, X, CalendarDays, Clock,
  MapPin, Copy, CheckCircle2, Hand,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface MeetingData {
  id: string; title: string; description?: string
  date: string; time: string; classId?: string; createdAt: string
}

interface ChatMessage { id: string; name: string; text: string; time: string; color: string }

const COLORS = ["#4f46e5","#0891b2","#059669","#d97706","#e11d48","#7c3aed","#0284c7"]
const NAMES  = ["Aanya", "Rohan", "Priya", "Kiran", "Raj", "Neha", "Arjun"]

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)] }
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) }
function now() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }

function RoomInner() {
  const searchParams = useSearchParams()
  const id   = searchParams.get("id")   || ""
  const auto = searchParams.get("auto") === "1"

  const [meeting,  setMeeting]  = useState<MeetingData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [joined,   setJoined]   = useState(false)
  const [userName, setUserName] = useState("")
  const [nameInput, setNameInput] = useState("")

  // Room state
  const [micOn,    setMicOn]    = useState(true)
  const [camOn,    setCamOn]    = useState(false)
  const [handUp,   setHandUp]   = useState(false)
  const [panel,    setPanel]    = useState<"chat"|"participants"|null>(null)
  const [elapsed,  setElapsed]  = useState(0)
  const [copied,   setCopied]   = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<{id:string;name:string;color:string;muted:boolean}[]>([])
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch meeting data
  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetch(`/api/meeting?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.meeting) setMeeting(d.meeting) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // Auto-join when ?auto=1 (opened from invite link)
  useEffect(() => {
    if (auto && !loading && meeting && !joined) {
      const name = "Guest"
      setUserName(name)
      setJoined(true)
      setParticipants([
        { id: "me", name, color: "#4f46e5", muted: false },
        ...NAMES.slice(0, 2).map((n, i) => ({ id: `p${i}`, name: n, color: COLORS[i+1], muted: Math.random() > 0.5 }))
      ])
      setMessages([{ id: "sys", name: "System", text: `${name} joined the meeting`, time: now(), color: "#6b7280" }])
    }
  }, [auto, loading, meeting, joined])

  // Timer
  useEffect(() => {
    if (!joined) return
    const iv = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(iv)
  }, [joined])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  // Camera
  useEffect(() => {
    if (!joined) return
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      }).catch(() => setCamOn(false))
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [camOn, joined])

  function handleJoin() {
    const name = nameInput.trim() || "Guest"
    setUserName(name)
    setJoined(true)
    setParticipants([
      { id: "me", name, color: "#4f46e5", muted: !micOn },
      ...NAMES.slice(0, 2).map((n, i) => ({ id: `p${i}`, name: n, color: COLORS[i+1], muted: Math.random() > 0.5 }))
    ])
    setMessages([{
      id: "sys",
      name: "System",
      text: `${name} joined the meeting`,
      time: now(),
      color: "#6b7280",
    }])
  }

  function sendMessage() {
    if (!chatInput.trim()) return
    setMessages(m => [...m, { id: Date.now().toString(), name: userName, text: chatInput.trim(), time: now(), color: "#4f46e5" }])
    setChatInput("")
  }

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function leaveMeeting() { window.close() || history.back() }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
      <div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading meeting...</p></div>
    </div>
  )

  if (!meeting) return (
    <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
      <div className="text-center">
        <p className="text-gray-900 font-semibold mb-1">Meeting not found</p>
        <p className="text-sm text-gray-500">The link may be invalid or the server was restarted.</p>
      </div>
    </div>
  )

  // ── Pre-join lobby ──────────────────────────────────────────────────────────
  if (!joined) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-[#0891b2] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{meeting.title}</h1>
            <p className="text-xs text-gray-400">{meeting.date} at {meeting.time}</p>
          </div>
        </div>

        {meeting.description && (
          <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl px-4 py-3">{meeting.description}</p>
        )}

        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Your Name</label>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            placeholder="Enter your name"
            className="w-full h-10 px-3 text-sm border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setMicOn(m => !m)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${micOn ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-red-50 text-red-500 border-red-200"}`}>
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {micOn ? "Mic On" : "Mic Off"}
          </button>
          <button onClick={() => setCamOn(m => !m)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${camOn ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            {camOn ? "Cam On" : "Cam Off"}
          </button>
        </div>

        <button onClick={handleJoin}
          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors">
          Join Meeting
        </button>

        <button onClick={copyLink}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Link copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy meeting link</>}
        </button>
      </motion.div>
    </div>
  )

  // ── Meeting Room ────────────────────────────────────────────────────────────
  const otherParticipants = participants.filter(p => p.id !== "me")

  return (
    <div className="h-screen bg-[#111827] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1f2937] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{meeting.title}</p>
            <p className="text-[11px] text-gray-400 flex items-center gap-2">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{meeting.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{meeting.time}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg">
            {formatElapsed(elapsed)}
          </span>
          <button onClick={copyLink} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <span className="text-xs text-gray-500">{participants.length} in meeting</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 p-4 grid auto-rows-fr gap-3 overflow-hidden"
          style={{ gridTemplateColumns: participants.length <= 2 ? "1fr 1fr" : "repeat(3, 1fr)" }}>

          {/* Me */}
          <div className="relative rounded-2xl overflow-hidden bg-[#1f2937] border border-white/[0.08]">
            {camOn && <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
            <div className={`absolute inset-0 flex items-center justify-center ${camOn ? "opacity-0" : "opacity-100"}`}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                {initials(userName)}
              </div>
            </div>
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="text-xs text-white font-medium bg-black/50 px-2 py-0.5 rounded-full">
                {userName} (You)
              </span>
              <div className="flex items-center gap-1">
                {handUp && <span className="text-sm">✋</span>}
                {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          </div>

          {/* Others */}
          {otherParticipants.map(p => (
            <div key={p.id} className="relative rounded-2xl overflow-hidden bg-[#1f2937] border border-white/[0.08]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ background: `linear-gradient(135deg,${p.color}cc,${p.color}88)` }}>
                  {initials(p.name)}
                </div>
              </div>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <span className="text-xs text-white font-medium bg-black/50 px-2 py-0.5 rounded-full">{p.name}</span>
                {p.muted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          ))}
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {panel && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="bg-[#1f2937] border-l border-white/[0.06] flex flex-col overflow-hidden shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white capitalize">{panel}</p>
                <button onClick={() => setPanel(null)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {panel === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.map(m => (
                      <div key={m.id}>
                        <p className="text-[10px] font-semibold mb-0.5" style={{ color: m.color }}>{m.name}</p>
                        <p className="text-xs text-gray-300 bg-white/[0.05] px-3 py-2 rounded-xl">{m.text}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 text-right">{m.time}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/[0.06] flex gap-2">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 h-8 px-3 text-xs bg-white/[0.08] text-white placeholder-gray-500 border border-white/[0.1] rounded-lg focus:outline-none focus:border-indigo-500" />
                    <button onClick={sendMessage} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors">
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </>
              )}

              {panel === "participants" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: p.color }}>{initials(p.name)}</div>
                      <span className="text-sm text-gray-200 flex-1 truncate">{p.name}{p.id === "me" ? " (You)" : ""}</span>
                      {p.muted && <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="bg-[#1f2937] border-t border-white/[0.06] px-6 py-3 flex items-center justify-center gap-3 shrink-0">
        <CtrlBtn icon={micOn ? Mic : MicOff} label={micOn ? "Mute" : "Unmute"}
          active={micOn} danger={!micOn} onClick={() => setMicOn(m => !m)} />
        <CtrlBtn icon={camOn ? Video : VideoOff} label={camOn ? "Stop Video" : "Start Video"}
          active={camOn} onClick={() => setCamOn(m => !m)} />
        <CtrlBtn icon={Hand} label="Raise Hand" active={handUp} onClick={() => setHandUp(h => !h)} />
        <CtrlBtn icon={MessageSquare} label="Chat" active={panel === "chat"}
          badge={panel !== "chat" && messages.length > 1 ? String(messages.length - 1) : undefined}
          onClick={() => setPanel(p => p === "chat" ? null : "chat")} />
        <CtrlBtn icon={Users} label="People" active={panel === "participants"}
          badge={String(participants.length)}
          onClick={() => setPanel(p => p === "participants" ? null : "participants")} />
        <button onClick={leaveMeeting}
          className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 transition-colors">
          <PhoneOff className="w-5 h-5 text-white" />
          <span className="text-[10px] font-medium text-white">Leave</span>
        </button>
      </div>
    </div>
  )
}

function CtrlBtn({ icon: Icon, label, active = false, danger = false, badge, onClick }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; active?: boolean; danger?: boolean
  badge?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} title={label}
      className={`relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-all ${
        danger ? "bg-red-600/20 hover:bg-red-600/30" : active ? "bg-indigo-600/20 hover:bg-indigo-600/30" : "bg-white/[0.06] hover:bg-white/[0.1]"
      }`}>
      <Icon className={`w-5 h-5 ${danger ? "text-red-400" : active ? "text-indigo-400" : "text-gray-300"}`} />
      <span className={`text-[10px] font-medium ${danger ? "text-red-400" : active ? "text-indigo-400" : "text-gray-400"}`}>{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  )
}

export default function MeetingRoomPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#111827]"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>}><RoomInner /></Suspense>
}
