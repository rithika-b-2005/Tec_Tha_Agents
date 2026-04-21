import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { COOKIE } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(COOKIE.REFRESH)?.value
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {})
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE.ACCESS,  "", { httpOnly: true, path: "/", maxAge: 0 })
    response.cookies.set(COOKIE.REFRESH, "", { httpOnly: true, path: "/", maxAge: 0 })
    return response
  } catch (err) {
    console.error("[logout]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
