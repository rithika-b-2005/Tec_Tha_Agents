import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const notes = await prisma.brainNote.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        tags: true,
        category: true,
        source: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ notes })
  } catch (err) {
    console.error("[brain GET]", err)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.brainNote.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[brain DELETE]", err)
    return NextResponse.json({ error: "Failed to delete notes" }, { status: 500 })
  }
}
