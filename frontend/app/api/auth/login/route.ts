import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signAccessToken, generateRefreshToken, COOKIE } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password } = await req.json()

    if ((!email && !phone) || !password) {
      return NextResponse.json({ error: "Email/phone and password required" }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    })

    if (!user) {
      return NextResponse.json({ error: "No account found" }, { status: 404 })
    }

    const valid = await compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const accessToken = await signAccessToken({
      sub:            user.id,
      email:          user.email,
      firstName:      user.firstName,
      role:           user.role,
      platformAccess: user.platformAccess,
    })

    const refreshToken = generateRefreshToken()
    const expiresAt = new Date(Date.now() + COOKIE.REFRESH_MAX_AGE * 1000)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    })

    const response = NextResponse.json({
      user: {
        id:        user.id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        phone:     user.phone,
        role:      user.role,
      },
      accessToken,
      refreshToken,
    })

    response.cookies.set(COOKIE.ACCESS,  accessToken,  { ...COOKIE.BASE, maxAge: COOKIE.ACCESS_MAX_AGE })
    response.cookies.set(COOKIE.REFRESH, refreshToken, { ...COOKIE.BASE, maxAge: COOKIE.REFRESH_MAX_AGE })

    return response
  } catch (err) {
    console.error("[login]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
