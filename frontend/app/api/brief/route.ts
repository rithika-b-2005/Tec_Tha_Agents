import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const briefs = await prisma.dailyBrief.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ briefs })
}
