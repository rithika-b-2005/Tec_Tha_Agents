"use client"

import Link from "next/link"
import Header from "@/app/components/Header"
import { motion } from "framer-motion"
import { fadeUp, transition } from "@/lib/animations"
import { ArrowRight, Megaphone, TrendingUp, Zap, Bot, Sparkles, Globe, Rocket, Users2, FlaskConical, ListChecks, SearchIcon, Network, Briefcase, Phone, CalendarDays } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const ease = [0.22, 1, 0.36, 1] as const

const agents = [
  // — Run Agent agents —
  {
    href:         "/leads",
    generateHref: "/leads/generate",
    icon:         Zap,
    label:        "Lead Gen Agent",
    description:  "Find businesses on Google Maps, enrich with AI, score against your ICP, and write personalized cold emails automatically.",
    features:     ["Automation opportunities", "ICP scoring", "Cold email drafts"],
    accent:       "#276ef1",
    iconBg:       "#eff6ff",
    tagBorder:    "#bfdbfe",
    tagColor:     "#276ef1",
  },
  {
    href:         "/marketing",
    generateHref: "/marketing/generate",
    icon:         Megaphone,
    label:        "Marketing Agent",
    description:  "Discover prospects, generate campaign ideas, content angles, and ad hooks — then send a tailored marketing outreach email.",
    features:     ["Campaign ideas", "Content angles", "Ad copy hooks"],
    accent:       "#a855f7",
    iconBg:       "#faf5ff",
    tagBorder:    "#e9d5ff",
    tagColor:     "#a855f7",
  },
  {
    href:         "/sales",
    generateHref: "/sales/generate",
    icon:         TrendingUp,
    label:        "Sales Agent",
    description:  "Qualify leads by identifying pain points, write a consultative pitch, summarize a proposal, and send a discovery call email.",
    features:     ["Pain point analysis", "Sales pitches", "Proposal summaries"],
    accent:       "#059669",
    iconBg:       "#ecfdf5",
    tagBorder:    "#a7f3d0",
    tagColor:     "#059669",
  },
  {
    href:         "/test",
    generateHref: "/test/generate",
    icon:         FlaskConical,
    label:        "Test Agent",
    description:  "Provide a platform URL and test descriptions. AI generates Playwright scripts, runs them, analyzes failures, and delivers a complete bug report.",
    features:     ["AI test planning", "Playwright execution", "Bug report with root cause"],
    accent:       "#0891b2",
    iconBg:       "#ecfeff",
    tagBorder:    "#a5f3fc",
    tagColor:     "#0891b2",
  },
  {
    href:         "/test",
    generateHref: "/test/suggest",
    icon:         ListChecks,
    label:        "Test Suggester Agent",
    description:  "Enter any platform URL. AI reads the page and suggests 10–15 practical test cases grouped by category — ready to run in the Test Agent with one click.",
    features:     ["Auto-reads page content", "Grouped by category", "One-click to Test Agent"],
    accent:       "#ea580c",
    iconBg:       "#fff7ed",
    tagBorder:    "#fed7aa",
    tagColor:     "#ea580c",
  },
  {
    href:         "/research",
    generateHref: "/research/generate",
    icon:         SearchIcon,
    label:        "Research Agent",
    description:  "Enter any industry or topic. AI searches the web, analyses market size, trends, competitors, audience, pain points, and opportunities — full research report in minutes.",
    features:     ["Market size & trends", "Competitor analysis", "Pain points & opportunities"],
    accent:       "#6366f1",
    iconBg:       "#eef2ff",
    tagBorder:    "#c7d2fe",
    tagColor:     "#6366f1",
  },
  {
    href:         "/recruitment",
    generateHref: "/recruitment/generate",
    icon:         Briefcase,
    label:        "Recruitment Agent",
    description:  "Paste a job description — AI searches LinkedIn, Internshala, Naukri, GitHub, and Wellfound to find matching candidates, scores them, and drafts personalized outreach.",
    features:     ["Multi-platform search", "Skills match scoring", "Personalized outreach drafts"],
    accent:       "#db2777",
    iconBg:       "#fdf2f8",
    tagBorder:    "#fbcfe8",
    tagColor:     "#db2777",
  },
  {
    href:         "/workflow",
    generateHref: "/orchestrator",
    icon:         Network,
    label:        "AI Orchestrator",
    description:  "One goal, all agents. Describe what you want — the orchestrator runs Research → Lead Gen → CRM Sync automatically in the right order.",
    features:     ["Multi-agent pipeline", "Auto-sequencing", "Full pipeline in one command"],
    accent:       "#f43f5e",
    iconBg:       "#fff1f2",
    tagBorder:    "#fecdd3",
    tagColor:     "#f43f5e",
  },
  // — View Dashboard only agents (bottom 6) —
  {
    href:         "/crm",
    generateHref: "/crm",
    noRunAgent:   true,
    icon:         Users2,
    label:        "CRM Agent",
    description:  "Unified contact management. Merge leads from all agents, track pipeline stages, log activities, and send outreach from one place.",
    features:     ["Unified contact view", "Pipeline stages", "Activity log", "1-click outreach"],
    accent:       "#d97706",
    iconBg:       "#fffbeb",
    tagBorder:    "#fcd34d",
    tagColor:     "#d97706",
  },
  {
    href:         "/classes",
    generateHref: "/classes/run",
    icon:         CalendarDays,
    label:        "Class Scheduler Agent",
    description:  "Schedule classes with a title, date, time, location, and attendee emails. Agent auto-sends professional invite emails to every attendee the moment you book.",
    features:     ["Auto email invites", "Track upcoming & past", "Mark completed"],
    accent:       "#0ea5e9",
    iconBg:       "#f0f9ff",
    tagBorder:    "#bae6fd",
    tagColor:     "#0284c7",
  },
]

export default function WorkflowPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* ── Hero (same style as Business Automation Banner) ── */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center" style={{ background: "#f7f9ff" }}>
        {/* Subtle grid background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ duration: 1.2, ease }}
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(#20262D 1px, transparent 1px), linear-gradient(90deg, #20262D 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-32 pb-24 flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-[#276ef1]/20 bg-[#eff6ff] px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#276ef1] animate-pulse" />
            <span className="text-xs font-medium text-[#276ef1] tracking-wide">AI-Powered Automation Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease }}
            className="text-4xl md:text-5xl xl:text-6xl font-normal leading-[1.15] tracking-tight text-black max-w-3xl"
          >
            Automate your outreach with AI agents
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mt-6 text-lg md:text-xl text-[#7a8899] leading-relaxed max-w-xl"
          >
            Four specialized agents that research prospects, enrich data, score leads,
            test platforms, and craft personalized outreach — all in seconds, not hours.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease }}
            className="flex items-center gap-3 mt-10"
          >
            <Button
              size="lg"
              asChild
              className="rounded-xl px-6 py-3 text-sm font-semibold text-white gap-2 border-0"
              style={{ background: "#276ef1" }}
            >
              <a href="#agents">
                <Rocket className="w-4 h-4" />
                Get Started
              </a>
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48, ease }}
            className="flex items-center gap-10 mt-14"
          >
            {[
              { value: "4", label: "AI Agents" },
              { value: "10x", label: "Faster Outreach" },
              { value: "GPT-4o", label: "Powered By" },
            ].map((s, i) => (
              <div key={i} className="text-center px-5 py-3 rounded-xl border" style={{ background: "#fff", borderColor: "#e8edf5" }}>
                <p className="text-xl font-bold text-[#0a1628]">{s.value}</p>
                <p className="text-[11px] text-[#7a8899] mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="pt-8 pb-16 md:pt-10 md:pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <div className="flex justify-center mb-4">
              <span className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest border border-[#276ef1]/30 text-[#276ef1] bg-[#eff6ff]">
                From Target to Outreach
              </span>
            </div>
            <h2 className="text-3xl font-normal text-gray-900">Three Steps to AI-Powered Leads</h2>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Define Target", desc: "Set your industry, location, and ideal customer profile.", icon: Globe },
              { num: "02", title: "Agent Researches", desc: "AI scrapes Google Maps, enriches data, and scores every lead.", icon: Bot },
              { num: "03", title: "Get Results", desc: "Receive scored leads with personalized outreach emails ready to send.", icon: Sparkles },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
                  viewport={{ once: true, margin: "-80px" }}
                >
                  <Card className="group relative overflow-hidden h-full border-0 shadow-md bg-white hover:bg-[#1a56db] transition-colors duration-300 cursor-pointer rounded-2xl">
                    {/* Large watermark number */}
                    <span className="absolute -top-4 -right-2 text-8xl font-black select-none pointer-events-none text-gray-100 group-hover:text-white/10 transition-colors duration-300">
                      {step.num}
                    </span>

                    <CardContent className="p-7 flex flex-col gap-5 relative z-10">
                      {/* Icon circle */}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#eef2ff] group-hover:bg-white/15 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                        <Icon className="w-7 h-7 text-[#1a56db] group-hover:text-white transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
                      </div>

                      {/* Step number pill */}
                      <span className="text-xs font-bold uppercase tracking-widest text-[#1a56db] group-hover:text-white/60 transition-colors duration-300">
                        Step {step.num}
                      </span>

                      <div>
                        <h3 className="text-lg font-bold mb-2 text-gray-900 group-hover:text-white transition-colors duration-300">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-500 group-hover:text-white/70 transition-colors duration-300">
                          {step.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Agent cards ── */}
      <section id="agents" className="pt-10 pb-16 md:pt-14 md:pb-24 bg-[#f3f4f6] relative overflow-hidden">
        {/* Dot grid — top right */}
        <div
          className="absolute top-8 right-8 opacity-25 pointer-events-none"
          style={{ display: "grid", gridTemplateColumns: "repeat(18, 6px)", gap: "20px" }}
        >
          {Array.from({ length: 324 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>

        {/* Dot grid — bottom left */}
        <div
          className="absolute bottom-8 left-8 opacity-25 pointer-events-none"
          style={{ display: "grid", gridTemplateColumns: "repeat(18, 6px)", gap: "20px" }}
        >
          {Array.from({ length: 324 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <span className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest border border-[#1a56db]/30 text-[#1a56db] bg-[#eff6ff]">
                AI Agents
              </span>
            </div>
            <h2 className="text-3xl font-normal leading-[1.2] text-gray-900">
              Choose Your Agent
            </h2>
          </motion.div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((a, i) => {
              const Icon = a.icon
              return (
                <motion.div
                  key={a.generateHref}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
                  viewport={{ once: true, margin: "-80px" }}
                >
                  <Card className="group overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                    {/* Colored header area — like the image in WhatWeDo */}
                    <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{ background: a.iconBg }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/80 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                        <Icon className="w-8 h-8" style={{ color: a.accent }} strokeWidth={1.5} />
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: a.accent }} />
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10" style={{ background: a.accent }} />
                    </div>

                    <CardContent className="p-6 flex flex-col gap-3 flex-1">
                      <h3 className="text-base font-semibold text-gray-900">{a.label}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{a.description}</p>

                      {/* Features */}
                      <Separator className="my-1" />
                      <div className="space-y-2.5">
                        {a.features.map(f => (
                          <p key={f} className="text-sm text-gray-600 flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.accent }} />
                            {f}
                          </p>
                        ))}
                      </div>

                      {/* Spacer */}
                      <div className={"noRunAgent" in a && a.noRunAgent ? "flex-none mt-2" : "flex-1"} />

                      {/* CTAs */}
                      <div className="flex flex-col gap-2 mt-3">
                        {!("noRunAgent" in a && a.noRunAgent) && (
                          <Button asChild className="w-full rounded-xl text-white text-sm font-semibold gap-2 hover:opacity-90 transition-opacity"
                            style={{ background: a.accent }}>
                            <Link href={a.generateHref}>Run Agent <ArrowRight className="w-3.5 h-3.5" /></Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" className="w-full rounded-xl text-sm font-medium"
                          style={{ borderColor: a.tagBorder, color: a.tagColor, background: a.iconBg }}>
                          <Link href={a.href}>View Dashboard</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
