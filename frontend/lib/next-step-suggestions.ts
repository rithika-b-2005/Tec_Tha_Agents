/**
 * AI-powered next step suggestions for contacts
 */

export type NextStepAction =
  | "send_cold_email"
  | "schedule_follow_up"
  | "wait_for_reply"
  | "move_to_qualified"
  | "need_enrichment"
  | "ready_for_sales"

export interface NextStepSuggestion {
  action: NextStepAction
  title: string
  description: string
  urgency: "critical" | "high" | "medium" | "low"
  reasoning: string
}

/**
 * Generate next step suggestions based on contact state
 */
export function getSuggestions(contact: {
  email?: string | null
  pipelineStage?: string | null
  icpLabel?: string | null
  needSignals?: string | null
  score?: number | null
  lastContactedAt?: Date | null
}): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = []
  const daysSinceContact = contact.lastContactedAt
    ? Math.floor(
        (Date.now() - new Date(contact.lastContactedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  // Pipeline stage logic
  if (
    !contact.pipelineStage ||
    contact.pipelineStage === "new"
  ) {
    if (!contact.email) {
      suggestions.push({
        action: "need_enrichment",
        title: "Enrich contact data",
        description: "Find email address before outreach",
        urgency: "high",
        reasoning: "Cannot send cold email without email address",
      })
    } else if (contact.icpLabel === "Hot" || (contact.score || 0) > 70) {
      suggestions.push({
        action: "send_cold_email",
        title: "Send cold outreach email",
        description: "High-value lead ready for contact",
        urgency: "critical",
        reasoning: `Hot lead (${contact.icpLabel}) with score ${contact.score}`,
      })
    } else {
      suggestions.push({
        action: "send_cold_email",
        title: "Send cold outreach email",
        description: "Start the conversation",
        urgency: "medium",
        reasoning: "Contact hasn't been reached yet",
      })
    }
  }

  if (contact.pipelineStage === "contacted") {
    if (daysSinceContact === null || daysSinceContact < 3) {
      suggestions.push({
        action: "wait_for_reply",
        title: "Wait for response",
        description: "Give time for reply (check back in 3 days)",
        urgency: "low",
        reasoning: "Recently contacted, waiting for reply",
      })
    } else if (daysSinceContact >= 3 && daysSinceContact < 7) {
      suggestions.push({
        action: "schedule_follow_up",
        title: "Send follow-up email",
        description: "Gentle reminder after 3+ days",
        urgency: "medium",
        reasoning: `No reply after ${daysSinceContact} days`,
      })
    } else {
      suggestions.push({
        action: "schedule_follow_up",
        title: "Follow-up again",
        description: "Last attempt or move to nurture",
        urgency: "high",
        reasoning: `No reply after ${daysSinceContact} days, consider follow-up or requalify`,
      })
    }
  }

  if (contact.pipelineStage === "replied") {
    suggestions.push({
      action: "move_to_qualified",
      title: "Qualify the lead",
      description: "Assess fit and move to next stage",
      urgency: "high",
      reasoning: "They replied! Time to qualify",
    })
  }

  if (contact.pipelineStage === "qualified") {
    suggestions.push({
      action: "ready_for_sales",
      title: "Hand off to sales",
      description: "Lead is qualified, ready for sales process",
      urgency: "high",
      reasoning: "Qualified lead ready for closing",
    })
  }

  return suggestions
}

/**
 * Get single highest-priority suggestion
 */
export function getTopSuggestion(
  contact: Parameters<typeof getSuggestions>[0]
): NextStepSuggestion | null {
  const suggestions = getSuggestions(contact)
  if (suggestions.length === 0) return null

  // Sort by urgency
  const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort(
    (a, b) => priorityMap[a.urgency] - priorityMap[b.urgency]
  )

  return suggestions[0]
}
