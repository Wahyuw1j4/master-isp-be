// Prisma client instance
import { PrismaClient } from '../../generated/prisma/index.js';
const prisma = new PrismaClient({
  log: [], // aktifkan log query
})

prisma.$on("query", async (e) => {
  console.debug(e.params)
});

// Fungsi query terpusat dengan error handling dan serialisasi BigInt
async function prismaQuery(fn) {
  try {
    const result = await fn();
    return safeJson(result);
  } catch (error) {
    console.error('Prisma Error:', error);
    throw error;
  }
}

export {
  prisma,
}