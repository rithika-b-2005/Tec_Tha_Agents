"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import Header from "@/app/components/Header"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Send, MessageSquare, Users, Plus, X, Trash2,
  Bell, BellOff, UserPlus, Hash, ChevronDown,
} from "lucide-react"

interface ChatGroup {
  id: string
  name: string
  description: string | null
  members: string[]
  createdBy: string
  createdAt: string
  _count?: { messages: number }
}

interface Msg {
  id: string
  sender: string
  text: string
  groupId: string | null
  createdAt: string
}

const PALETTE = [
  "#4f46e5","#0891b2","#059669","#d97706","#e11d48",
  "#7c3aed","#0284c7","#b45309","#be123c","#0f766e",
]

function senderColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function groupByDate(msgs: Msg[]) {
  const groups: { date: string; msgs: Msg[] }[] = []
  for (const m of msgs) {
    const label = formatDate(m.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.date === label) last.msgs.push(m)
    else groups.push({ date: label, msgs: [m] })
  }
  return groups
}

const STORAGE_KEY = "chat_display_name"

export default function ChatPage() {
  const [myName, setMyName]         = useState("")
  const [nameInput, setNameInput]   = useState("")
  const [nameSet, setNameSet]       = useState(false)

  const [groups, setGroups]         = useState<ChatGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null)
  const [messages, setMessages]     = useState<Msg[]>([])
  const [input, setInput]           = useState("")
  const [sending, setSending]       = useState(false)

  // Unread counts per group
  const [unread, setUnread]         = useState<Record<string, number>>({})
  const latestRef                   = useRef<Record<string, string>>({})
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)

  // Notifications
  const [notifAllowed, setNotifAllowed] = useState(false)

  // Modals
  const [showCreate, setShowCreate]   = useState(false)
  const [createName, setCreateName]   = useState("")
  const [createDesc, setCreateDesc]   = useState("")
  const [createMembers, setCreateMembers] = useState("")
  const [creating, setCreating]       = useState(false)

  const [showAddMember, setShowAddMember] = useState(false)
  const [addMemberInput, setAddMemberInput] = useState("")
  const [addingMember, setAddingMember]     = useState(false)
  const [addMemberMsg, setAddMemberMsg]     = useState("")

  // Load name
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) { setMyName(saved); setNameSet(true) }
  }, [])

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") setNotifAllowed(true)
    }
  }, [])

  async function requestNotifications() {
    if (!("Notification" in window)) return
    const perm = await Notification.requestPermission()
    setNotifAllowed(perm === "granted")
  }

  function showNotification(title: string, body: string) {
    if (notifAllowed && document.hidden) {
      new Notification(title, { body, icon: "/favicon.ico" })
    }
  }

  // Load groups
  async function loadGroups() {
    try {
      const res  = await fetch("/api/chat/groups")
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch {}
  }

  useEffect(() => { loadGroups() }, [])

  // Load messages for active group
  const loadMessages = useCallback(async (grp: ChatGroup | null) => {
    if (!grp) return
    try {
      const res  = await fetch(`/api/chat?groupId=${grp.id}`)
      const data = await res.json()
      const msgs: Msg[] = data.messages ?? []
      setMessages(msgs)
      if (msgs.length > 0) {
        latestRef.current[grp.id] = msgs[msgs.length - 1].createdAt
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (activeGroup) {
      loadMessages(activeGroup)
      setUnread(prev => ({ ...prev, [activeGroup.id]: 0 }))
    }
  }, [activeGroup, loadMessages])

  // Poll active group for new messages every 2s
  useEffect(() => {
    if (!activeGroup) return
    const iv = setInterval(async () => {
      try {
        const since = latestRef.current[activeGroup.id]
        const url   = since
          ? `/api/chat?groupId=${activeGroup.id}&since=${encodeURIComponent(since)}`
          : `/api/chat?groupId=${activeGroup.id}`
        const res  = await fetch(url)
        const data = await res.json()
        const newMsgs: Msg[] = data.messages ?? []
        if (newMsgs.length > 0) {
          latestRef.current[activeGroup.id] = newMsgs[newMsgs.length - 1].createdAt
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id))
            return [...prev, ...newMsgs.filter(m => !ids.has(m.id))]
          })
          // Notify for messages not from self
          const foreign = newMsgs.filter(m => m.sender !== myName)
          for (const m of foreign) {
            showNotification(`${m.sender} in #${activeGroup.name}`, m.text)
          }
        }
      } catch {}
    }, 2000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, myName, notifAllowed])

  // Poll all groups for unread badge every 5s
  useEffect(() => {
    if (groups.length === 0) return
    const iv = setInterval(async () => {
      for (const grp of groups) {
        if (activeGroup?.id === grp.id) continue
        try {
          const since = latestRef.current[grp.id]
          if (!since) continue
          const res  = await fetch(`/api/chat?groupId=${grp.id}&since=${encodeURIComponent(since)}`)
          const data = await res.json()
          const newMsgs: Msg[] = data.messages ?? []
          if (newMsgs.length > 0) {
            latestRef.current[grp.id] = newMsgs[newMsgs.length - 1].createdAt
            setUnread(prev => ({ ...prev, [grp.id]: (prev[grp.id] ?? 0) + newMsgs.length }))
            const foreign = newMsgs.filter(m => m.sender !== myName)
            for (const m of foreign) {
              showNotification(`${m.sender} in #${grp.name}`, m.text)
            }
          }
        } catch {}
      }
    }, 5000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeGroup, myName, notifAllowed])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function saveName() {
    const name = nameInput.trim()
    if (!name) return
    localStorage.setItem(STORAGE_KEY, name)
    setMyName(name)
    setNameSet(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !myName || !activeGroup) return
    setSending(true)
    setInput("")
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: myName, text, groupId: activeGroup.id }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        latestRef.current[activeGroup.id] = data.message.createdAt
      }
    } catch {} finally {
      setSending(false)
    }
  }

  async function createGroup() {
    if (!createName.trim() || !myName) return
    setCreating(true)
    try {
      const rawMembers = createMembers.split(",").map(m => m.trim()).filter(Boolean)
      const res  = await fetch("/api/chat/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || null, members: rawMembers, createdBy: myName }),
      })
      const data = await res.json()
      if (data.group) {
        setGroups(prev => [...prev, data.group])
        setActiveGroup(data.group)
        setMessages([])
        setShowCreate(false)
        setCreateName("")
        setCreateDesc("")
        setCreateMembers("")
      }
    } catch {} finally {
      setCreating(false)
    }
  }

  async function addMember() {
    if (!addMemberInput.trim() || !activeGroup) return
    setAddingMember(true)
    try {
      const res  = await fetch(`/api/chat/groups/${activeGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addMember: addMemberInput.trim() }),
      })
      const data = await res.json()
      if (data.group) {
        setActiveGroup(data.group)
        setGroups(prev => prev.map(g => g.id === data.group.id ? data.group : g))
        setAddMemberMsg(data.alreadyMember ? "Already a member." : `${addMemberInput.trim()} added!`)
        setAddMemberInput("")
        setTimeout(() => { setAddMemberMsg(""); setShowAddMember(false) }, 2000)
      }
    } catch {} finally {
      setAddingMember(false)
    }
  }

  async function deleteGroup(id: string) {
    await fetch(`/api/chat/groups/${id}`, { method: "DELETE" })
    setGroups(prev => prev.filter(g => g.id !== id))
    if (activeGroup?.id === id) { setActiveGroup(null); setMessages([]) }
  }

  const dateGroups = groupByDate(messages)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f3f4f6" }}>
      <Header />

      {/* Name gate */}
      <AnimatePresence>
        {!nameSet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
                <MessageSquare className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Enter your name</h2>
              <p className="text-sm text-gray-400 mb-5">Others in the group will see this</p>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()}
                placeholder="Your name"
                className="w-full h-10 px-3 text-sm border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-indigo-400 mb-4"
              />
              <button
                onClick={saveName}
                disabled={!nameInput.trim()}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">Create Group</p>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Group Name *</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <input value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                  placeholder="What's this group about?"
                  className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Add Members <span className="text-gray-400 font-normal">(names, comma-separated)</span></label>
                <input value={createMembers} onChange={e => setCreateMembers(e.target.value)}
                  placeholder="Alice, Bob, Charlie"
                  className="w-full h-9 px-3 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">You are added automatically as creator</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 rounded-xl border border-[#e0e0e0] text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={createGroup} disabled={!createName.trim() || creating}
                  className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                  {creating ? "Creating..." : "Create Group"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-20 px-6 max-w-7xl mx-auto w-full">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899] hover:text-indigo-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
      </div>

      {/* Main chat layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-6 pb-6 gap-4" style={{ minHeight: 0 }}>

        {/* Left sidebar — groups */}
        <div className="w-64 shrink-0 flex flex-col bg-white rounded-2xl border border-[#e8edf5] shadow-sm overflow-hidden">
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Team Chat</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={notifAllowed ? undefined : requestNotifications}
                  title={notifAllowed ? "Notifications on" : "Enable notifications"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {notifAllowed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {myName && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                  style={{ background: senderColor(myName) }}>
                  {initials(myName)}
                </div>
                <span className="truncate">{myName}</span>
                <button onClick={() => { setNameSet(false); setNameInput("") }}
                  className="ml-auto text-[10px] text-gray-400 hover:text-indigo-500">✏</button>
              </div>
            )}
          </div>

          {/* Group list */}
          <div className="flex-1 overflow-y-auto py-2">
            {groups.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 px-4">No groups yet. Create one!</p>
            ) : (
              groups.map(grp => (
                <button
                  key={grp.id}
                  onClick={() => { setActiveGroup(grp); setUnread(p => ({ ...p, [grp.id]: 0 })) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${activeGroup?.id === grp.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeGroup?.id === grp.id ? "text-indigo-700" : "text-gray-800"}`}>{grp.name}</p>
                    <p className="text-[10px] text-gray-400">{grp.members.length} member{grp.members.length !== 1 ? "s" : ""}</p>
                  </div>
                  {(unread[grp.id] ?? 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {unread[grp.id] > 9 ? "9+" : unread[grp.id]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* New group button */}
          <div className="px-3 py-3 border-t border-[#f0f0f0]">
            <button
              onClick={() => setShowCreate(true)}
              disabled={!nameSet}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          </div>
        </div>

        {/* Right — chat window */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-[#e8edf5] shadow-sm overflow-hidden" style={{ minHeight: 0 }}>

          {!activeGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Hash className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-gray-900 font-semibold mb-1">Select a group</p>
              <p className="text-sm text-gray-400 mb-5">Pick a group from the sidebar or create a new one</p>
              <button onClick={() => setShowCreate(true)} disabled={!nameSet}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Create Group
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{activeGroup.name}</p>
                    {activeGroup.description && (
                      <p className="text-[11px] text-gray-400">{activeGroup.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Members pill */}
                  <div className="flex -space-x-1.5">
                    {activeGroup.members.slice(0, 4).map(m => (
                      <div key={m} title={m}
                        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: senderColor(m) }}>
                        {initials(m)}
                      </div>
                    ))}
                    {activeGroup.members.length > 4 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-medium text-gray-600">
                        +{activeGroup.members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{activeGroup.members.length} members</span>

                  {/* Add member */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowAddMember(p => !p); setAddMemberInput(""); setAddMemberMsg("") }}
                      className="p-1.5 rounded-lg border border-[#e0e0e0] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                      title="Add member"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    {showAddMember && (
                      <div className="absolute right-0 top-9 bg-white border border-[#e8edf5] rounded-xl shadow-lg p-3 z-20 w-64">
                        <p className="text-xs font-medium text-gray-700 mb-2">Add member by name</p>
                        <div className="flex gap-1.5">
                          <input value={addMemberInput} onChange={e => setAddMemberInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addMember()}
                            placeholder="Member name"
                            className="flex-1 h-8 px-2.5 text-xs border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-indigo-400"
                          />
                          <button onClick={addMember} disabled={!addMemberInput.trim() || addingMember}
                            className="h-8 px-2.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50">
                            Add
                          </button>
                        </div>
                        {addMemberMsg && <p className="text-[11px] text-green-600 mt-1.5">{addMemberMsg}</p>}
                      </div>
                    )}
                  </div>

                  {/* Delete group */}
                  <button
                    onClick={() => deleteGroup(activeGroup.id)}
                    className="p-1.5 rounded-lg border border-[#e0e0e0] text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Members bar */}
              <div className="px-5 py-2 bg-gray-50 border-b border-[#f0f0f0] flex items-center gap-1.5 flex-wrap shrink-0">
                {activeGroup.members.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                    style={{ background: senderColor(m) }}>
                    {m}
                  </span>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ minHeight: 0 }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No messages yet</p>
                    <p className="text-sm text-gray-400">Be the first to say something!</p>
                  </div>
                ) : (
                  dateGroups.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-[#f0f0f0]" />
                        <span className="text-[11px] text-gray-400 font-medium px-2">{group.date}</span>
                        <div className="flex-1 h-px bg-[#f0f0f0]" />
                      </div>
                      {group.msgs.map((m, idx) => {
                        const isMe = m.sender === myName
                        const color = senderColor(m.sender)
                        const showSender = !isMe && (idx === 0 || group.msgs[idx - 1].sender !== m.sender)
                        return (
                          <div key={m.id} className={`flex gap-2.5 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                            <div className="shrink-0 w-7 h-7 mt-1">
                              {(!isMe && showSender) && (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                  style={{ background: color }}>
                                  {initials(m.sender)}
                                </div>
                              )}
                            </div>
                            <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                              {showSender && !isMe && (
                                <span className="text-[11px] font-semibold mb-0.5 ml-1" style={{ color }}>{m.sender}</span>
                              )}
                              <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe ? "rounded-tr-sm text-white" : "rounded-tl-sm text-gray-800 bg-[#f3f4f6]"}`}
                                style={isMe ? { background: "#4f46e5" } : {}}>
                                {m.text}
                              </div>
                              <span className="text-[10px] text-gray-400 mt-0.5 mx-1">{formatTime(m.createdAt)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-[#f0f0f0] shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder={nameSet ? `Message #${activeGroup.name}...` : "Set your name first"}
                    disabled={!nameSet || sending}
                    className="flex-1 h-10 px-4 text-sm border border-[#e0e0e0] rounded-xl focus:outline-none focus:border-indigo-400 disabled:bg-gray-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || !nameSet || sending}
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
