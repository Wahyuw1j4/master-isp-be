import { createQueue } from "../config/bull.js";

export const sendWhatsappQueue = createQueue("sendWhatsapp");

export async function addSendWhatsappJob(payload) {
    return await sendWhatsappQueue.add('sendWhatsapp', payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 6000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}