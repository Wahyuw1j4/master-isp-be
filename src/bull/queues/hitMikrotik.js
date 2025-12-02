import { createQueue } from "../config/bull.js";

export const hitMikrotikQueue = createQueue("hitMikrotik");

export async function hitMikrotikJob({url, method, body = null, headers = {}, delay = 0}) {
    return await hitMikrotikQueue.add('hitMikrotik', {url, method, body, headers}, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        delay: delay,
    });
}