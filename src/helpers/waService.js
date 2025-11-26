// src/helpers/waService.js
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { prisma, prismaQuery } from '../prisma.js';
import { ensureSessionRow } from './waPrismaAuth.js';

const SESSIONS = new Map(); // name -> { sock, saveCreds }

// Folder base tempat Baileys simpan auth-nya per session
const AUTH_BASE_PATH = './whatsapp-auth';

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
    `${AUTH_BASE_PATH}/${name}`
  );

  const sock = makeWASocket({
    auth: state,
    // v7: tidak perlu printQRInTerminal, kita handle sendiri lewat event
  });

  SESSIONS.set(name, { sock, saveCreds });

  // Simpan perubahan creds ke file
  sock.ev.on('creds.update', saveCreds);

  // Event connection (QR, status, reconnect)
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
        })
      );
      console.log(`[${name}] QR diperbarui`);
    }

    if (connection === 'open') {
      await prismaQuery(() =>
        prisma.whatsapp_session.update({
          where: { id: sessionRow.id },
          data: {
            status: 'OPEN',
            qr_raw: null,
            connected_at: new Date(),
            last_conn_update_at: new Date(),
          },
        })
      );
      console.log(`[${name}] ✅ Connected`);
    }

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
        })
      );

      console.log(
        `[${name}] ❌ Closed (code: ${code}, restartRequired: ${restartRequired}, loggedOut: ${loggedOut})`
      );

      // Hapus dari map socket dulu
      SESSIONS.delete(name);

      // Auto-reconnect kalau bukan logged out
      if (!loggedOut) {
        setTimeout(() => {
          startSession(name).catch((e) =>
            console.error(`[${name}] auto-restart error`, e)
          );
        }, 1000);
      }
    }
  });

  // (opsional) log pesan masuk ke DB
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      console.log(`[${name}] Message received:`, m);
      try {
        await prisma.whatsapp_message_log.create({
          data: {
            session_id: sessionRow.id,
            direction: 'IN',
            jid: m.key?.remoteJid || '',
            message_id: m.key?.id || null,
            message: m.message || {},
            status: type,
          },
        });
      } catch (e) {
        // jangan ganggu alur utama kalau logging gagal
      }
    }
  });

  return { name };
}

export function getSession(name) {
  const entry = SESSIONS.get(name);
  if (!entry) throw new Error('Session not found');
  return entry;
}

export async function stopSession(
  name,
  { logout = true, deleteDb = false } = {}
) {
  const entry = SESSIONS.get(name);
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({ where: { name } })
  );

  if (entry) {
    try {
      if (logout) await entry.sock.logout();
    } catch {}
    try {
      entry.sock.end?.();
    } catch {}
    SESSIONS.delete(name);
  }

  if (row && deleteDb) {
    // kalau kamu punya tabel creds/keys, bisa dihapus juga di sini kalau mau bersih
    await prismaQuery(() =>
      prisma.whatsapp_message_log.deleteMany({
        where: { session_id: row.id },
      })
    );
    await prismaQuery(() =>
      prisma.whatsapp_session.delete({ where: { id: row.id } })
    );
  }
}

export async function sendText(name, number, message) {
  const { sock } = getSession(name);
  const jid = number.includes('@s.whatsapp.net')
    ? number
    : `${number}@s.whatsapp.net`;

  const res = await sock.sendMessage(jid, { text: message });

  // (opsional) log OUT message
  try {
    const row = await prisma.whatsapp_session.findUnique({
      where: { name },
      select: { id: true },
    });
    if (row) {
      await prisma.whatsapp_message_log.create({
        data: {
          session_id: row.id,
          direction: 'OUT',
          jid,
          message_id: res?.key?.id || null,
          message: { text: message },
          status: 'SENT',
        },
      });
    }
  } catch (e) {
    // ignore
  }

  return res;
}

export async function getStatus(name) {
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({ where: { name } })
  );
  if (!row) throw new Error('Session not found');
  return {
    name,
    status: row.status,
    connected_at: row.connected_at,
    disconnected_at: row.disconnected_at,
  };
}

export async function getQR(name) {
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.findUnique({ where: { name } })
  );
  if (!row) throw new Error('Session not found');

  if (row.status === 'OPEN') return { message: 'Sudah terhubung' };
  if (!row.qr_raw)
    return { message: 'QR belum tersedia (tunggu atau restart sesi)' };

  const dataUrl = await QRCode.toDataURL(row.qr_raw);
  return { name, qr: dataUrl, updated_at: row.qr_updated_at };
}

export async function listSessions() {
  const rows = await prismaQuery(() =>
    prisma.whatsapp_session.findMany({
      select: {
        name: true,
        status: true,
        connected_at: true,
        disconnected_at: true,
        updated_at: true,
      },
    })
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
    })
  );

  for (const r of rows) {
    try {
      await startSession(r.name);
    } catch (e) {
      console.error('Restore gagal', r.name, e);
    }
  }
}
