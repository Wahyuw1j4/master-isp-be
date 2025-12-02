import { createQueue } from "../config/bull.js";

export const runCommandQueue = createQueue("runCommand");

export async function addRunCommandJob(commands, host, username, password, cipher = null, debug = false, delay = 0) {
    return await runCommandQueue.add('runCommand', { commands, host, username, password, cipher, debug }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        delay: delay,
    });
}