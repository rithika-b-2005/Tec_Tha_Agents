import { prisma } from "@/lib/prisma"

export interface SyncResult {
  created: number
  updated: number
  total: number
  lastSyncAt: Date
}

export async function syncAllLeads(): Promise<SyncResult> {
  let created = 0
  let updated = 0

  // Sync from Lead table
  const leads = await prisma.lead.findMany()
  for (const lead of leads) {
    if (!lead.email && !lead.name) continue

    let existing: any = null
    if (lead.email) {
      const emailMatches = await prisma.crmContact.findMany({
        where: { email: lead.email },
        take: 1,
      })
      existing = emailMatches.length > 0 ? emailMatches[0] : null
    }

    if (!existing && lead.name && lead.location) {
      const matches = await prisma.crmContact.findMany({
        where: { name: lead.name, location: lead.location },
        take: 1,
      })
      existing = matches.length > 0 ? matches[0] : null
    }

    if (existing) {
      const updateData: any = {}
      if ((lead.score || 0) > (existing.score || 0)) {
        updateData.score = lead.score
      }
      if (!existing.sources.includes("leads")) {
        updateData.sources = [...existing.sources, "leads"]
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.crmContact.update({
          where: { id: existing.id },
          data: updateData,
        })
      }
      updated++
    } else {
      await prisma.crmContact.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          website: lead.website,
          location: lead.location,
          industry: lead.industry,
          linkedinUrl: lead.linkedinUrl,
          score: lead.score,
          icpLabel: lead.icpLabel,
          needSignals: lead.needSignals,
          companyBio: lead.companyBio,
          emailSubject: lead.emailSubject,
          emailBody: lead.emailBody,
          notes: lead.notes,
          sources: ["leads"],
        },
      })
      created++
    }
  }

  // Sync from MarketingLead table
  const marketingLeads = await prisma.marketingLead.findMany()
  for (const lead of marketingLeads) {
    if (!lead.email && !lead.name) continue

    let existing = lead.email
      ? await prisma.crmContact.findFirst({ where: { email: lead.email } })
      : null

    if (!existing && lead.name && lead.location) {
      const matches = await prisma.crmContact.findMany({
        where: { name: lead.name, location: lead.location },
        take: 1,
      })
      existing = matches.length > 0 ? matches[0] : null
    }

    if (existing) {
      const updateData: any = {}
      if ((lead.score || 0) > (existing.score || 0)) {
        updateData.score = lead.score
      }
      if (!existing.sources.includes("marketing")) {
        updateData.sources = [...existing.sources, "marketing"]
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.crmContact.update({
          where: { id: existing.id },
          data: updateData,
        })
      }
      updated++
    } else {
      await prisma.crmContact.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          website: lead.website,
          location: lead.location,
          industry: lead.industry,
          linkedinUrl: lead.linkedinUrl,
          score: lead.score,
          icpLabel: lead.icpLabel,
          needSignals: lead.needSignals,
          companyBio: lead.companyBio,
          emailSubject: lead.emailSubject,
          emailBody: lead.emailBody,
          notes: lead.notes,
          sources: ["marketing"],
        },
      })
      created++
    }
  }

  // Sync from SalesLead table
  const salesLeads = await prisma.salesLead.findMany()
  for (const lead of salesLeads) {
    if (!lead.email && !lead.name) continue

    let existing = lead.email
      ? await prisma.crmContact.findFirst({ where: { email: lead.email } })
      : null

    if (!existing && lead.name && lead.location) {
      const matches = await prisma.crmContact.findMany({
        where: { name: lead.name, location: lead.location },
        take: 1,
      })
      existing = matches.length > 0 ? matches[0] : null
    }

    if (existing) {
      const updateData: any = {}
      if ((lead.score || 0) > (existing.score || 0)) {
        updateData.score = lead.score
      }
      if (!existing.sources.includes("sales")) {
        updateData.sources = [...existing.sources, "sales"]
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.crmContact.update({
          where: { id: existing.id },
          data: updateData,
        })
      }
      updated++
    } else {
      await prisma.crmContact.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          website: lead.website,
          location: lead.location,
          industry: lead.industry,
          linkedinUrl: lead.linkedinUrl,
          score: lead.score,
          icpLabel: lead.icpLabel,
          needSignals: lead.needSignals,
          companyBio: lead.companyBio,
          emailSubject: lead.emailSubject,
          emailBody: lead.emailBody,
          notes: lead.notes,
          sources: ["sales"],
        },
      })
      created++
    }
  }

  return {
    created,
    updated,
    total: created + updated,
    lastSyncAt: new Date(),
  }
}
