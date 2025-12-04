import { createQueue } from "../config/bull.js";

export const getingUncfgQueue = createQueue("getingUncfg");

export async function addGetingUncfgJob() {
    console.log('Adding getingUncfg job to the queue');
    return await getingUncfgQueue.add('getingUncfg', {}, {
        // attempts: 3,
        // backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        repeat: { cron: '*/5 * * * *' }, // every 2 minutes
    });
}