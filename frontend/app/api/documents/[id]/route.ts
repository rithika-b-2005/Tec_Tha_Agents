import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }
  return NextResponse.json({ document })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
