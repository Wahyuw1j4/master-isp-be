import jwt from 'jsonwebtoken'

export function signAccessToken({ user, scopes, sid }) {
  const now = Math.floor(Date.now() / 1000)     // ambil hanya sekali
  const expiresAt = now + (12 * 60 * 60)        // tambah 12 jam

  const payload = {
    sub: String(user.id),
    username: user.username,
    scp: scopes,
    rver: user.sessionVersion,
    jti: sid,
    iat: now,
    exp: expiresAt
  }

  return jwt.sign(payload, process.env.JWT_SECRET)
}

export function verifyAccessToken(token) {
  const key = process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET

  return jwt.verify(token, key, { algorithms: algs })
}
