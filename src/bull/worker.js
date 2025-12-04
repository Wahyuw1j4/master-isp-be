import { registerWorker } from "./config/bull.js";
import { compressAndUploadImageToR2 } from "../helpers/compressAndUploadImageToR2.js";
import { uploadR2Queue } from "./queues/uploadR2.js";
import { sendInvoiceQueue } from "./queues/sendInvoice.js";
import { sendWhatsappQueue } from "./queues/sendWhatsapp.js";
import { runCommandQueue } from "./queues/runCommand.js";
import { runCommands } from "../helpers/shellCommand.js";
import { hitMikrotikQueue } from "./queues/hitMikrotik.js";
import { getingUncfgQueue } from "./queues/c320GettingUncfg.js";
import { hitMikrotik } from "../helpers/HitMikrotik.js";
import { updateNotification } from "../helpers/Notification.js";
import { getUncfgC320 } from "../bull/job/getUncfgC320.js";

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
    const { commands, host, username, password, cipher, debug, notif } = job.data;
    try {
        const result = await runCommands(commands, host, username, password, cipher, debug);
        switch (notif.notif_identifier) {
            case 'c320-onu-create':
                const updateNotif = await updateNotification(notif.id, {
                    title: 'ONU Service Created',
                    message: `Successfully created ONU service.`,
                    loading: false,
                    status: true,
                });
                break;
            case 'c320-onu-delete':
                const updateNotifDel = await updateNotification(notif.id, {
                    title: 'ONU Service Deleted',
                    message: `Successfully deleted ONU service.`,
                    loading: false,
                    status: true,
                });
                break;
            default:
                // Perbarui notifikasi dengan hasil dari perintah yang dijalankan
                break;
        }
        return result;
    } catch (error) {
        switch (notif.notif_identifier) {
            case 'c320-onu-create':
                const updateNotif = await updateNotification(notif.id, {
                    title: 'ONU Service Creation Failed',
                    message: `Failed to create ONU service.`,
                    loading: false,
                    status: false,
                });
                break;
            case 'c320-onu-delete':
                const updateNotifDel = await updateNotification(notif.id, {
                    title: 'ONU Service Deletion Failed',
                    message: `Failed to delete ONU service.`,
                    loading: false,
                    status: false,
                });
                break;
            default:
                // Perbarui notifikasi dengan informasi kegagalan
                break;
        }
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

registerWorker(getingUncfgQueue, async (job) => {
    try {
        await getUncfgC320();
    } catch (error) {
        console.error(`[getingUncfgQueue] Job ${job.id} gagal:`, error);
        throw error; // Lempar error agar Bull menandai job sebagai gagal
    }
});


