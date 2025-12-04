import { createQueue } from "../config/bull.js";

export const runCommandQueue = createQueue("runCommand");

export async function addRunCommandJob(delay = 0, {commands, host, username, password, cipher = null, debug = false, notif = {}}) {
    return await runCommandQueue.add('runCommand', { commands, host, username, password, cipher, debug, notif }, {
        // attempts: 3,
        // backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
        delay: delay,
    });
}