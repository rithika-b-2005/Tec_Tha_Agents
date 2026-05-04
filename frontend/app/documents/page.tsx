"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  Upload,
  ArrowLeft,
  Trash2,
  Loader2,
  File,
  Plus,
  CheckCircle2,
  X,
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fadeUp, transition } from "@/lib/animations"

const ACCENT = "#7c3aed"

interface DocumentItem {
  id: string
  name: string
  type: string
  size: number
  summary?: string
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/documents")
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function handleUpload(file: File) {
    if (!file) return

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "txt"].includes(ext ?? "")) {
      setUploadError("Only PDF and TXT files are supported.")
      return
    }

    setUploading(true)
    setUploadError("")
    setUploadSuccess(false)
    setUploadProgress("Uploading file...")

    try {
      const form = new FormData()
      form.append("file", file)

      setUploadProgress("Extracting text content...")
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Upload failed")
      }

      setUploadProgress("Saving to database...")
      await fetchDocuments()
      setUploadSuccess(true)
      setUploadProgress("")
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setUploadError(msg)
      setUploadProgress("")
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Delete this document?")) return
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" })
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6" }}>
      <Header />

      {/* Top bar */}
      <div className="pt-20 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/workflow" className="flex items-center gap-1.5 text-sm text-[#7a8899]">
          <ArrowLeft className="w-4 h-4" /> Back to Workflow
        </Link>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl text-white text-sm font-semibold gap-2 h-9 cursor-pointer"
          style={{ background: ACCENT }}
          disabled={uploading}
        >
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Header section */}
      <motion.section
        className="pt-6 pb-2 px-6"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={transition}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ede9fe" }}>
              <FileText className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Document Agent</h1>
              <p className="text-sm text-gray-500">
                Upload documents · AI extracts &amp; summarizes · Chat with your files
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Upload zone */}
      <section className="px-6 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative bg-white border-2 border-dashed rounded-2xl py-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              dragOver
                ? "border-violet-400 bg-violet-50"
                : "border-[#e8edf5] hover:border-violet-300 hover:bg-violet-50/30"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: ACCENT }} />
                <p className="text-sm font-medium text-gray-600">{uploadProgress || "Processing..."}</p>
                <p className="text-xs text-gray-400">This may take a moment for large files</p>
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600">Document uploaded successfully!</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#ede9fe" }}>
                  <Upload className="w-7 h-7" style={{ color: ACCENT }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {dragOver ? "Drop your file here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, TXT files supported · Max 10 MB</p>
                </div>
                <Button
                  size="sm"
                  className="mt-1 rounded-lg text-white text-xs font-semibold gap-1.5 pointer-events-none"
                  style={{ background: ACCENT }}
                >
                  <Upload className="w-3.5 h-3.5" /> Choose File
                </Button>
              </>
            )}
          </div>

          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl"
            >
              <X className="w-4 h-4 shrink-0" />
              {uploadError}
              <button onClick={() => setUploadError("")} className="ml-auto">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Documents list */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Stats row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : documents.length === 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={transition}
              className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm py-20 text-center"
            >
              <File className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="text-gray-600 font-medium mb-1">No documents yet</p>
              <p className="text-sm text-gray-400 mb-6">Upload a PDF or text file to get started</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl text-white text-sm font-semibold gap-2 cursor-pointer"
                style={{ background: ACCENT }}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Your First Document
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/documents/${doc.id}`} className="block group">
                    <div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm p-5 hover:border-violet-200 hover:shadow-md transition-all h-full flex flex-col gap-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "#ede9fe" }}
                          >
                            <FileText className="w-4 h-4" style={{ color: ACCENT }} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                            {doc.name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(doc.id, e)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        <TypeBadge type={doc.type} />
                        <span className="text-xs text-gray-400">{formatBytes(doc.size)}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {/* Summary preview */}
                      {doc.summary && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">
                          {doc.summary}
                        </p>
                      )}

                      <div
                        className="text-xs font-semibold flex items-center gap-1 mt-auto"
                        style={{ color: ACCENT }}
                      >
                        Open &amp; Chat →
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
