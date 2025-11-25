import { PrismaClient, Prisma } from "../generated/prisma/index.js";
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


const prisma = new PrismaClient({
  log: [],
});


prisma.$on("query", (e) => {
  if (process.env.NODE_ENV !== "production") {
    if (e.params?.length <= 500) console.debug("[PRISMA:PARAMS]", e.params);
    console.debug("[PRISMA:DURATION]", `${e.duration}ms`);
  }
});

const isAxiosError = (err) =>
  !!err &&
  typeof err === "object" &&
  (err.isAxiosError === true || (err.config && (err.response || err.request)));

function trimPrismaMessage(msg = "") {

  return msg.replace(/\s+at\s+.+/gs, "").replace(/Invalid `.+?` invocation:\s*/s, "").trim();
}

function mapToAppError(error) {

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError({
      code: "VALIDATION_ERROR",
      message: "Invalid data sent to database",
      status: 422,
      meta: { detail: trimPrismaMessage(error.message) },
    });
  } if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = error.code;
    switch (code) {
      case "P2002":
        return new AppError({
          code: "DUPLICATE_KEY",
          message: `Duplicate value for field(s): ${Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.meta?.target || "unknown"}`,
          status: 409,
        });
      case "P2003":
        return new AppError({
          code: "FOREIGN_KEY_CONSTRAINT",
          message: `Invalid relation or foreign key: ${error.meta?.field_name || "unknown field"}`,
          status: 409,
        });
      case "P2000":
        return new AppError({
          code: "VALUE_TOO_LONG",
          message: `Value too long for column: ${error.meta?.column_name || "unknown column"}`,
          status: 422,
        });
      case "P2001":
      case "P2025":
        return new AppError({
          code: "NOT_FOUND",
          message: "Record not found",
          status: 404,
        });
      case "P2014":
        return new AppError({
          code: "INVALID_RELATION",
          message: "The change would violate a relation",
          status: 409,
        });
      case "P2016":
      case "P2019":
        return new AppError({
          code: "QUERY_INTERPRETATION_ERROR",
          message: "Query interpretation error",
          status: 400,
          meta: { detail: trimPrismaMessage(error.message) },
        });
      case "P2017":
        return new AppError({
          code: "RECORDS_NOT_CONNECTED",
          message: "Records not connected",
          status: 400,
        });
      case "P2021":
      case "P2022":
        return new AppError({
          code: "SCHEMA_MISMATCH",
          message: "Database schema mismatch (missing table/column). Did you run migrations?",
          status: 500,
        });
      case "P2033":
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
  } if (error instanceof Prisma.PrismaClientUnknownRequestError) {
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
  if (isAxiosError(error)) {
    return new AppError({
      code: "HTTP_REQUEST_ERROR",
      message: error.response?.data?.message || error.message || "HTTP request failed",
      status: error.response?.status || 502,
      meta: { url: error.config?.url, method: error.config?.method, status: error.response?.status },
    });
  }
  if (error instanceof AppError) {
    return error;
  }
  return new AppError({
    code: error.code || "UNKNOWN_ERROR",
    message: error.message || "Unexpected error occurred",
    status: 500,
  });
}

async function prismaQuery(fn, opts = {}) {
  try {
    const run = async (db) => {
      const result = await fn(db);
      return result
    };

    if (opts.transaction) {
      return await prisma.$transaction(async (tx) => run(tx));
    }
    return await run(prisma);
  } catch (err) {

    throw mapToAppError(err);
  }
}

async function prismaTx(fn, opts = {}) {
  const { timeout, maxWait } = opts;
  const afterCommitFns = []; try {
    const result = await prisma.$transaction(
      async (tx) => {
        /**
         * Register function yang hanya akan dipanggil
         * SETELAH transaction berhasil commit.
         */
        const registerAfterCommit = (cb) => {
          if (typeof cb === "function") {
            afterCommitFns.push(cb);
          }
        };

        return await fn(tx, registerAfterCommit);
      },
      { timeout, maxWait }
    );

    for (const cb of afterCommitFns) {
      try {
        await cb();
      } catch (err) {

        console.error("[AFTER_COMMIT_ERROR]", err);
      }
    }
    return result;
  } catch (err) {

    throw mapToAppError(err);
  }
}

export { prisma, prismaQuery, prismaTx };
