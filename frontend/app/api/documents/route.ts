import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      summary: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ documents })
}

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-api-secret")
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await prisma.document.deleteMany()
  return NextResponse.json({ ok: true })
}
