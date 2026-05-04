"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  BookOpen,
  Search,
  Plus,
  Tag,
  Lightbulb,
  FileText,
  Trash2,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  Filter,
  MessageSquare,
  Save,
  ArrowLeft,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#8b5cf6"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  idea: <Lightbulb className="w-4 h-4" />,
  article: <BookOpen className="w-4 h-4" />,
  meeting: <MessageSquare className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  research: <Search className="w-4 h-4" />,
  other: <Tag className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  idea: { bg: "#fef3c7", text: "#92400e" },
  article: { bg: "#dbeafe", text: "#1e40af" },
  meeting: { bg: "#d1fae5", text: "#065f46" },
  note: { bg: "#f3f4f6", text: "#374151" },
  research: { bg: "#ede9fe", text: "#5b21b6" },
  other: { bg: "#fce7f3", text: "#9d174d" },
}

const TAG_PALETTE = [
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#fee2e2", text: "#991b1b" },
]

function tagColor(tag: string) {
  const idx = Math.abs([...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0)) % TAG_PALETTE.length
  return TAG_PALETTE[idx]
}

interface BrainNote {
  id: string
  title: string
  summary: string | null
  tags: string[]
  category: string | null
  source: string | null
  createdAt: string
}

interface FullNote extends BrainNote {
  content: string
}

const ALL_CATEGORIES = ["all", "idea", "article", "meeting", "note", "research", "other"]

export default function BrainPage() {
  const [notes, setNotes] = useState<BrainNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saveContent, setSaveContent] = useState("")
  const [saveSource, setSaveSource] = useState("")
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<BrainNote[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [askQuery, setAskQuery] = useState("")
  const [askAnswer, setAskAnswer] = useState("")
  const [askRelevant, setAskRelevant] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedNote, setSelectedNote] = useState<FullNote | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchNotes() {
    try {
      const res = await fetch("/api/brain")
      const data = await res.json()
      setNotes(data.notes || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch("/api/brain/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery.trim() }),
        })
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch {}
      finally { setSearching(false) }
    }, 500)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [searchQuery])

  async function handleSave() {
    if (!saveContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/brain/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: saveContent.trim(), source: saveSource.trim() || undefined }),
      })
      if (res.ok) {
        setSaveContent("")
        setSaveSource("")
        await fetchNotes()
      }
    } catch {}
    finally { setSaving(false) }
  }

  async function handleAsk() {
    if (!askQuery.trim()) return
    setAsking(true)
    setAskAnswer("")
    setAskRelevant([])
    try {
      const res = await fetch("/api/brain/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuery.trim() }),
      })
      const data = await res.json()
      setAskAnswer(data.answer || "")
      setAskRelevant(data.relevantNotes || [])
    } catch {}
    finally { setAsking(false) }
  }

  async function openNote(id: string) {
    setPanelLoading(true)
    setSelectedNote(null)
    // Use a temp panel with loading
    setSelectedNote({ id, title: "", summary: null, tags: [], category: null, source: null, createdAt: "", content: "" })
    try {
      const res = await fetch(`/api/brain/${id}`)
      const data = await res.json()
      if (data.note) setSelectedNote(data.note)
    } catch {}
    finally { setPanelLoading(false) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/brain/${id}`, { method: "DELETE" })
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (searchResults) setSearchResults((prev) => prev ? prev.filter((n) => n.id !== id) : null)
      if (selectedNote?.id === id) setSelectedNote(null)
    } catch {}
    finally { setDeletingId(null) }
  }

  const displayNotes = searchResults !== null ? searchResults : notes
  const filteredNotes =
    categoryFilter === "all"
      ? displayNotes
      : displayNotes.filter((n) => n.category === categoryFilter)

  const categoryCounts = notes.reduce<Record<string, number>>((acc, n) => {
    const cat = n.category || "other"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
        <Button
          onClick={fetchNotes}
          variant="ghost"
          className="gap-1.5 text-sm text-gray-500 h-9 rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Header */}
      <section className="pt-6 pb-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "#ede9fe" }}
            >
              <Brain className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Second Brain</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {notes.length} {notes.length === 1 ? "note" : "notes"} saved
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 pb-16 max-w-7xl mx-auto space-y-5">
        {/* Save input */}
        <motion.div
          initial={fadeUp.hidden}
          animate={fadeUp.visible}
          transition={{ ...transition, delay: 0.05 }}
          className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4" style={{ color: ACCENT }} />
            <span className="text-sm font-semibold text-gray-800">Save to Brain</span>
          </div>
          <Textarea
            value={saveContent}
            onChange={(e) => setSaveContent(e.target.value)}
            placeholder="Paste anything — notes, articles, ideas, URLs, meeting notes, research…"
            className="min-h-[120px] text-sm resize-none border-[#e8edf5] rounded-xl focus-visible:ring-1"
            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
          />
          <div className="flex items-center gap-3 mt-3">
            <Input
              value={saveSource}
              onChange={(e) => setSaveSource(e.target.value)}
              placeholder="Source URL (optional)"
              className="text-sm border-[#e8edf5] rounded-xl h-9 flex-1"
            />
            <Button
              onClick={handleSave}
              disabled={saving || !saveContent.trim()}
              className="h-9 px-5 rounded-xl text-white text-sm font-semibold gap-2 shrink-0"
              style={{ background: ACCENT }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save to Brain"}
            </Button>
          </div>
        </motion.div>

        {/* Search + Ask row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Search */}
          <motion.div
            initial={fadeUp.hidden}
            animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" style={{ color: ACCENT }} />
              <span className="text-sm font-semibold text-gray-800">Search Notes</span>
              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 ml-auto" />}
              {searchResults !== null && !searching && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchResults(null) }}
                  className="ml-auto text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, topic, or concept…"
              className="text-sm border-[#e8edf5] rounded-xl h-9"
            />
            {searchResults !== null && (
              <p className="text-xs text-gray-400 mt-2">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
              </p>
            )}
          </motion.div>

          {/* Ask */}
          <motion.div
            initial={fadeUp.hidden}
            animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.15 }}
            className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
              <span className="text-sm font-semibold text-gray-800">Ask Your Brain</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask a question across all your notes…"
                className="text-sm border-[#e8edf5] rounded-xl h-9 flex-1"
              />
              <Button
                onClick={handleAsk}
                disabled={asking || !askQuery.trim()}
                className="h-9 px-4 rounded-xl text-white text-sm font-semibold shrink-0"
                style={{ background: ACCENT }}
              >
                {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <AnimatePresence>
              {askAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div
                    className="rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap"
                    style={{ background: "#faf5ff", border: "1px solid #ede9fe" }}
                  >
                    {askAnswer}
                  </div>
                  {askRelevant.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Based on {askRelevant.length} note{askRelevant.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Category filter tabs */}
        <motion.div
          initial={fadeUp.hidden}
          animate={fadeUp.visible}
          transition={{ ...transition, delay: 0.2 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {ALL_CATEGORIES.map((cat) => {
            const count = cat === "all" ? notes.length : (categoryCounts[cat] || 0)
            const active = categoryFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={
                  active
                    ? { background: ACCENT, color: "#fff" }
                    : { background: "#fff", color: "#6b7280", border: "1px solid #e8edf5" }
                }
              >
                {cat !== "all" && CATEGORY_ICONS[cat]}
                {cat}
                {count > 0 && (
                  <span
                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={active ? { background: "rgba(255,255,255,0.25)", color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>

        {/* Notes grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm py-20 text-center">
            <Brain className="w-10 h-10 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-sm">
              {searchResults !== null
                ? "No matching notes found"
                : categoryFilter !== "all"
                ? `No ${categoryFilter} notes yet`
                : "Your Second Brain is empty — start saving notes above"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredNotes.map((note, i) => {
                const catColor = CATEGORY_COLORS[note.category || "other"] || CATEGORY_COLORS.other
                const isRelevant = askRelevant.includes(note.id)
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white border rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3"
                    style={{
                      borderColor: isRelevant ? ACCENT : "#e8edf5",
                      boxShadow: isRelevant ? `0 0 0 2px ${ACCENT}22` : undefined,
                    }}
                    onClick={() => openNote(note.id)}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                          style={{ backgroundColor: catColor.bg, color: catColor.text }}
                        >
                          {CATEGORY_ICONS[note.category || "other"]}
                        </span>
                        <span className="text-xs font-medium capitalize" style={{ color: catColor.text }}>
                          {note.category || "other"}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                        disabled={deletingId === note.id}
                        className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                      >
                        {deletingId === note.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {note.title}
                    </h3>

                    {/* Summary */}
                    {note.summary && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {note.summary}
                      </p>
                    )}

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {note.tags.slice(0, 4).map((tag) => {
                          const tc = tagColor(tag)
                          return (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: tc.bg, color: tc.text }}
                            >
                              {tag}
                            </span>
                          )
                        })}
                        {note.tags.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{note.tags.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {isRelevant && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#ede9fe", color: ACCENT }}>
                          Relevant
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Side panel */}
      <AnimatePresence>
        {selectedNote && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelectedNote(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg z-50 bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edf5]">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="text-sm font-semibold text-gray-800">Note Detail</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/brain/${selectedNote.id}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e8edf5] text-gray-600 hover:border-gray-400 transition-colors"
                  >
                    Full page
                  </Link>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {panelLoading && !selectedNote.content ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {/* Category badge */}
                  {selectedNote.category && (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                        style={{ backgroundColor: (CATEGORY_COLORS[selectedNote.category] || CATEGORY_COLORS.other).bg, color: (CATEGORY_COLORS[selectedNote.category] || CATEGORY_COLORS.other).text }}
                      >
                        {CATEGORY_ICONS[selectedNote.category]}
                        {selectedNote.category}
                      </span>
                      {selectedNote.source && (
                        <a
                          href={selectedNote.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-gray-700 underline truncate max-w-[200px]"
                        >
                          {selectedNote.source}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                    {selectedNote.title}
                  </h2>

                  {/* Summary */}
                  {selectedNote.summary && (
                    <div className="rounded-xl p-3" style={{ background: "#faf5ff", border: "1px solid #ede9fe" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: ACCENT }}>Summary</p>
                      <p className="text-sm text-gray-700">{selectedNote.summary}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedNote.tags && selectedNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNote.tags.map((tag) => {
                        const tc = tagColor(tag)
                        return (
                          <span
                            key={tag}
                            className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ background: tc.bg, color: tc.text }}
                          >
                            #{tag}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Full content */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Content</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedNote.content}
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-gray-400">
                    Saved {new Date(selectedNote.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  {/* Delete */}
                  <Button
                    onClick={() => handleDelete(selectedNote.id)}
                    disabled={deletingId === selectedNote.id}
                    variant="outline"
                    className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400 rounded-xl"
                  >
                    {deletingId === selectedNote.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete Note
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
