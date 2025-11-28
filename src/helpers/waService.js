// src/helpers/waService.js
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma, prismaQuery } from '../prisma.js';
import { ensureSessionRow } from './waPrismaAuth.js';
import axios from 'axios';

const SESSIONS = new Map(); // name -> { sock, saveCreds }

// Folder base tempat Baileys simpan auth-nya per session
const AUTH_BASE_PATH = path.resolve('./whatsapp-auth');

/** Mulai 1 session (atau reload jika sudah ada) */
export async function startSession(name) {
  // Cegah double start
  if (SESSIONS.has(name)) {
    console.log(`[${name}] Session already running, skip start`);
    return { name };
  }

  // Pastikan row di DB ada
  const sessionRow = await ensureSessionRow(name);

  // Pakai auth berbasis file, 1 folder per session
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(AUTH_BASE_PATH, name),
  );

  const sock = makeWASocket({
    auth: state,
    // v7: tidak perlu printQRInTerminal, kita handle sendiri lewat event
  });

  SESSIONS.set(name, { sock, saveCreds });

  // Simpan perubahan creds ke file
  sock.ev.on('creds.update', saveCreds);

  // Event connection (QR, status, reconnect + cleanup)
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;

    // QR baru -> simpan di DB (buat endpoint /qr)
    if (qr) {
      await prismaQuery(() =>
        prisma.whatsapp_session.update({
          where: { id: sessionRow.id },
          data: {
            qr_raw: qr,
            qr_updated_at: new Date(),
            last_conn_update_at: new Date(),
            status: 'CONNECTING',
          },
        }),
      );
      console.log(`[${name}] QR diperbarui`);
    }

    // Koneksi berhasil OPEN
    if (connection === 'open') {
      // Info akun dari Baileys
      const me = sock.user || u.me || state?.creds?.me || null;

      let accountId = null;

      if (me?.id) {
        // contoh me.id: "6281225404589:75@s.whatsapp.net"
        const bare = me.id.split('@')[0]; // "6281225404589:75"
        const phone = bare.split(':')[0]; // "6281225404589"

        const label = me.name || me.pushName || name;
        const isBusiness = !!me.isBusiness;

        const account = await prismaQuery(() =>
          prisma.whatsapp_account.upsert({
            where: { phone_number: phone },
            create: {
              phone_number: phone,
              label,
              is_business: isBusiness,
            },
            update: {
              label,
              is_business: isBusiness,
            },
          }),
        );

        accountId = account.id;
      }

      await prismaQuery(() =>
        prisma.whatsapp_session.update({
          where: { id: sessionRow.id },
          data: {
            status: 'OPEN',
            qr_raw: null,
            connected_at: new Date(),
            last_conn_update_at: new Date(),
            account_id: accountId,
          },
        }),
      );

      await axios.post('http://localhost:3000/socketxyz/internal/emit', {
        event: 'whatsapp-notif',
        data: {
          status: 'connected',
          message: `WhatsApp session "${name}" connected.`,
          session: name,
        },
      }).catch((e) => {
        console.error(`[${name}] Gagal kirim notif connected`, e.message);
      });

      console.log(
        `[${name}] ✅ Connected${accountId ? ` (account_id=${accountId}, phone=${me?.id})` : ''
        }`,
      );
    }

    // Koneksi CLOSE (apapun sebabnya)
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      const restartRequired = code === DisconnectReason.restartRequired;

      await prismaQuery(() =>
        prisma.whatsapp_session.update({
          where: { id: sessionRow.id },
          data: {
            status: loggedOut ? 'LOGGED_OUT' : 'CLOSED',
            disconnected_at: new Date(),
            last_conn_update_at: new Date(),
          },
        }),
      );

      console.log(
        `[${name}] ❌ Closed (code: ${code}, restartRequired: ${restartRequired}, loggedOut: ${loggedOut})`,
      );

      // Kalau benar-benar logged out dari HP:
      // - putus relasi ke whatsapp_account
      // - hapus row whatsapp_account
      // - hapus folder auth di filesystem
      if (loggedOut) {
        try {
          const sess = await prismaQuery(() =>
            prisma.whatsapp_session.findUnique({
              where: { id: sessionRow.id },
              select: { account_id: true },
            }),
          );

          if (sess?.account_id) {
            await prismaQuery(() =>
              prisma.$transaction([
                prisma.whatsapp_session.update({
                  where: { id: sessionRow.id },
                  data: { account_id: null },
                }),
                prisma.whatsapp_account.delete({
                  where: { id: sess.account_id },
                }),
              ]),
            );
            console.log(
              `[${name}] 🔐 whatsapp_account dihapus (account_id=${sess.account_id})`,
            );
          }

          const dir = path.join(AUTH_BASE_PATH, name);
          await fs.rm(dir, { recursive: true, force: true });
          console.log(`[${name}] 🧹 folder auth dihapus: ${dir}`);
        } catch (e) {
          console.error(`[${name}] error saat cleanup logout`, e);
        }
      }

      // Hapus dari map socket
      SESSIONS.delete(name);

      await axios.post('http://localhost:3000/socketxyz/internal/emit', {
        event: 'whatsapp-notif',
        data: {
          status: 'disconnected',
          message: `WhatsApp session "${name}" disconnected.`,
          session: name,
        },
      }).catch((e) => {
        console.error(`[${name}] Gagal kirim notif disconnected`, e.message);
      });

      // Auto-reconnect hanya kalau BUKAN loggedOut
      if (!loggedOut) {
        setTimeout(() => {
          startSession(name).catch((e) =>
            console.error(`[${name}] auto-restart error`, e),
          );
        }, 1000);
      }
    }
  });

  // (opsional) log pesan masuk ke DB
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      const remoteJid = m.key?.remoteJid || '';
      const fromMe = m.key?.fromMe;
      const isGroup = remoteJid.endsWith('@g.us');

      // siapa "kita" (akun WA session ini)
      const meJid = sock.user?.id || state?.creds?.me?.id || null;

      let fromJid;
      let toJid;

      if (fromMe) {
        // pesan yang kita kirim
        fromJid = meJid || remoteJid;
        toJid = remoteJid;
      } else {
        // pesan yang kita terima
        if (isGroup) {
          // di group, pengirim sebenarnya ada di key.participant
          fromJid = m.key?.participant || remoteJid;
          toJid = meJid || remoteJid;
        } else {
          // chat 1:1
          fromJid = remoteJid;
          toJid = meJid || remoteJid;
        }
      }

      const fromNumber = phoneFromJid(fromJid);
      const toNumber = phoneFromJid(toJid);
      const msgType = detectMessageType(m.message);

      try {
        await prisma.whatsapp_message_log.create({
          data: {
            session_id: sessionRow.id,
            direction: fromMe ? 'OUT' : 'IN',
            jid: remoteJid,

            from_jid: fromJid,
            to_jid: toJid,
            from_number: fromNumber,
            to_number: toNumber,

            message_id: m.key?.id || null,
            message: m.message || {},
            message_type: msgType,
            status: type,
          },
        });
      } catch (e) {
        console.error('[wa-log] gagal simpan log', e?.message || e);
      }
    }
  });

  return { name };
}

// helper: "62812xxxx:75@s.whatsapp.net" -> "62812xxxx"
export function phoneFromJid(jid) {
  if (!jid) return null;
  const bare = jid.split('@')[0];   // "62812xxxx:75"
  return bare.split(':')[0];        // "62812xxxx"
}

// helper: deteksi tipe message
export function detectMessageType(msg) {
  if (!msg) return 'OTHER';

  if (msg.conversation || msg.extendedTextMessage) return 'TEXT';
  if (msg.imageMessage) return 'IMAGE';
  if (msg.videoMessage) return 'VIDEO';
  if (msg.audioMessage) return 'AUDIO';
  if (msg.documentMessage) return 'DOCUMENT';
  if (msg.stickerMessage) return 'STICKER';
  if (msg.contactMessage || msg.contactsArrayMessage) return 'CONTACT';
  if (msg.locationMessage || msg.liveLocationMessage) return 'LOCATION';
  if (msg.buttonsMessage || msg.templateMessage || msg.listMessage)
    return 'BUTTON';

  return 'OTHER';
}

export function getSession(name) {
  const entry = SESSIONS.get(name);
  if (!entry) throw new Error('Session not found');
  return entry;
}

export async function stopSession(
  name,
  { logout = true, deleteDb = false } = {},
) {
  const entry = SESSIONS.get(name);
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({ where: { name } }),
  );

  if (entry) {
    try {
      if (logout) await entry.sock.logout();
    } catch { }
    try {
      entry.sock.end?.();
    } catch { }
    SESSIONS.delete(name);
  }

  if (row && deleteDb) {
    await prismaQuery(() =>
      prisma.whatsapp_message_log.deleteMany({
        where: { session_id: row.id },
      }),
    );
    await prismaQuery(() =>
      prisma.whatsapp_session.delete({ where: { id: row.id } }),
    );

    // opsional: hapus folder auth juga kalau deleteDb
    const dir = path.join(AUTH_BASE_PATH, name);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function sendText(name, number, message) {
  const { sock } = getSession(name);
  const jid = number.includes('@s.whatsapp.net')
    ? number
    : `${number}@s.whatsapp.net`;

  const res = await sock.sendMessage(jid, { text: message });

  try {
    const row = await prisma.whatsapp_session.findUnique({
      where: { name },
      select: { id: true },
    });
    const meJid = sock.user?.id || null;

    if (row) {
      await prisma.whatsapp_message_log.create({
        data: {
          session_id: row.id,
          direction: 'OUT',
          jid,
          from_jid: meJid || jid,
          to_jid: jid,
          from_number: phoneFromJid(meJid),
          to_number: phoneFromJid(jid),
          message_id: res?.key?.id || null,
          message: { conversation: message },
          message_type: 'TEXT',
          status: 'SENT',
        },
      });
    }
  } catch {
    // ignore
  }

  return res;
}

export async function sendWhatsappWithTemplate(name, number, template_code, variables) {
  const template = await prisma.whatsapp_template.findUnique({
    where: { code: template_code },
  });

  if (!template) {
    throw new Error(`Template with code "${template_code}" not found`);
  }

  let message = template.body;
  if (variables) {
    for (const key in variables) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, variables[key]);
    }
  }

  return await sendText(name, number, message);
}


export async function getStatus(name) {
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({
      where: { name },
      include: {
        account: {
          select: {
            id: true,
            label: true,
            phone_number: true,
            is_business: true,
          },
        },
      },
    }),
  );
  if (!row) throw new Error('Session not found');
  return {
    name: row.name,
    status: row.status,
    connected_at: row.connected_at,
    disconnected_at: row.disconnected_at,
    account: row.account || null,
  };
}

export async function getQR(name) {
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({ where: { name } })
  );
  if (!row) throw new Error('Session not found');

  // Kalau sudah OPEN, ya nggak butuh QR lagi
  if (row.status === 'OPEN') {
    return { message: 'Sudah terhubung' };
  }

  // Kalau belum ada socket jalan, dan status memungkinkan, nyalakan sesi
  if (
    !SESSIONS.has(name) &&
    (row.status === 'LOGGED_OUT' ||
      row.status === 'CLOSED' ||
      row.status === 'CONNECTING')
  ) {
    // fire-and-forget, biar tidak blocking response
    startSession(name).catch((e) =>
      console.error(`[${name}] error startSession dari getQR`, e)
    );
  }

  // Kalau QR belum sempat ke-generate, suruh client retry
  if (!row.qr_raw) {
    return { message: 'QR belum tersedia, silakan coba lagi dalam 1-2 detik' };
  }

  const dataUrl = await QRCode.toDataURL(row.qr_raw);
  return { name, qr: dataUrl, updated_at: row.qr_updated_at };
}


export async function listSessions() {
  const rows = await prismaQuery(() =>
    prisma.whatsapp_session.findMany({
      include: {
        account: {
          select: {
            id: true,
            label: true,
            phone_number: true,
            is_business: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    }),
  );
  return rows;
}

/** Auto-restore semua sesi dari DB saat boot */
export async function restoreAllSessions() {
  const rows = await prismaQuery(() =>
    prisma.whatsapp_session.findMany({
      where: {
        // kalau mau, bisa exclude LOGGED_OUT
        // status: { not: 'LOGGED_OUT' }
      },
      select: { name: true },
    }),
  );

  for (const r of rows) {
    try {
      await startSession(r.name);
    } catch (e) {
      console.error('Restore gagal', r.name, e);
    }
  }
}


