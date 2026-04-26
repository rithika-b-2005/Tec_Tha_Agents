import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const projects = await prisma.videoProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ projects })
}
