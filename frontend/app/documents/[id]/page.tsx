"use client"

import { useState, useEffect, useRef, use } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  BookOpen,
  FileQuestion,
  RefreshCw,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#7c3aed"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

interface DocumentDetail {
  id: string
  name: string
  type: string
  size: number
  content: string
  summary?: string
  messages: Message[]
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  pdf: [
    "What is the main purpose of this document?",
    "What are the key dates or deadlines mentioned?",
    "Who are the parties involved?",
    "Summarize the most important terms.",
  ],
  txt: [
    "What is this document about?",
    "What are the key points?",
    "Are there any action items?",
    "What conclusions are drawn?",
  ],
  docx: [
    "What are the payment terms?",
    "What obligations are mentioned?",
    "What is the total amount due?",
    "Are there any penalty clauses?",
  ],
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    pdf: "bg-red-50 text-red-600 border-red-100",
    txt: "bg-blue-50 text-blue-600 border-blue-100",
    docx: "bg-indigo-50 text-indigo-600 border-indigo-100",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${colors[type] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}
    >
      {type.toUpperCase()}
    </span>
  )
}

export default function DocumentChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function fetchDocument() {
    try {
      const res = await fetch(`/api/documents/${id}`)
      if (!res.ok) throw new Error("Document not found")
      const data = await res.json()
      setDocument(data.document)
      setMessages(data.document.messages ?? [])
    } catch {
      setError("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocument()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(q?: string) {
    const text = (q ?? question).trim()
    if (!text || sending) return

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setQuestion("")
    setSending(true)
    setError("")

    try {
      const res = await fetch(`/api/documents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Chat failed")
      }
      const data = await res.json()
      const assistantMsg: Message = {
        id: `tmp-${Date.now() + 1}`,
        role: "assistant",
        content: data.answer,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chat failed"
      setError(msg)
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = SUGGESTED_QUESTIONS[document?.type ?? "pdf"] ?? SUGGESTED_QUESTIONS.pdf

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Header />
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: ACCENT }} />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="text-center">
          <p className="text-gray-500 mb-4">Document not found</p>
          <Link href="/documents" className="text-sm font-medium" style={{ color: ACCENT }}>
            ← Back to Documents
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      {/* Top bar */}
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-[#7a8899] mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </Link>
      </div>

      {/* Main layout */}
      <div className="px-6 pb-16 max-w-7xl mx-auto">
        <div className="flex gap-5 items-start">

          {/* Left panel — document info (40%) */}
          <motion.div
            className="w-[40%] shrink-0 flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={transition}
          >
            {/* Doc card */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#ede9fe" }}
                >
                  <FileText className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{document.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TypeBadge type={document.type} />
                    <span className="text-xs text-gray-400">{formatBytes(document.size)}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
                <span>Uploaded</span>
                <span className="font-medium text-gray-500">
                  {new Date(document.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="border-t border-[#f0f0f0] pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Summary</p>
                </div>
                {document.summary ? (
                  <p className="text-sm text-gray-600 leading-relaxed">{document.summary}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No summary available</p>
                )}
              </div>
            </div>

            {/* Suggested questions */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileQuestion className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Suggested Questions</p>
              </div>
              <div className="flex flex-col gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={sending}
                    className="text-left text-xs text-gray-600 px-3 py-2 rounded-xl border border-[#e8edf5] hover:border-violet-200 hover:bg-violet-50/40 hover:text-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Content preview */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Raw Content Preview</p>
              <p className="text-xs text-gray-400 leading-relaxed font-mono line-clamp-6">
                {document.content.slice(0, 400)}...
              </p>
            </div>
          </motion.div>

          {/* Right panel — chat (60%) */}
          <motion.div
            className="flex-1 min-w-0"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ ...transition, delay: 0.1 }}
          >
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm flex flex-col" style={{ height: "78vh" }}>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="text-sm font-semibold text-gray-800">Chat with Document</span>
                  <span className="text-xs text-gray-400">· {messages.length} message{messages.length !== 1 ? "s" : ""}</span>
                </div>
                <button
                  onClick={fetchDocument}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "#ede9fe" }}
                    >
                      <MessageSquare className="w-7 h-7" style={{ color: ACCENT }} />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Ask anything about this document</p>
                    <p className="text-xs text-gray-400">Use the suggested questions on the left, or type your own</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "text-white rounded-br-sm"
                                : "bg-gray-50 text-gray-800 border border-[#e8edf5] rounded-bl-sm"
                            }`}
                            style={msg.role === "user" ? { background: ACCENT } : {}}
                          >
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {sending && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gray-50 border border-[#e8edf5] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                          <span className="text-xs text-gray-400">Analyzing document...</span>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && (
                <div className="mx-6 mb-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              {/* Input */}
              <div className="px-6 py-4 border-t border-[#f0f0f0]">
                <div className="flex gap-3 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this document… (Enter to send)"
                    className="flex-1 resize-none text-sm min-h-[44px] max-h-32 border-[#e8edf5] rounded-xl focus-visible:ring-violet-400 focus-visible:ring-1"
                    rows={1}
                    disabled={sending}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!question.trim() || sending}
                    className="h-11 w-11 p-0 rounded-xl text-white shrink-0 cursor-pointer"
                    style={{ background: ACCENT }}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
