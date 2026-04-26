/**
 * Score need signals to prioritize outreach
 * Higher score = more urgent/important
 */
export function scoreNeedSignal(signal: string | null | undefined): number {
  if (!signal) return 0

  const lower = signal.toLowerCase()
  let score = 0

  // Hiring signals (high priority - indicates growth + immediate need)
  if (
    lower.includes("hiring") ||
    lower.includes("recruitment") ||
    lower.includes("job opening")
  ) {
    score += 40
  }

  // Expansion signals (medium-high priority)
  if (
    lower.includes("expand") ||
    lower.includes("growth") ||
    lower.includes("launch") ||
    lower.includes("new market")
  ) {
    score += 30
  }

  // Technology/digital gaps (medium priority - pain point)
  if (
    lower.includes("website") ||
    lower.includes("digital") ||
    lower.includes("online presence") ||
    lower.includes("automation") ||
    lower.includes("integration")
  ) {
    score += 25
  }

  // Operational challenges (medium priority)
  if (
    lower.includes("process") ||
    lower.includes("efficiency") ||
    lower.includes("streamline") ||
    lower.includes("workflow")
  ) {
    score += 20
  }

  // Customer satisfaction/rating issues (medium-low priority)
  if (
    lower.includes("rating") ||
    lower.includes("review") ||
    lower.includes("satisfaction") ||
    lower.includes("feedback")
  ) {
    score += 15
  }

  // Generic signals (low priority)
  if (lower.includes("opportunity") || lower.includes("potential")) {
    score += 5
  }

  return Math.min(score, 100) // Cap at 100
}

/**
 * Get signal category label
 */
export function getSignalCategory(
  signal: string | null | undefined
): "critical" | "high" | "medium" | "low" | "none" {
  const score = scoreNeedSignal(signal)
  if (score >= 35) return "critical"
  if (score >= 25) return "high"
  if (score >= 15) return "medium"
  if (score >= 5) return "low"
  return "none"
}

/**
 * Sort contacts by signal urgency
 */
export function sortBySignalUrgency(
  contacts: Array<{ needSignals: string | null }>
): Array<{ needSignals: string | null; signalScore: number }> {
  return contacts
    .map((c) => ({
      ...c,
      signalScore: scoreNeedSignal(c.needSignals),
    }))
    .sort((a, b) => b.signalScore - a.signalScore)
}
