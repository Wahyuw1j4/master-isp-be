// src/helpers/waPrismaAuth.js
import { prisma, prismaQuery } from '../prisma.js';

/**
 * Pastikan whatsapp_session ada untuk sessionName ini.
 * Kalau belum ada -> create, kalau sudah -> return existing.
 */
export async function ensureSessionRow(sessionName) {
  const row = await prismaQuery(() =>
    prisma.whatsapp_session.upsert({
      where: { name: sessionName },
      create: {
        name: sessionName,
        status: 'CONNECTING'
      },
      update: {},
    })
  );

  return row;
}
