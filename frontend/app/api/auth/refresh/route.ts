import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signAccessToken, generateRefreshToken, COOKIE } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(COOKIE.REFRESH)?.value

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 })
    }

    const stored = await prisma.refreshToken.findUnique({
      where:   { token: refreshToken },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {})
      return NextResponse.json({ error: "Refresh token expired or invalid" }, { status: 401 })
    }

    // Rotate: delete old, create new
    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const newRefreshToken = generateRefreshToken()
    const expiresAt = new Date(Date.now() + COOKIE.REFRESH_MAX_AGE * 1000)

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: stored.userId, expiresAt },
    })

    const newAccessToken = await signAccessToken({
      sub:            stored.user.id,
      email:          stored.user.email,
      firstName:      stored.user.firstName,
      role:           stored.user.role,
      platformAccess: stored.user.platformAccess,
    })

    const response = NextResponse.json({
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken,
    })
    response.cookies.set(COOKIE.ACCESS,  newAccessToken,  { ...COOKIE.BASE, maxAge: COOKIE.ACCESS_MAX_AGE })
    response.cookies.set(COOKIE.REFRESH, newRefreshToken, { ...COOKIE.BASE, maxAge: COOKIE.REFRESH_MAX_AGE })

    return response
  } catch (err) {
    console.error("[refresh]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
