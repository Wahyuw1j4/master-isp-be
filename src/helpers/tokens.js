import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const expiresAt = Math.floor(Date.now() / 1000) + 12 * 60 * 60 // 12 jam
const ACCESS_TTL_SEC = Number(process.env.ACCESS_TTL_SEC || expiresAt) // default 15m

export function signAccessToken({ user, scopes, sid }) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: String(user.id),
    username: user.username,
    scp: scopes,                   // array scope (super+granular)
    rver: user.sessionVersion,     // versi role untuk invalidasi on-change
    jti: sid,      // id token (untuk denylist opsional)
    iat: now,
    exp: ACCESS_TTL_SEC
  }
  const key = process.env.JWT_SECRET || process.env.JWT_SECRET

  return jwt.sign(payload, key)
}

export function verifyAccessToken(token) {
  const key = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET

  return jwt.verify(token, key, { algorithms: algs })
}
