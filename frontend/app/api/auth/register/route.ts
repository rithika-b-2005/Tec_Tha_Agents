import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, company, password } = await req.json()

    if (!firstName || !lastName || !password) {
      return NextResponse.json({ error: "firstName, lastName, and password are required" }, { status: 400 })
    }
    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Check for existing user
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } })
      if (existing) return NextResponse.json({ error: "Phone already registered" }, { status: 409 })
    }

    const hashed = await hash(password, 12)

    const user = await prisma.user.create({
      data: { firstName, lastName, email, phone, company, password: hashed },
    })

    return NextResponse.json({
      user: {
        id:        user.id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        phone:     user.phone,
      },
    }, { status: 201 })
  } catch (err) {
    console.error("[register]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
