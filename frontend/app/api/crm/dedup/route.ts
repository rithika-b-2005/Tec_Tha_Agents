import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { areContactsDuplicates } from "@/lib/dedup"
import { mergeContactsToOne } from "@/lib/duplicate-merger"

export async function GET() {
  try {
    const contacts = await prisma.crmContact.findMany()

    // Group potential duplicates
    const groups: Record<string, string[]> = {}
    const processed = new Set<string>()

    for (const contact of contacts) {
      if (processed.has(contact.id)) continue

      const duplicates = [contact.id]
      processed.add(contact.id)

      for (const other of contacts) {
        if (processed.has(other.id)) continue
        if (
          areContactsDuplicates(
            {
              email: contact.email,
              name: contact.name,
              company: contact.company,
              location: contact.location,
            },
            {
              email: other.email,
              name: other.name,
              company: other.company,
              location: other.location,
            }
          )
        ) {
          duplicates.push(other.id)
          processed.add(other.id)
        }
      }

      if (duplicates.length > 1) {
        groups[contact.id] = duplicates
      }
    }

    const groupList = Object.entries(groups).map(([primaryId, ids]) => ({
      primaryId,
      duplicateIds: ids.slice(1),
      count: ids.length,
    }))

    return NextResponse.json({
      totalDuplicateGroups: groupList.length,
      totalDuplicates: groupList.reduce((sum, g) => sum + g.duplicateIds.length, 0),
      groups: groupList,
    })
  } catch (err) {
    console.error("[crm/dedup GET]", err)
    return NextResponse.json(
      { error: "Dedup detection failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { primaryId, mergeIds } = body

    if (!primaryId || !mergeIds || !Array.isArray(mergeIds)) {
      return NextResponse.json(
        { error: "primaryId and mergeIds required" },
        { status: 400 }
      )
    }

    // Fetch all contacts to merge
    const contactsToMerge = await prisma.crmContact.findMany({
      where: { id: { in: [primaryId, ...mergeIds] } },
    })

    if (contactsToMerge.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 contacts to merge" },
        { status: 400 }
      )
    }

    // Determine best version of each field
    const mergeResult = mergeContactsToOne(
      contactsToMerge.map((c) => ({
        ...c,
        source: c.sources[0] || "unknown",
      }))
    )

    // Update primary contact
    await prisma.crmContact.update({
      where: { id: mergeResult.primaryId },
      data: {
        ...mergeResult.mergeData,
        sources: Array.from(
          new Set(contactsToMerge.flatMap((c) => c.sources))
        ),
      },
    })

    // Merge activities
    const activitiesFromMerged = await prisma.crmActivity.findMany({
      where: { contactId: { in: mergeIds } },
    })

    await Promise.all(
      activitiesFromMerged.map((a) =>
        prisma.crmActivity.update({
          where: { id: a.id },
          data: { contactId: mergeResult.primaryId },
        })
      )
    )

    // Merge tasks
    const tasksFromMerged = await prisma.crmTask.findMany({
      where: { contactId: { in: mergeIds } },
    })

    await Promise.all(
      tasksFromMerged.map((t) =>
        prisma.crmTask.update({
          where: { id: t.id },
          data: { contactId: mergeResult.primaryId },
        })
      )
    )

    // Delete merged contacts
    await prisma.crmContact.deleteMany({
      where: { id: { in: mergeIds } },
    })

    // Log merge activity
    await prisma.crmActivity.create({
      data: {
        contactId: mergeResult.primaryId,
        type: "merge",
        summary: `Merged ${mergeIds.length} duplicate(s) into this contact`,
      },
    })

    return NextResponse.json({
      success: true,
      primaryId: mergeResult.primaryId,
      mergedCount: mergeIds.length,
      message: `Merged ${mergeIds.length} contacts into primary`,
    })
  } catch (err) {
    console.error("[crm/dedup POST]", err)
    return NextResponse.json({ error: "Merge failed" }, { status: 500 })
  }
}
