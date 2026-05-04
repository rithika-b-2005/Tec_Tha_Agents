import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const API_SECRET = process.env.LEADS_API_SECRET ?? "tectha-n8n-secret-2026"

export async function GET() {
  try {
    const tasks = await prisma.browserTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ tasks })
  } catch (err) {
    console.error("[browser GET]", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const secret = request.headers.get("x-api-secret")
  if (secret !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { count } = await prisma.browserTask.deleteMany()
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[browser DELETE]", err)
    return NextResponse.json({ error: "Failed to delete tasks" }, { status: 500 })
  }
}
