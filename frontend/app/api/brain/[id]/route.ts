import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const note = await prisma.brainNote.findUnique({ where: { id } })
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }
    return NextResponse.json({ note })
  } catch (err) {
    console.error("[brain/[id] GET]", err)
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, tags } = body

    const note = await prisma.brainNote.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(tags !== undefined ? { tags } : {}),
      },
    })

    return NextResponse.json({ note })
  } catch (err) {
    console.error("[brain/[id] PATCH]", err)
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.brainNote.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error("[brain/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
  }
}
