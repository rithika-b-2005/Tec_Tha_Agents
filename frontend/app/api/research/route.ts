import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const reports = await prisma.researchReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ reports })
}
