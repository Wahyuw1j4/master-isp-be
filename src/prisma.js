// db/prisma.js
// ───────────────────────────────────────────────────────────────────────────────
// Prisma client instance + centralized query helper with robust error handling.
// ───────────────────────────────────────────────────────────────────────────────

import { PrismaClient, Prisma } from "../generated/prisma/index.js";

// ---- AppError (agar semua throw tetap instance of Error)
export class AppError extends Error {
  constructor({ code = "UNKNOWN_ERROR", message = "Unexpected error occurred", status = 400, meta = undefined }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.meta = meta;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ---- Prisma Client
const prisma = new PrismaClient({
  log: [], // "info" biasanya berisik
});

// Optional: query logger yang ringkas
prisma.$on("query", (e) => {
  // Hanya aktifkan saat development
  if (process.env.NODE_ENV !== "production") {
    // console.debug("[PRISMA:QUERY]", e.query);
    // params biasanya string JSON; jangan parse jika besar
    if (e.params?.length <= 500) console.debug("[PRISMA:PARAMS]", e.params);
    console.debug("[PRISMA:DURATION]", `${e.duration}ms`);
  }
});


// ---- Deteksi axios tanpa import axios
const isAxiosError = (err) =>
  !!err &&
  typeof err === "object" &&
  (err.isAxiosError === true || (err.config && (err.response || err.request)));

// ---- Normalisasi pesan Prisma (rapikan message panjang)
function trimPrismaMessage(msg = "") {
  // Buang bagian stack/“Invalid invocation” yang tidak berguna untuk client
  return msg.replace(/\s+at\s+.+/gs, "").replace(/Invalid `.+?` invocation:\s*/s, "").trim();
}

// ---- Mapping Error ke AppError
function mapToAppError(error) {
  // 1) Prisma Validation (schema/data tidak valid)
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError({
      code: "VALIDATION_ERROR",
      message: "Invalid data sent to database",
      status: 422,
      meta: { detail: trimPrismaMessage(error.message) },
    });
  }

  // 2) Prisma KnownRequestError (kode P20xx)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = error.code;
    switch (code) {
      case "P2002": // unique constraint
        return new AppError({
          code: "DUPLICATE_KEY",
          message: `Duplicate value for field(s): ${Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.meta?.target || "unknown"}`,
          status: 409,
        });
      case "P2003": // foreign key constraint
        return new AppError({
          code: "FOREIGN_KEY_CONSTRAINT",
          message: `Invalid relation or foreign key: ${error.meta?.field_name || "unknown field"}`,
          status: 409,
        });
      case "P2000": // value too long
        return new AppError({
          code: "VALUE_TOO_LONG",
          message: `Value too long for column: ${error.meta?.column_name || "unknown column"}`,
          status: 422,
        });
      case "P2001": // record does not exist (where)
      case "P2025": // record not found
        return new AppError({
          code: "NOT_FOUND",
          message: "Record not found",
          status: 404,
        });
      case "P2014": // invalid relation
        return new AppError({
          code: "INVALID_RELATION",
          message: "The change would violate a relation",
          status: 409,
        });
      case "P2016": // query interpretation
      case "P2019":
        return new AppError({
          code: "QUERY_INTERPRETATION_ERROR",
          message: "Query interpretation error",
          status: 400,
          meta: { detail: trimPrismaMessage(error.message) },
        });
      case "P2017": // records not connected
        return new AppError({
          code: "RECORDS_NOT_CONNECTED",
          message: "Records not connected",
          status: 400,
        });
      case "P2021": // table not found
      case "P2022": // column not found
        return new AppError({
          code: "SCHEMA_MISMATCH",
          message: "Database schema mismatch (missing table/column). Did you run migrations?",
          status: 500,
        });
      case "P2033": // number out of range
        return new AppError({
          code: "NUMBER_OUT_OF_RANGE",
          message: "Number out of range for the column type",
          status: 422,
        });
      default:
        return new AppError({
          code,
          message: trimPrismaMessage(error.message),
          status: 400,
          meta: error.meta,
        });
    }
  }

  // 3) Prisma Unknown/Initialization/Panic
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new AppError({
      code: "DB_UNKNOWN_ERROR",
      message: "Unknown database error",
      status: 500,
    });
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError({
      code: "DB_INIT_ERROR",
      message: "Failed to initialize database connection",
      status: 500,
      meta: { detail: trimPrismaMessage(error.message) },
    });
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new AppError({
      code: "DB_PANIC",
      message: "Database engine panicked",
      status: 500,
    });
  }

  // 4) Axios (HTTP client)
  if (isAxiosError(error)) {
    return new AppError({
      code: "HTTP_REQUEST_ERROR",
      message: error.response?.data?.message || error.message || "HTTP request failed",
      status: error.response?.status || 502,
      meta: { url: error.config?.url, method: error.config?.method, status: error.response?.status },
    });
  }

  // 5) Error custom (mis. throw new AppError({...}))
  if (error instanceof AppError) {
    return error;
  }

  // 6) Fallback (error biasa)
  return new AppError({
    code: error.code || "UNKNOWN_ERROR",
    message: error.message || "Unexpected error occurred",
    status: 500,
  });
}

// ---- Query helper: bisa pakai transaksi otomatis
/**
 * prismaQuery helper
 * @param {(db: PrismaClient) => Promise<any>} fn - callback yang menerima prisma / tx
 * @param {{ transaction?: boolean }} [opts]
 * @returns {Promise<any>} hasil JSON-safe (BigInt -> string)
 */
async function prismaQuery(fn, opts = {}) {
  try {
    const run = async (db) => {
      const result = await fn(db);
      return result
    };

    // Jalankan dalam transaksi jika diminta
    if (opts.transaction) {
      return await prisma.$transaction(async (tx) => run(tx));
    }
    return await run(prisma);
  } catch (err) {
    // Petakan ke AppError, lalu lempar lagi supaya middleware/responder menangani uniform
    throw mapToAppError(err);
  }
}

export { prisma, prismaQuery };
