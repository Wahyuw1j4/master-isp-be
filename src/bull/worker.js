import { registerWorker } from "./config/bull.js";
import { compressAndUploadImageToR2 } from "../helpers/compressAndUploadImageToR2.js";
import { uploadR2Queue } from "./queues/uploadR2.js";
import { sendInvoiceQueue } from "./queues/sendInvoice.js";
import { sendWhatsappQueue } from "./queues/sendWhatsapp.js";
import { runCommandQueue } from "./queues/runCommand.js";
import { runCommands } from "../helpers/shellCommand.js";
import { hitMikrotikQueue } from "./queues/hitMikrotik.js";
import { hitMikrotik } from "../helpers/HitMikrotik.js";
import axios from "axios";

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
    } catch (error) {
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

registerWorker(runCommandQueue, async (job) => {
    const { commands, host, username, password, cipher, debug } = job.data;
    try {
        const result = await runCommands(commands, host, username, password, cipher, debug);
        await axios.post('http://localhost:3000/socketxyz/internal/emit', {
            event: 'create-onu',
            data: { jobId: job.id, message: "Notif create success" }
        });
        return result;
    } catch (error) {
        console.error(`[runCommandQueue] Job ${job.id} gagal:`, error);
        throw error; // Lempar error agar Bull menandai job sebagai gagal
    }
});

registerWorker(hitMikrotikQueue, async (job) => {
    const { url, method, body = null, headers = {} } = job.data;
    try {
        const hitMikrotikResult = await hitMikrotik(url, method, body, headers);
        return hitMikrotikResult;
    } catch (error) {
        console.error(`[hitMikrotikQueue] Job ${job.id} gagal:`, error);
        throw error; // Lempar error agar Bull menandai job sebagai gagal
    }
});
