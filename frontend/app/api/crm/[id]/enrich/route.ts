import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enrichContact, detectNeedSignals } from "@/lib/enrichment"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const contact = await prisma.crmContact.findUnique({
      where: { id },
      include: { activities: true, tasks: true },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const enriched: Record<string, any> = {}

    // Full waterfall enrichment for contact data
    if (contact.website || contact.company) {
      try {
        const enrichmentResult = await enrichContact(contact.website, contact.company)
        if (enrichmentResult.email && !contact.email) enriched.email = enrichmentResult.email
        if (enrichmentResult.phone && !contact.phone) enriched.phone = enrichmentResult.phone
        if (enrichmentResult.linkedinUrl && !contact.linkedinUrl) enriched.linkedinUrl = enrichmentResult.linkedinUrl
      } catch (enrichErr) {
        console.error("[enrich] waterfall enrichment failed", enrichErr)
      }
    }

    // Detect need signals
    if (contact.company || contact.location || contact.website) {
      try {
        const needSignals = await detectNeedSignals(
          contact.company || "",
          contact.location || "",
          contact.website || ""
        )
        if (needSignals && !contact.needSignals) enriched.needSignals = needSignals
      } catch (signalErr) {
        console.error("[enrich] need signal detection failed", signalErr)
      }
    }

    // Update contact with enriched data
    if (Object.keys(enriched).length > 0) {
      await prisma.crmContact.update({
        where: { id },
        data: enriched,
      })

      // Log enrichment activity
      await prisma.crmActivity.create({
        data: {
          contactId: id,
          type: "enrich",
          summary: `Enriched contact — found ${Object.keys(enriched).join(", ")}`,
        },
      })
    }

    // Fetch updated contact
    const updated = await prisma.crmContact.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: "desc" } }, tasks: true },
    })

    return NextResponse.json({
      contact: updated,
      enriched,
      message: Object.keys(enriched).length > 0 ? "Enrichment complete" : "No new data found",
    })
  } catch (err) {
    console.error("[crm/[id]/enrich POST]", err)
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 })
  }
}
