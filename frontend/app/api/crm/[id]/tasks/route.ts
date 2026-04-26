import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const tasks = await prisma.crmTask.findMany({
      where: { contactId: id, completedAt: null },
      orderBy: { scheduledAt: "asc" },
    })
    return NextResponse.json({ tasks })
  } catch (err) {
    console.error("[crm/[id]/tasks GET]", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { title, description, taskType = "follow_up", scheduledAt } = body

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: "title and scheduledAt required" },
        { status: 400 }
      )
    }

    const contact = await prisma.crmContact.findUnique({ where: { id } })
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const task = await prisma.crmTask.create({
      data: {
        contactId: id,
        title,
        description,
        taskType,
        scheduledAt: new Date(scheduledAt),
      },
    })

    // Log as activity
    await prisma.crmActivity.create({
      data: {
        contactId: id,
        type: "task_created",
        summary: `${taskType === "follow_up" ? "Follow-up" : "Task"} scheduled: ${title}`,
      },
    })

    return NextResponse.json({ task })
  } catch (err) {
    console.error("[crm/[id]/tasks POST]", err)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { taskId, completedAt } = body

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId required" },
        { status: 400 }
      )
    }

    const task = await prisma.crmTask.update({
      where: { id: taskId },
      data: { completedAt: completedAt ? new Date(completedAt) : new Date() },
    })

    // Log completion
    await prisma.crmActivity.create({
      data: {
        contactId: id,
        type: "task_completed",
        summary: `Task completed: ${task.title}`,
      },
    })

    return NextResponse.json({ task })
  } catch (err) {
    console.error("[crm/[id]/tasks PATCH]", err)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}
