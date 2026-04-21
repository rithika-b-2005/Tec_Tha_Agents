import { SignJWT, jwtVerify } from "jose"
import { randomBytes } from "crypto"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export type AccessTokenPayload = {
  sub:            string
  email?:         string | null
  firstName:      string
  role:           string
  platformAccess: string[]
  iat?:           number
  exp?:           number
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AccessTokenPayload
  } catch {
    return null
  }
}

export async function isTokenExpired(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET)
    return false
  } catch (e: any) {
    return e?.code === "ERR_JWT_EXPIRED"
  }
}

export function generateRefreshToken(): string {
  return randomBytes(40).toString("hex")
}

export const COOKIE = {
  ACCESS:          "access_token",
  REFRESH:         "refresh_token",
  ACCESS_MAX_AGE:  60 * 15,
  REFRESH_MAX_AGE: 60 * 60 * 24 * 7,
  BASE: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
  },
}
