// middleware/requireSession.js
import { prisma, prismaQuery } from '../prisma.js';
import { Controller } from '../controllers/controller.js';
import jwt from 'jsonwebtoken';
import { getScopesForUser } from '../helpers/authz.js';

export default async function requireSession(req, res, next) {
  try {
    const sid = req.cookies?.sid;
    const token = req.cookies?.token;

    if (!sid || !token) {
      return Controller.sendResponse(res, 401, 'Missing authentication cookies');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        // rekomendasi tambahan kalau kamu set ini saat sign:
        // audience: 'your-aud', issuer: 'your-iss'
      });
    } catch (e) {
      const msg =
        e.name === 'TokenExpiredError' ? 'Your token expired, please try to log in again' :
        e.name === 'JsonWebTokenError' ? 'Invalid token, please try to log in again' :
        'Token verification failed, please try to log in again';
      return Controller.sendResponse(res, 401, msg);
    }

    // Ambil session by sid
    const session = await prisma.sessions.findUnique({ where: { sid } });
    if (!session) {
      return Controller.sendResponse(res, 401, 'Session not found, please try to log in again');
    }

    // Status session
    const now = new Date();
    if (session.revokedAt || session.expiresAt <= now) {
      return Controller.sendResponse(res, 401, 'Session expired or revoked, please try to log in again');
    }

    // (Sangat disarankan) ikat token ke session:
    // jti di JWT adalah id unik token saat login
    // sid di cookie adalah id session di DB
    // jti sama dengan sid
    // - decoded.sub = userId
    // - decoded.jti = id unik token saat login
    if (decoded.sub !== session.userId) {
      return Controller.sendResponse(res, 401, 'Token-user mismatch, please try to log in again');
    }
    if (session.sid && decoded.jti && session.sid !== decoded.jti) {
      return Controller.sendResponse(res, 401, 'Token not bound to this session, please try to log in again');
    }

    // Ambil user
    const user = await prisma.users.findUnique({ where: { id: session.userId } });
    if (!user) {
      return Controller.sendResponse(res, 401, 'User no longer exists, please try to log in again');
    }

    // Versi sesi: force logout all devices ketika increment sessionVersion
    if (session.sessionVersion !== user.sessionVersion) {
      return Controller.sendResponse(res, 401, 'Session invalidated, please try to log in again');
    }

    // Sliding TTL (misal +15 menit) + absolute max age (misal 7 hari dari issuedAt)
    const slidingMs = 15 * 60 * 1000;
    const absoluteMaxMs = 7 * 24 * 60 * 60 * 1000;
    const issuedAt = session.issuedAt ?? session.createdAt ?? now;
    const absoluteExpiry = new Date(new Date(issuedAt).getTime() + absoluteMaxMs);
    const newExpiresAt = new Date(Math.min(now.getTime() + slidingMs, absoluteExpiry.getTime()));

    // Hindari write setiap request (hemat DB): update kalau <50% sisa TTL
    const ttlLeft = session.expiresAt.getTime() - now.getTime();
    if (ttlLeft < slidingMs / 2) {
      await prisma.sessions.update({
        where: { sid },
        data: { lastSeenAt: now, expiresAt: newExpiresAt },
      });
    } else {
      await prisma.sessions.update({
        where: { sid },
        data: { lastSeenAt: now },
      });
    }

    // Taruh user aman di req dan attach scopes
    const { passwordHash, resetToken, ...safeUser } = user;
    const scopes = await getScopesForUser(user.id);
    req.user = {
      ...safeUser,
      scopes,
      sid,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}
