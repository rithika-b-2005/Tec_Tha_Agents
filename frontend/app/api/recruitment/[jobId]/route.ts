import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const job = await prisma.recruitmentJob.findUnique({
      where: { id: jobId },
      include: {
        candidates: {
          orderBy: { matchScore: "desc" },
        },
      },
    })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    return NextResponse.json({ job })
  } catch (err) {
    console.error("[recruitment jobId GET]", err)
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 })
  }
}
