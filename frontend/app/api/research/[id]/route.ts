import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await prisma.researchReport.findUnique({ where: { id } })
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ report })
}
