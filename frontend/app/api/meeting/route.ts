import { NextResponse } from "next/server"
import { createMeeting, getMeeting } from "@/lib/meeting-store"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, date, time, classId } = body
    if (!id || !title) {
      return NextResponse.json({ error: "id and title required" }, { status: 400 })
    }
    const meeting = createMeeting({ id, title, description, date, time, classId })
    return NextResponse.json({ meeting })
  } catch (err) {
    console.error("[meeting POST]", err)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const meeting = getMeeting(id)
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ meeting })
}
