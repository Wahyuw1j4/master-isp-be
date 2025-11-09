// prisma-error.js (ESM JavaScript)
import { Prisma } from '@prisma/client'
import mapping from './prismaErrorMap.json' with { type: 'json' }

/**
 * Render "{token}" placeholders using provided meta (if any).
 * Unknown tokens are left as-is.
 */
function renderTemplate(template, meta) {
    if (!meta || typeof template !== 'string') return template
    return template.replace(/\{(\w+)\}/g, (_, k) => String(meta?.[k] ?? `{${k}}`))
}

/**
 * Build a NormalizedError shape that you can send to clients or logs.
 * @param {unknown} err - any thrown error (Prisma or non-Prisma)
 * @returns {{ name: string, code?: string, httpStatus: number, message: string, details?: object }}
 */
export function normalizePrismaError(err) {
    // Prisma "known request error" (has .code and .meta)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const entry = mapping[err.code]
        if (entry) {
            return {
                name: err.name,
                code: err.code,
                httpStatus: entry.status,
                message: renderTemplate(entry.msg, err.meta),
                // keep raw info only for logs (avoid exposing to clients in prod)
                details: { meta: err.meta }
            }
        }
        // Fallback for unknown future codes
        return {
            name: err.name,
            code: err.code,
            httpStatus: 400,
            message: err.message,
            details: { meta: err.meta }
        }
    }

    // Prisma validation error (schema/client-side)
    if (err instanceof Prisma.PrismaClientValidationError) {
        return {
            name: err.name,
            httpStatus: 400,
            message: 'Validation error when preparing the Prisma query.',
            details: { message: err.message }
        }
    }

    // Prisma initialization/connection errors
    if (err instanceof Prisma.PrismaClientInitializationError) {
        // Try to parse a P1xxx code embedded in message if present
        const match = /P1\d{3}/.exec(err.message)
        if (match && mapping[match[0]]) {
            const entry = mapping[match[0]]
            return {
                name: err.name,
                code: match[0],
                httpStatus: entry.status,
                message: entry.msg,
                details: { message: err.message }
            }
        }
        return {
            name: err.name,
            httpStatus: 503,
            message: 'Failed to initialize Prisma Client (database may be unavailable).',
            details: { message: err.message }
        }
    }

    // Prisma unknown request error (rare)
    if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        return {
            name: err.name,
            httpStatus: 500,
            message: 'Unknown error from the database engine.',
            details: { message: err.message }
        }
    }

    // Prisma Rust panic (engine crashed)
    if (err instanceof Prisma.PrismaClientRustPanicError) {
        return {
            name: err.name,
            httpStatus: 500,
            message: 'The Prisma engine panicked. Please check your schema and environment.',
            details: { message: err.message }
        }
    }

    // Generic fallback for non-Prisma errors
    return {
        name: err?.name || 'Error',
        httpStatus: 500,
        message: err?.message || 'Internal Server Error'
    }
}

/**
 * Express-compatible error handler middleware.
 * Send safe messages to clients; log details for diagnostics.
 */
export function prismaErrorMiddleware() {
    return (err, req, res, next) => {
        const norm = normalizePrismaError(err)

        // Example: log details (adjust to your logger)
        if (process.env.NODE_ENV !== 'production' && norm.details) {
            // eslint-disable-next-line no-console
            console.error('[PrismaError]', norm)
        }

        res
            .status(norm.httpStatus || 500)
            .json({
                error: {
                    name: norm.name,
                    code: norm.code,
                    message: norm.message
                }
            })
    }
}
