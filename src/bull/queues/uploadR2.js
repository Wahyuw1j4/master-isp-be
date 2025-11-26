import { createQueue } from "../config/bull.js";

export const uploadR2Queue = createQueue("uploadR2");

export async function addUploadR2Job(payload) {
    return await uploadR2Queue.add(
        "uploadR2",
        payload,
        {
            attempts: 5,
            backoff: { type: 'exponential', delay: 6000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
}
