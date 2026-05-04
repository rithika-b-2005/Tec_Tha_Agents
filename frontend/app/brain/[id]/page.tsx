"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  BookOpen,
  ArrowLeft,
  Tag,
  Lightbulb,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
  MessageSquare,
  Search,
  Save,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  content: string
  summary: string | null
  tags: string[]
  category: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

interface RelatedNote {
  id: string
  title: string
  summary: string | null
  tags: string[]
  category: string | null
  createdAt: string
}

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [note, setNote] = useState<BrainNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<RelatedNote[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [savingTitle, setSavingTitle] = useState(false)

  const [editingTags, setEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [tagsDraft, setTagsDraft] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)

  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/brain/${id}`)
        const data = await res.json()
        if (data.note) {
          setNote(data.note)
          setTitleDraft(data.note.title)
          setTagsDraft(data.note.tags || [])
          // Fetch related notes using tags
          if (data.note.tags && data.note.tags.length > 0) {
            fetchRelated(data.note.tags.join(" "), data.note.id)
          }
        }
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [id])

  async function fetchRelated(query: string, currentId: string) {
    setRelatedLoading(true)
    try {
      const res = await fetch("/api/brain/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      const results = (data.results || []).filter((n: RelatedNote) => n.id !== currentId).slice(0, 6)
      setRelated(results)
    } catch {}
    finally { setRelatedLoading(false) }
  }

  async function saveTitle() {
    if (!titleDraft.trim() || !note) return
    setSavingTitle(true)
    try {
      const res = await fetch(`/api/brain/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      const data = await res.json()
      if (data.note) setNote(data.note)
      setEditingTitle(false)
    } catch {}
    finally { setSavingTitle(false) }
  }

  async function saveTags() {
    if (!note) return
    setSavingTags(true)
    try {
      const res = await fetch(`/api/brain/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagsDraft }),
      })
      const data = await res.json()
      if (data.note) setNote(data.note)
      setEditingTags(false)
    } catch {}
    finally { setSavingTags(false) }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tagsDraft.includes(tag)) {
      setTagsDraft((prev) => [...prev, tag])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTagsDraft((prev) => prev.filter((t) => t !== tag))
  }

  async function handleDelete() {
    if (!note) return
    setDeleting(true)
    try {
      await fetch(`/api/brain/${note.id}`, { method: "DELETE" })
      router.push("/brain")
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
        <Header />
        <div className="pt-20 px-6 max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm">Note not found.</p>
          <Link href="/brain" className="text-sm font-medium mt-2 inline-block" style={{ color: ACCENT }}>
            ← Back to Brain
          </Link>
        </div>
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[note.category || "other"] || CATEGORY_COLORS.other

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      <div className="pt-20 px-6 max-w-4xl mx-auto">
        <Link href="/brain" className="flex items-center gap-1.5 text-sm text-[#7a8899] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Second Brain
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
          {/* Main content */}
          <motion.div
            initial={fadeUp.hidden}
            animate={fadeUp.visible}
            transition={transition}
            className="lg:col-span-2 space-y-5"
          >
            {/* Title card */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-6">
              {/* Category */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                  style={{ backgroundColor: catColor.bg, color: catColor.text }}
                >
                  {CATEGORY_ICONS[note.category || "other"]}
                  {note.category || "other"}
                </span>
                {note.source && (
                  <a
                    href={note.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-700 underline truncate max-w-[250px]"
                  >
                    {note.source}
                  </a>
                )}
              </div>

              {/* Title (inline edit) */}
              {editingTitle ? (
                <div className="flex items-center gap-2 mb-1">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                    className="text-xl font-semibold border-[#e8edf5] rounded-xl"
                    autoFocus
                  />
                  <Button
                    onClick={saveTitle}
                    disabled={savingTitle}
                    className="shrink-0 h-9 px-3 rounded-xl text-white"
                    style={{ background: ACCENT }}
                  >
                    {savingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </Button>
                  <button
                    onClick={() => { setEditingTitle(false); setTitleDraft(note.title) }}
                    className="shrink-0 p-2 text-gray-400 hover:text-gray-700 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-semibold text-gray-900 cursor-pointer hover:text-violet-600 transition-colors mb-1"
                  title="Click to edit"
                  onClick={() => setEditingTitle(true)}
                >
                  {note.title}
                </h1>
              )}

              <p className="text-xs text-gray-400">
                Saved{" "}
                {new Date(note.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Summary */}
            {note.summary && (
              <div
                className="bg-white border rounded-2xl shadow-sm p-5"
                style={{ borderColor: "#ede9fe" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="text-sm font-semibold text-gray-800">AI Summary</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{note.summary}</p>
              </div>
            )}

            {/* Full content */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4" style={{ color: ACCENT }} />
                <span className="text-sm font-semibold text-gray-800">Content</span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </div>
            </div>

            {/* Delete */}
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="outline"
              className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400 rounded-xl"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Note
            </Button>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={fadeUp.hidden}
            animate={fadeUp.visible}
            transition={{ ...transition, delay: 0.1 }}
            className="space-y-5"
          >
            {/* Tags (inline edit) */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="text-sm font-semibold text-gray-800">Tags</span>
                </div>
                {!editingTags ? (
                  <button
                    onClick={() => setEditingTags(true)}
                    className="text-xs font-medium px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={saveTags}
                      disabled={savingTags}
                      className="text-xs font-medium px-2 py-1 rounded-lg text-white transition-colors"
                      style={{ background: ACCENT }}
                    >
                      {savingTags ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditingTags(false); setTagsDraft(note.tags || []) }}
                      className="text-xs font-medium px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {(editingTags ? tagsDraft : note.tags || []).map((tag) => {
                  const tc = tagColor(tag)
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: tc.bg, color: tc.text }}
                    >
                      #{tag}
                      {editingTags && (
                        <button onClick={() => removeTag(tag)} className="hover:opacity-60 ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  )
                })}
                {(editingTags ? tagsDraft : note.tags || []).length === 0 && (
                  <span className="text-xs text-gray-400">No tags</span>
                )}
              </div>

              {editingTags && (
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="Add tag…"
                    className="text-xs border-[#e8edf5] rounded-xl h-8 flex-1"
                  />
                  <Button
                    onClick={addTag}
                    className="h-8 px-3 rounded-xl text-white text-xs"
                    style={{ background: ACCENT }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* Related notes */}
            <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                <span className="text-sm font-semibold text-gray-800">Related Notes</span>
                {relatedLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-auto" />}
              </div>

              {!relatedLoading && related.length === 0 && (
                <p className="text-xs text-gray-400">No related notes found.</p>
              )}

              <div className="space-y-2">
                <AnimatePresence>
                  {related.map((r, i) => {
                    const rc = CATEGORY_COLORS[r.category || "other"] || CATEGORY_COLORS.other
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link
                          href={`/brain/${r.id}`}
                          className="block p-3 rounded-xl border border-[#e8edf5] hover:border-violet-200 hover:bg-violet-50/30 transition-all"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="flex items-center justify-center w-5 h-5 rounded text-[10px]"
                              style={{ backgroundColor: rc.bg, color: rc.text }}
                            >
                              {CATEGORY_ICONS[r.category || "other"]}
                            </span>
                            <p className="text-xs font-semibold text-gray-800 line-clamp-1">{r.title}</p>
                          </div>
                          {r.summary && (
                            <p className="text-[10px] text-gray-500 line-clamp-2">{r.summary}</p>
                          )}
                          {r.tags && r.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {r.tags.slice(0, 3).map((tag) => {
                                const tc = tagColor(tag)
                                return (
                                  <span
                                    key={tag}
                                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                    style={{ background: tc.bg, color: tc.text }}
                                  >
                                    {tag}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
