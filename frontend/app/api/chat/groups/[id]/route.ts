import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    if (body.addMember) {
      const group = await prisma.chatGroup.findUnique({ where: { id } })
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
      const newMember = body.addMember.trim()
      if (group.members.includes(newMember)) {
        return NextResponse.json({ group, alreadyMember: true })
      }
      const updated = await prisma.chatGroup.update({
        where: { id },
        data: { members: [...group.members, newMember] },
      })
      return NextResponse.json({ group: updated })
    }

    return NextResponse.json({ error: "No valid operation" }, { status: 400 })
  } catch (err) {
    console.error("[chat/groups/[id] PATCH]", err)
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.chatGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[chat/groups/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }
}
