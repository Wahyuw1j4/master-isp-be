// file: compressAndUploadImageToR2.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import mime from "mime";

// Inisialisasi client R2 (kompatibel S3)
const r2Endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Helper kecil
const safeContentType = (filename, given) =>
    (given && given !== "application/octet-stream"
        ? given
        : mime.getType(filename) || "application/octet-stream"
    ).toLowerCase();

const buildS3Key = (prefix, baseName) => {
    return `${prefix ? prefix.replace(/\/+$/, "") + "/" : ""}${baseName}`;
};

/**
 * Kompres gambar (jpeg/png/webp/avif) dan upload ke R2.
 */
export async function compressAndUploadImageToR2({ buffer, filename, mimeType }, { keyPrefix = "uploads", maxWidth = 1920, format = "webp", quality = 80, stripMetadata = true, cacheControl = "public, max-age=31536000, immutable" } = {}) {
    const contentType = safeContentType(filename, mimeType);
    const originalSize = buffer.byteLength;
    let body = buffer;
    let finalContentType = contentType;
    let wasCompressed = false;
    let note;

    if (contentType.startsWith("image/")) {
        if (contentType === "image/gif" || contentType === "image/svg+xml") {
            note = "GIF/SVG tidak dikompres (dibiarkan apa adanya)";
        } else {
            if (!Buffer.isBuffer(buffer)) {
                buffer = Buffer.from(buffer);
            }
            let img = sharp(buffer, { failOnError: false });
            const meta = await img.metadata();

            if (maxWidth && meta.width && meta.width > maxWidth) {
                img = img.resize({ width: maxWidth });
            }
            if (stripMetadata) img = img.withMetadata({});

            if (format === "webp") {
                img = img.webp({ quality });
                finalContentType = "image/webp";
            } else if (format === "avif") {
                img = img.avif({ quality: Math.max(30, Math.min(95, quality)) });
                finalContentType = "image/avif";
            } else if (format === "keep") {
                if (contentType.includes("jpeg") || contentType.includes("jpg"))
                    img = img.jpeg({ quality, mozjpeg: true });
                else if (contentType.includes("png"))
                    img = img.png({ compressionLevel: 9 });
            }

            const out = await img.toBuffer();
            if (out.byteLength <= buffer.byteLength) {
                body = out;
                wasCompressed = true;
            } else {
                note = "Kompresi tidak efektif (hasil lebih besar).";
            }
        }
    } else {
        note = "File bukan gambar, dilewatkan tanpa kompresi.";
    }

    const key = buildS3Key(keyPrefix, filename);

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: finalContentType,
            CacheControl: cacheControl,
        })
    );

    const url = process.env.R2_PUBLIC_BASE
        ? `${process.env.R2_PUBLIC_BASE.replace(/\/+$/, "")}/${encodeURIComponent(key)}`
        : undefined;

    return {
        key,
        url,
        contentType: finalContentType,
        sizeOriginal: originalSize,
        sizeUploaded: body.byteLength,
        wasCompressed,
        note,
    };
}

export async function getR2SignedUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
    })

    const url = await getSignedUrl(s3, command, { expiresIn }) // expiresIn dalam detik (3600 = 1 jam)
    return url
}
