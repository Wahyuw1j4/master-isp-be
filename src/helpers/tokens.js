import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const ACCESS_TTL_SEC = Number(process.env.ACCESS_TTL_SEC || 60 * 60 * 24) // default 1d

export function signAccessToken({ user, scopes, sid }) {
  const now = Math.floor(Date.now()/1000)
  const payload = {
    sub: String(user.id),
    username: user.username,
    scp: scopes,                   // array scope (super+granular)
    rver: user.sessionVersion,     // versi role untuk invalidasi on-change
    jti: sid,      // id token (untuk denylist opsional)
    iat: now,
    exp: now + ACCESS_TTL_SEC
  }
  const key = process.env.JWT_SECRET || process.env.JWT_SECRET

  return jwt.sign(payload, key)
}

export function verifyAccessToken(token) {
  const key = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET
  
  return jwt.verify(token, key, { algorithms: algs })
}
