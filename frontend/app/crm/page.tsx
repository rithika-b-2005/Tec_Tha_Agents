"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, RefreshCw, Mail, Globe, MapPin, Building2, Star, ExternalLink, X, ChevronRight,
  Activity, Clock, CheckCircle2, AlertCircle, FileText, GitMerge, Sparkles, CheckSquare,
  ArrowRight, Search, Filter, Download, Zap, Trash2, Calendar, Wand2, UserPlus
} from "lucide-react"
import Header from "@/app/components/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { getSuggestions } from "@/lib/next-step-suggestions"
import { getSignalCategory } from "@/lib/need-signal-score"

interface CrmTask {
  id: string
  title: string
  description?: string | null
  taskType: string
  scheduledAt: string
  completedAt?: string | null
}

interface Activity {
  id: string
  type: string
  summary: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  website: string | null
  location: string | null
  industry: string | null
  linkedinUrl: string | null
  score: number | null
  icpLabel: string | null
  needSignals: string | null
  companyBio: string | null
  emailSubject: string | null
  emailBody: string | null
  notes: string | null
  pipelineStage: string
  sources: string[]
  lastContactedAt: string | null
  createdAt: string
  activities: Activity[]
  tasks?: CrmTask[]
}

type StageFilter = "all" | "new" | "contacted" | "replied" | "qualified" | "proposal" | "won" | "lost" | "duplicates"

interface Toast {
  message: string
  type: "success" | "error" | "info"
}

interface DuplicateGroup {
  primaryId: string
  duplicateIds: string[]
  count: number
}

interface DedupData {
  totalDuplicateGroups: number
  totalDuplicates: number
  groups: DuplicateGroup[]
}

const stages: { key: StageFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "🆕 New" },
  { key: "contacted", label: "📞 Contacted" },
  { key: "replied", label: "💬 Replied" },
  { key: "qualified", label: "🎯 Qualified" },
  { key: "proposal", label: "📄 Proposal" },
  { key: "won", label: "✅ Won" },
  { key: "lost", label: "❌ Lost" },
  { key: "duplicates", label: "🔀 Duplicates" },
]

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  contacted: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  replied: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  qualified: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  proposal: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  won: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
  lost: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" },
}

const sourceColors: Record<string, string> = {
  leads: "text-blue-600 bg-blue-50 border-blue-200",
  marketing: "text-purple-600 bg-purple-50 border-purple-200",
  sales: "text-green-600 bg-green-50 border-green-200",
  manual: "text-gray-600 bg-gray-50 border-gray-200",
}

const signalColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-600" },
  high: { bg: "bg-orange-50", text: "text-orange-600" },
  medium: { bg: "bg-amber-50", text: "text-amber-600" },
  low: { bg: "bg-blue-50", text: "text-blue-600" },
}

const activityIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4 text-blue-500" />,
  stage_change: <ArrowRight className="h-4 w-4 text-purple-500" />,
  note: <FileText className="h-4 w-4 text-gray-500" />,
  task_created: <CheckSquare className="h-4 w-4 text-teal-500" />,
  task_completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  merge: <GitMerge className="h-4 w-4 text-orange-500" />,
  enrich: <Sparkles className="h-4 w-4 text-yellow-500" />,
  manual_create: <UserPlus className="h-4 w-4 text-indigo-500" />,
}

export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [stageFilter, setStageFilter] = useState<StageFilter>("all")
  const [search, setSearch] = useState("")
  const [icpFilter, setIcpFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<Toast | null>(null)
  const [dedupData, setDedupData] = useState<DedupData | null>(null)
  const [merging, setMerging] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesValue, setNotesValue] = useState("")
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDate, setTaskDate] = useState("")
  const [bulkStageAction, setBulkStageAction] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingLead, setAddingLead] = useState(false)
  const [addForm, setAddForm] = useState({
    name: "", email: "", company: "", phone: "",
    location: "", industry: "", website: "", linkedinUrl: "", notes: "",
  })

  useEffect(() => {
    fetchContacts()
  }, [stageFilter, search, icpFilter, sourceFilter])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchContacts() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (stageFilter && stageFilter !== "all" && stageFilter !== "duplicates") {
        params.append("stage", stageFilter)
      }
      if (icpFilter && icpFilter !== "all") {
        params.append("icpLabel", icpFilter)
      }
      if (sourceFilter && sourceFilter !== "all") {
        params.append("source", sourceFilter)
      }
      if (search && search.trim()) {
        params.append("search", search)
      }

      const res = await fetch(`/api/crm?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setContacts(data.contacts || [])

      if (stageFilter === "duplicates") {
        fetchDedupData()
      }
    } catch (err) {
      console.error("Error fetching contacts:", err)
      showToast("Failed to load contacts", "error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchDedupData() {
    try {
      const res = await fetch("/api/crm/dedup")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDedupData(data)
    } catch (err) {
      console.error("Error fetching dedup:", err)
      showToast("Failed to load duplicates", "error")
    }
  }

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type })
  }

  async function handleSync() {
    try {
      setSyncing(true)
      const res = await fetch("/api/crm/sync", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Sync failed")
      const data = await res.json()
      showToast(`Synced: ${data.created} created, ${data.updated} updated`, "success")
      await fetchContacts()
    } catch (err) {
      console.error("Sync error:", err)
      showToast("Sync failed", "error")
    } finally {
      setSyncing(false)
    }
  }

  async function handleUpdateStage(contactId: string, newStage: string) {
    try {
      const res = await fetch(`/api/crm/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      })
      if (!res.ok) throw new Error("Failed to update")
      const data = await res.json()
      if (selectedContact?.id === contactId) {
        setSelectedContact(data.contact)
      }
      await fetchContacts()
      showToast("Stage updated", "success")
    } catch (err) {
      console.error("Error updating stage:", err)
      showToast("Failed to update stage", "error")
    }
  }

  async function handleBulkAction(action: string) {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch("/api/crm/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          contactIds: Array.from(selectedIds),
          data: action === "update-stage" ? { stage: bulkStageAction } : undefined,
        }),
      })
      if (!res.ok) throw new Error("Bulk action failed")
      showToast(`${selectedIds.size} contacts updated`, "success")
      setSelectedIds(new Set())
      setBulkStageAction(null)
      await fetchContacts()
    } catch (err) {
      console.error("Bulk action error:", err)
      showToast("Bulk action failed", "error")
    }
  }

  async function handleSendEmail(contactId: string, to: string, subject: string, emailBody: string) {
    try {
      setSendingEmail(true)
      const res = await fetch(`/api/crm/${contactId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, emailBody }),
      })
      if (!res.ok) throw new Error("Failed to send")
      showToast("Email sent!", "success")
      const updated = await fetch(`/api/crm/${contactId}`).then(r => r.json())
      setSelectedContact(updated.contact)
      await fetchContacts()
    } catch (err) {
      console.error("Email error:", err)
      showToast("Failed to send email", "error")
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleEnrich(contactId: string) {
    try {
      setEnriching(true)
      const res = await fetch(`/api/crm/${contactId}/enrich`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Enrichment failed")
      const data = await res.json()
      showToast("Enrichment complete", "success")
      setSelectedContact(data.contact)
      await fetchContacts()
    } catch (err) {
      console.error("Enrich error:", err)
      showToast("Enrichment failed", "error")
    } finally {
      setEnriching(false)
    }
  }

  async function handleSendWhatsApp(contactId: string) {
    try {
      setSendingWhatsApp(true)
      const res = await fetch(`/api/crm/${contactId}/whatsapp`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      showToast("WhatsApp message sent!", "success")
      const updated = await fetch(`/api/crm/${contactId}`).then(r => r.json())
      setSelectedContact(updated.contact)
      await fetchContacts()
    } catch (err: any) {
      console.error("WhatsApp error:", err)
      showToast(err.message || "Failed to send WhatsApp", "error")
    } finally {
      setSendingWhatsApp(false)
    }
  }

  async function handleGenerateEmail(contactId: string) {
    try {
      setGeneratingEmail(true)
      const res = await fetch(`/api/crm/${contactId}/generate-email`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      setSelectedContact(data.contact)
      showToast("Email generated!", "success")
    } catch (err) {
      console.error("Generate email error:", err)
      showToast("Failed to generate email", "error")
    } finally {
      setGeneratingEmail(false)
    }
  }

  async function handleUpdateNotes(contactId: string, notes: string) {
    try {
      const res = await fetch(`/api/crm/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error("Failed to update")
      const data = await res.json()
      setSelectedContact(data.contact)
      setNotesEditing(false)
      showToast("Notes saved", "success")
    } catch (err) {
      console.error("Update notes error:", err)
      showToast("Failed to save notes", "error")
    }
  }

  async function handleCreateTask(contactId: string) {
    if (!taskTitle.trim() || !taskDate) return
    try {
      const res = await fetch(`/api/crm/${contactId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          scheduledAt: new Date(taskDate).toISOString(),
          taskType: "follow_up",
        }),
      })
      if (!res.ok) throw new Error("Failed to create task")
      const updated = await fetch(`/api/crm/${contactId}`).then(r => r.json())
      setSelectedContact(updated.contact)
      setTaskTitle("")
      setTaskDate("")
      setCreatingTask(false)
      showToast("Task created", "success")
    } catch (err) {
      console.error("Create task error:", err)
      showToast("Failed to create task", "error")
    }
  }

  async function handleCompleteTask(contactId: string, taskId: string) {
    try {
      const res = await fetch(`/api/crm/${contactId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error("Failed to complete task")
      const updated = await fetch(`/api/crm/${contactId}`).then(r => r.json())
      setSelectedContact(updated.contact)
      showToast("Task completed", "success")
    } catch (err) {
      console.error("Complete task error:", err)
      showToast("Failed to complete task", "error")
    }
  }

  async function handleMergeDuplicates(primaryId: string, mergeIds: string[]) {
    try {
      setMerging(primaryId)
      const res = await fetch("/api/crm/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, mergeIds }),
      })
      if (!res.ok) throw new Error("Merge failed")
      showToast(`Merged ${mergeIds.length} duplicates`, "success")
      await fetchDedupData()
      await fetchContacts()
    } catch (err) {
      console.error("Merge error:", err)
      showToast("Merge failed", "error")
    } finally {
      setMerging(null)
    }
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams()
      if (stageFilter && stageFilter !== "all" && stageFilter !== "duplicates") {
        params.append("stage", stageFilter)
      }
      if (icpFilter && icpFilter !== "all") {
        params.append("icpLabel", icpFilter)
      }
      if (sourceFilter && sourceFilter !== "all") {
        params.append("source", sourceFilter)
      }

      const url = `/api/crm/export?${params.toString()}`
      const link = document.createElement("a")
      link.href = url
      link.download = `crm-contacts-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      showToast("Export started", "success")
    } catch (err) {
      console.error("Export error:", err)
      showToast("Export failed", "error")
    }
  }

  async function handleAddLead() {
    if (!addForm.name.trim()) return
    try {
      setAddingLead(true)
      const res = await fetch("/api/crm/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (!res.ok) throw new Error("Failed to create")
      showToast("Lead added! Open it to generate email.", "success")
      setShowAddModal(false)
      setAddForm({ name: "", email: "", company: "", phone: "", location: "", industry: "", website: "", linkedinUrl: "", notes: "" })
      await fetchContacts()
    } catch (err) {
      console.error("Add lead error:", err)
      showToast("Failed to add lead", "error")
    } finally {
      setAddingLead(false)
    }
  }

  const stats = useMemo(() => ({
    total: contacts.length,
    hotUncontacted: contacts.filter(c => c.icpLabel === "Hot" && c.pipelineStage === "new").length,
    contacted: contacts.filter(c => c.pipelineStage === "contacted").length,
    won: contacts.filter(c => c.pipelineStage === "won").length,
  }), [contacts])

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const handleSelectContact = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const displayContacts = stageFilter === "duplicates" ? [] : contacts
  const duplicateGroups = dedupData?.groups || []

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-white z-50 ${
                toast.type === "success" ? "bg-green-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500"
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Link href="/workflow" className="text-[#7a8899] hover:text-[#276ef1] text-sm mb-4 inline-block">
            ← Back to Workflow
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">CRM Dashboard</h1>
              <p className="text-gray-600 text-sm">Unified contact management — merged leads, smart pipeline, bulk actions & enrichment</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                className="rounded-xl border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400"
              >
                <Download className="mr-2 h-4 w-4 text-gray-500" />
                Export
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="rounded-xl border-indigo-300 text-indigo-600 hover:text-indigo-900 hover:border-indigo-400 hover:bg-indigo-50"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-[#276ef1] hover:bg-[#1e55d4] text-white rounded-xl flex-shrink-0"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync All"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {[
            { label: "Total", value: stats.total, color: "text-gray-900" },
            { label: "Hot Uncontacted", value: stats.hotUncontacted, color: "text-red-500" },
            { label: "Contacted", value: stats.contacted, color: "text-blue-600" },
            { label: "Won", value: stats.won, color: "text-green-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#e8edf5] rounded-xl px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Stage Tabs */}
        <motion.div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {stages.map((stage) => (
            <button
              key={stage.key}
              onClick={() => {
                setStageFilter(stage.key)
                setSelectedIds(new Set())
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                stageFilter === stage.key
                  ? "bg-[#276ef1] text-white"
                  : "bg-white border border-[#e0e0e0] text-gray-600 hover:bg-gray-50"
              }`}
            >
              {stage.label}
            </button>
          ))}
        </motion.div>

        {/* Filters & Search (hidden for duplicates view) */}
        {stageFilter !== "duplicates" && (
          <motion.div className="mb-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, company, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-300"
              />
            </div>
            <Select
              value={icpFilter}
              onChange={(e) => setIcpFilter(e.target.value)}
              options={[
                { value: "all", label: "All ICP" },
                { value: "Hot", label: "Hot" },
                { value: "Warm", label: "Warm" },
                { value: "Cold", label: "Cold" },
              ]}
              className="w-20 flex-shrink-0"
            />
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={[
                { value: "all", label: "All Sources" },
                { value: "leads", label: "Leads" },
                { value: "marketing", label: "Marketing" },
                { value: "sales", label: "Sales" },
              ]}
              className="w-24 flex-shrink-0"
            />
          </motion.div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3"
          >
            <span className="text-sm font-medium text-blue-900">{selectedIds.size} selected</span>
            <Select
              value={bulkStageAction || ""}
              onChange={(e) => setBulkStageAction(e.target.value)}
              options={[
                { value: "", label: "Move to stage..." },
                { value: "new", label: "new" },
                { value: "contacted", label: "contacted" },
                { value: "replied", label: "replied" },
                { value: "qualified", label: "qualified" },
                { value: "proposal", label: "proposal" },
                { value: "won", label: "won" },
                { value: "lost", label: "lost" },
              ]}
              className="w-auto min-w-40 text-sm"
            />
            <button
              onClick={() => handleBulkAction("update-stage")}
              disabled={!bulkStageAction}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Apply
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-blue-600 hover:text-blue-900 text-sm"
            >
              Clear
            </button>
          </motion.div>
        )}

        {/* Duplicates View */}
        {stageFilter === "duplicates" && dedupData && (
          <motion.div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {dedupData.totalDuplicateGroups === 0 ? (
              <div className="p-8 text-center text-gray-500">No duplicates found</div>
            ) : (
              <div className="divide-y divide-[#f0f2f5]">
                {duplicateGroups.map((group) => (
                  <div key={group.primaryId} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">Duplicate group ({group.count} total)</p>
                        <p className="text-sm text-gray-500">Merge these contacts into one</p>
                      </div>
                      <button
                        onClick={() => handleMergeDuplicates(group.primaryId, group.duplicateIds)}
                        disabled={merging === group.primaryId}
                        className="px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        {merging === group.primaryId ? "Merging..." : "Merge All"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[group.primaryId, ...group.duplicateIds].map((id) => {
                        const contact = contacts.find(c => c.id === id) || dedupData
                        return (
                          <div key={id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <p className="font-medium text-gray-900">{typeof contact !== "string" && "name" in contact ? (contact as any).name : "..."}</p>
                            <p className="text-sm text-gray-600">{typeof contact !== "string" && "company" in contact ? (contact as any).company : "—"}</p>
                            <p className="text-sm text-gray-500 mt-2">{typeof contact !== "string" && "email" in contact ? (contact as any).email : "—"}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Contacts Table */}
        {stageFilter !== "duplicates" && (
          <motion.div className="bg-white border border-[#e8edf5] rounded-2xl shadow-sm overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading contacts...</div>
            ) : displayContacts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No contacts found. Sync leads to get started.</div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-[#e8edf5]">
                    <tr>
                      <th className="px-4 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === displayContacts.length && displayContacts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Name / Company</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Score</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Sources</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Stage</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f5]">
                    {displayContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(contact.id)}
                            onChange={() => handleSelectContact(contact.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-500">{contact.company || "—"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-[#276ef1] hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                            contact.icpLabel === "Hot" ? "bg-red-50 text-red-600" :
                            contact.icpLabel === "Warm" ? "bg-amber-50 text-amber-600" :
                            contact.icpLabel === "Cold" ? "bg-sky-50 text-sky-600" :
                            "bg-gray-50 text-gray-400"
                          }`}>
                            {contact.score ? `${contact.score}/100` : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-1 flex-wrap">
                            {contact.sources.map((source) => (
                              <Badge key={source} className={`border ${sourceColors[source]}`} variant="outline">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${stageColors[contact.pipelineStage].bg} ${stageColors[contact.pipelineStage].text} border ${stageColors[contact.pipelineStage].border}`} variant="outline">
                            {contact.pipelineStage}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedContact(contact)
                              setNotesValue(contact.notes || "")
                            }}
                            className="text-[#276ef1] hover:text-[#1e55d4] transition-colors"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedContact && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedContact(null)}
        />
      )}
      {selectedContact && (
        <motion.div
          className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto scrollbar-hide"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedContact.name}</p>
                {selectedContact.company && <p className="text-xs text-gray-400 truncate">{selectedContact.company}</p>}
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {selectedContact.icpLabel && (
                <Badge className={`${selectedContact.icpLabel === "Hot" ? "bg-red-50 text-red-600 border-red-200" : selectedContact.icpLabel === "Warm" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-sky-50 text-sky-600 border-sky-200"} border`} variant="outline">
                  {selectedContact.icpLabel}
                </Badge>
              )}
              {selectedContact.needSignals && (
                <Badge className={`${signalColors[getSignalCategory(selectedContact.needSignals)].bg} ${signalColors[getSignalCategory(selectedContact.needSignals)].text} border`} variant="outline">
                  Signal: {getSignalCategory(selectedContact.needSignals)}
                </Badge>
              )}
              <Badge className={`${stageColors[selectedContact.pipelineStage].bg} ${stageColors[selectedContact.pipelineStage].text} border ${stageColors[selectedContact.pipelineStage].border}`} variant="outline">
                {selectedContact.pipelineStage}
              </Badge>
              {selectedContact.sources.map((source) => (
                <Badge key={source} className={`border ${sourceColors[source]}`} variant="outline">
                  {source}
                </Badge>
              ))}
            </div>

            {/* Next Step Suggestions */}
            {getSuggestions({
              email: selectedContact.email,
              pipelineStage: selectedContact.pipelineStage,
              icpLabel: selectedContact.icpLabel,
              needSignals: selectedContact.needSignals,
              score: selectedContact.score,
              lastContactedAt: selectedContact.lastContactedAt ? new Date(selectedContact.lastContactedAt) : null,
            }).length > 0 && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 text-sm mb-3">Suggested Next Steps</h3>
                  <div className="space-y-2">
                    {getSuggestions({
                      email: selectedContact.email,
                      pipelineStage: selectedContact.pipelineStage,
                      icpLabel: selectedContact.icpLabel,
                      needSignals: selectedContact.needSignals,
                      score: selectedContact.score,
                      lastContactedAt: selectedContact.lastContactedAt ? new Date(selectedContact.lastContactedAt) : null,
                    }).slice(0, 2).map((sugg, i) => (
                      <div key={i} className="text-sm text-blue-800">
                        <p className="font-medium">{sugg.title}</p>
                        <p className="text-xs text-blue-700">{sugg.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator className="mb-6" />

            {/* Contact Info */}
            <div className="space-y-4 mb-6">
              {selectedContact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#276ef1]" />
                  <a href={`mailto:${selectedContact.email}`} className="text-[#276ef1] hover:underline text-sm break-all">
                    {selectedContact.email}
                  </a>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#276ef1]" />
                  <span className="text-sm text-gray-600">{selectedContact.location}</span>
                </div>
              )}
              {selectedContact.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-[#276ef1]" />
                  <a href={selectedContact.website} target="_blank" rel="noopener noreferrer" className="text-[#276ef1] hover:underline text-sm truncate">
                    {selectedContact.website}
                  </a>
                </div>
              )}
              {selectedContact.linkedinUrl && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-[#276ef1]" />
                  <a href={selectedContact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#276ef1] hover:underline text-sm truncate">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>

            {/* Need Signals */}
            {selectedContact.needSignals && (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-amber-900 text-sm mb-2">Need Signals</h3>
                  <p className="text-sm text-amber-800">{selectedContact.needSignals}</p>
                </div>
              </>
            )}

            {/* Email Draft */}
            <Separator className="bg-[#f0f2f5] mb-5" />
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cold Email</p>
                <button
                  onClick={() => handleGenerateEmail(selectedContact.id)}
                  disabled={generatingEmail}
                  className="flex items-center gap-1 text-xs text-[#276ef1] hover:underline disabled:opacity-50"
                >
                  <Wand2 className="h-3 w-3" />
                  {generatingEmail ? "Generating..." : selectedContact.emailSubject ? "Regenerate" : "Generate"}
                </button>
              </div>

              {selectedContact.emailSubject && selectedContact.emailBody ? (
                <div className="bg-[#f9fafb] border border-[#e8edf5] rounded-xl p-4 space-y-3">
                  <div className="space-y-1 text-sm border-b border-[#f0f2f5] pb-3">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-14 shrink-0">To:</span>
                      <span className="text-gray-900">{selectedContact.email ?? selectedContact.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-14 shrink-0">Subject:</span>
                      <span className="text-gray-900 font-medium">{selectedContact.emailSubject}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selectedContact.emailBody}</p>
                  <div className="flex gap-2">
                    {selectedContact.email ? (
                      <button
                        onClick={() => handleSendEmail(selectedContact.id, selectedContact.email!, selectedContact.emailSubject!, selectedContact.emailBody!)}
                        disabled={sendingEmail}
                        className="flex-1 h-9 rounded-lg bg-[#276ef1] hover:bg-[#1e55d4] text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {sendingEmail ? "Sending..." : "Send Email"}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400 flex-1 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> No email address
                      </p>
                    )}
                    {selectedContact.phone && (
                      <button
                        onClick={() => handleSendWhatsApp(selectedContact.id)}
                        disabled={sendingWhatsApp}
                        className="flex-1 h-9 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.528 5.857L0 24l6.336-1.504A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.013-1.376l-.36-.214-3.727.884.939-3.627-.235-.372A9.785 9.785 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                        </svg>
                        {sendingWhatsApp ? "Sending..." : "WhatsApp"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#f9fafb] border border-[#e8edf5] rounded-xl px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No email draft yet.</p>
                  <p className="text-xs text-gray-400 mt-0.5">Click <span className="text-[#276ef1]">Generate</span> to create one with AI.</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Notes</h3>
              {notesEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes..."
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNotes(selectedContact.id, notesValue)}
                      className="px-3 py-2 bg-[#276ef1] text-white text-sm rounded hover:bg-[#1e55d4]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setNotesEditing(false)
                        setNotesValue(selectedContact.notes || "")
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setNotesEditing(true)}
                  className="text-sm text-gray-600 bg-gray-50 p-3 rounded cursor-pointer hover:bg-gray-100 min-h-12"
                >
                  {selectedContact.notes || "Click to add notes..."}
                </div>
              )}
            </div>

            {/* Enrich Button */}
            <Button
              onClick={() => handleEnrich(selectedContact.id)}
              disabled={enriching}
              className="w-full mb-6 bg-[#276ef1] hover:bg-[#1e55d4] text-white"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {enriching ? "Enriching..." : "Enrich Contact"}
            </Button>

            {/* Stage Changer */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Update Stage</h3>
              <div className="grid grid-cols-2 gap-2">
                {["new", "contacted", "replied", "qualified", "proposal", "won", "lost"].map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleUpdateStage(selectedContact.id, stage)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedContact.pipelineStage === stage
                        ? `${stageColors[stage].bg} ${stageColors[stage].text} border ${stageColors[stage].border}`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <Separator className="my-6" />
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Tasks</h3>
            <div className="space-y-3 mb-6">
              {(!selectedContact.tasks || selectedContact.tasks.length === 0) ? (
                <p className="text-sm text-gray-500">No tasks yet</p>
              ) : (
                selectedContact.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 text-sm border border-gray-200 p-3 rounded-lg">
                    <button
                      onClick={() => handleCompleteTask(selectedContact.id, task.id)}
                      className="pt-0.5"
                    >
                      <CheckSquare className="h-4 w-4 text-gray-400 hover:text-green-500" />
                    </button>
                    <div className="flex-1">
                      <p className="text-gray-700">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(task.scheduledAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {creatingTask ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Task title..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="text-sm"
                  />
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateTask(selectedContact.id)}
                      className="px-3 py-2 bg-[#276ef1] text-white text-sm rounded hover:bg-[#1e55d4]"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingTask(false)
                        setTaskTitle("")
                        setTaskDate("")
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingTask(true)}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              )}
            </div>

            {/* Activity Log */}
            <Separator className="my-6" />
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Activity</h3>
            <div className="space-y-3">
              {selectedContact.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet</p>
              ) : (
                selectedContact.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="flex-shrink-0 pt-0.5">
                      {activityIcons[activity.type] || <Activity className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700">{activity.summary}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.createdAt).toLocaleDateString()} {new Date(activity.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Add Lead Manually</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="Full name"
                      value={addForm.name}
                      onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <Input
                      placeholder="email@company.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                    <Input
                      placeholder="Company name"
                      value={addForm.company}
                      onChange={(e) => setAddForm(f => ({ ...f, company: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <Input
                      placeholder="+1 234 567 8900"
                      value={addForm.phone}
                      onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <Input
                      placeholder="City, Country"
                      value={addForm.location}
                      onChange={(e) => setAddForm(f => ({ ...f, location: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                    <Input
                      placeholder="e.g. SaaS, Fintech"
                      value={addForm.industry}
                      onChange={(e) => setAddForm(f => ({ ...f, industry: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                    <Input
                      placeholder="https://company.com"
                      value={addForm.website}
                      onChange={(e) => setAddForm(f => ({ ...f, website: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn</label>
                    <Input
                      placeholder="linkedin.com/in/..."
                      value={addForm.linkedinUrl}
                      onChange={(e) => setAddForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <Textarea
                    placeholder="Any additional context..."
                    value={addForm.notes}
                    onChange={(e) => setAddForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="border-gray-300 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <Wand2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-xs text-indigo-700">After adding, open the contact to AI-generate a cold email.</p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={addingLead || !addForm.name.trim()}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {addingLead ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add Lead
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
