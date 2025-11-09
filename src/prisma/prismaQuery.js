import { Prisma } from "@prisma/client";

export async function safeParser(promise) {
    try {
        const data = await promise;
        return { data, error: null };
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            switch (err.code) {
                case "P2002":
                    return { data: null, error: "Data sudah ada (duplicate key)" };
                case "P2003":
                    return { data: null, error: "Relasi tidak valid (foreign key)" };
                case "P2025":
                    return { data: null, error: "Data tidak ditemukan" };
                default:
                    return { data: null, error: `Prisma error: ${err.code}` };
            }
        }

        return { data: null, error: err.message || "Unexpected error" };
    }
}
