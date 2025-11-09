import { getScopesForUser } from '../helpers/authz.js';
import { signAccessToken } from '../helpers/tokens.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';

class AuthController extends BaseController {
    // Register user
    register = async (req, res, next) => {
        const { username, email, password, fullName, roleId } = req.body;
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            const user = await prismaQuery(() =>
                prisma.users.create({
                    data: {
                        username,
                        email,
                        passwordHash: hash,
                        fullName,
                        roleId
                    }
                })
            );
            this.sendResponse(res, 201, 'User registered successfully', {
                ...user,
                passwordHash: undefined
            });
        } catch (error) {
            next(error);
        }
    }

    // Login: buat session DB-based, set cookie sid
    login = async (req, res, next) => {
        try {
            const { username, password } = req.body;
            let user = await prismaQuery(() => prisma.users.findUnique({ where: { username } }));
            if (!user) return this.sendResponse(res, 401, 'User not found or credentials incorrect');

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return this.sendResponse(res, 401, 'User not found or credentials incorrect, ');
            const scopes = await getScopesForUser(user.id);
            const sid = crypto.randomUUID();
            const accessToken = signAccessToken({ user, scopes, sid });
            // FE menyimpan accessToken (memory/localStorage). Tidak ada refresh cookie.
            const session = {
                userId: user.id,
                sid,
                userAgent: req.headers['user-agent'] || '',
                expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 jam
                ipAddr: req.ip || req.connection.remoteAddress || '',
                sessionVersion: 1
            }
            await prismaQuery(() =>
                prisma.sessions.create({
                    data: session
                })
            );

            res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
            res.cookie('token', accessToken, { httpOnly: false, sameSite: 'lax' }); // untuk debugging

            return this.sendResponse(res, 200, 'Login successful', {
                accessToken,
                user: { ...user, passwordHash: undefined, scopes },
                session: session
            });
        } catch (error) {
            next(error);
        }
    }

    // "Logout" di JWT-only sifatnya client-side; opsion
    // al kita masukkan JTI ke denylist
    logout = async (req, res, next) => {
        const auth = req.headers.authorization || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        if (!token) return res.json({ ok: true })

        // jika kamu ingin revoke sebelum exp, decode dulu JWT (tanpa verify) untuk ambil jti & exp
        // atau gunakan req.user dari verifyJwt sebelumnya
        const jti = req.user?.jti
        const exp = req.user?.exp ? new Date(req.user.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000)
        if (jti) {
            await prisma.tokenDenylist.upsert({
                where: { jti },
                update: {},
                create: { jti, reason: 'logout', exp }
            }).catch(() => { })
        }
        return res.json({ ok: true })
    }

    me = async (req, res, next) => {
        try {
            this.sendResponse(res, 200, 'User profile fetched successfully', req.user);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
