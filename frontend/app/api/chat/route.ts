import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const since   = searchParams.get("since")
  const groupId = searchParams.get("groupId")

  const messages = await prisma.chatMessage.findMany({
    where: {
      groupId: groupId || null,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  })

  return NextResponse.json({ messages })
}

export async function POST(request: Request) {
  try {
    const { sender, text, groupId } = await request.json()
    if (!sender?.trim() || !text?.trim()) {
      return NextResponse.json({ error: "sender and text required" }, { status: 400 })
    }
    const message = await prisma.chatMessage.create({
      data: { sender: sender.trim(), text: text.trim(), groupId: groupId || null },
    })
    return NextResponse.json({ message })
  } catch (err) {
    console.error("[chat POST]", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function DELETE() {
  await prisma.chatMessage.deleteMany()
  return NextResponse.json({ ok: true })
}
