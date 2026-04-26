import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, contactIds, data } = body

    if (!action || !contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json(
        { error: "action and contactIds array required" },
        { status: 400 }
      )
    }

    if (contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds cannot be empty" },
        { status: 400 }
      )
    }

    let updated = 0

    switch (action) {
      case "update-stage": {
        if (!data?.stage) {
          return NextResponse.json(
            { error: "stage required for update-stage" },
            { status: 400 }
          )
        }

        await prisma.crmContact.updateMany({
          where: { id: { in: contactIds } },
          data: {
            pipelineStage: data.stage,
            lastContactedAt: new Date(),
          },
        })

        // Create activity log entries
        for (const id of contactIds) {
          const contact = await prisma.crmContact.findUnique({
            where: { id },
            select: { pipelineStage: true },
          })
          if (contact) {
            await prisma.crmActivity.create({
              data: {
                contactId: id,
                type: "stage_change",
                summary: `Bulk moved to ${data.stage}`,
              },
            })
          }
        }

        updated = contactIds.length
        break
      }

      case "add-tag": {
        if (!data?.tag) {
          return NextResponse.json(
            { error: "tag required for add-tag" },
            { status: 400 }
          )
        }

        for (const id of contactIds) {
          const contact = await prisma.crmContact.findUnique({
            where: { id },
            select: { sources: true },
          })
          if (contact && !contact.sources.includes(data.tag)) {
            await prisma.crmContact.update({
              where: { id },
              data: { sources: [...contact.sources, data.tag] },
            })
            updated++
          }
        }
        break
      }

      case "update-notes": {
        if (!data?.notes) {
          return NextResponse.json(
            { error: "notes required for update-notes" },
            { status: 400 }
          )
        }

        await prisma.crmContact.updateMany({
          where: { id: { in: contactIds } },
          data: { notes: data.notes },
        })

        updated = contactIds.length
        break
      }

      case "delete": {
        const result = await prisma.crmContact.deleteMany({
          where: { id: { in: contactIds } },
        })
        updated = result.count
        break
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      updated,
      message: `${action}: ${updated} contacts updated`,
    })
  } catch (err) {
    console.error("[crm/bulk POST]", err)
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 })
  }
}
