import { createQueue } from "../config/bull.js";

export const sendInvoiceQueue = createQueue("sendInvoice");

export async function addSendInvoiceJob(payload) {
    return await sendInvoiceQueue.add('sendInvoice', payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 6000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}