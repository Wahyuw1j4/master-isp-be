import { registerWorker } from "./config/bull.js";
import { compressAndUploadImageToR2 } from "../helpers/compressAndUploadImageToR2.js";
import { uploadR2Queue } from "./queues/uploadR2.js";
import { sendInvoiceQueue } from "./queues/sendInvoice.js";
import { sendWhatsappQueue } from "./queues/sendWhatsapp.js";


// Registrasi worker untuk uploadR2Queue
registerWorker(uploadR2Queue, async (job) => {
    const { imageBuffer, filename, mimeType, options } = job.data;

    try {
        const result = await compressAndUploadImageToR2(
            { buffer: imageBuffer, filename, mimeType },
            options
        );
        console.log(`[uploadR2Queue] Job ${job.id} selesai:`, result);
        return result;
    } catch (error) {
        console.error(`[uploadR2Queue] Job ${job.id} gagal:`, error);
        throw error; // Lempar error agar Bull menandai job sebagai gagal
    }
});

// Registrasi worker untuk sendInvoiceQueue
registerWorker(sendInvoiceQueue, async (job) => {
    const { toEmail, subject, body, attachments } = job.data;

    try {
        // Panggil fungsi untuk mengirim email
    }catch (error) {
        console.error(`[sendInvoiceQueue] Job ${job.id} gagal:`, error);
        throw error; // Lempar error agar Bull menandai job sebagai gagal
    }
    return true;
});

registerWorker(sendWhatsappQueue, async (job) => {
    const { toNumber, message, mediaUrls } = job.data;
    try {
        // Panggil fungsi untuk mengirim pesan WhatsApp
    } catch (error) {
        console.error(`[sendWhatsappQueue] Job ${job.id} gagal:`, error);
        throw error; // Lem
    }
    return true;
});