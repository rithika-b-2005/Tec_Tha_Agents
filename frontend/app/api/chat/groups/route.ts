import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const groups = await prisma.chatGroup.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { messages: true } } },
    })
    return NextResponse.json({ groups })
  } catch (err) {
    console.error("[chat/groups GET]", err)
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, members, createdBy } = await request.json()
    if (!name?.trim() || !createdBy?.trim()) {
      return NextResponse.json({ error: "name and createdBy required" }, { status: 400 })
    }
    const allMembers = Array.from(new Set([
      createdBy.trim(),
      ...(members ?? []).map((m: string) => m.trim()).filter(Boolean),
    ]))
    const group = await prisma.chatGroup.create({
      data: { name: name.trim(), description: description?.trim() || null, members: allMembers, createdBy: createdBy.trim() },
    })
    return NextResponse.json({ group })
  } catch (err) {
    console.error("[chat/groups POST]", err)
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }
}
