// src/lib/queue.js
import Queue from 'bull';
import 'dotenv/config';

/**
 * Base Redis config
 */
const baseRedisConfig = {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

/**
 * Membuat instance Queue dengan logging dasar
 */
export function createQueue(name) {
  const queue = new Queue(name, baseRedisConfig);

  queue.on('error', (err) => {
    console.error(`[Queue:${name}] error`, err);
  });

  queue.on('failed', (job, err) => {
    console.error(
      `[Queue:${name}] job ${job.id} failed (attempts: ${job.attemptsMade})`,
      err?.message || err
    );
  });

  queue.on('completed', (job, result) => {
    console.log(`[Queue:${name}] job ${job.id} completed`, result || '');
  });

  return queue;
}

/**
 * Registrasi worker untuk queue tertentu
 */
export function registerWorker(queue, processor, options = {}) {
  const concurrency = options.concurrency || 1;
  const name = queue.name;

  console.log(`[Worker:${name}] starting with concurrency=${concurrency}`);

  // Register a named handler matching the queue name (for jobs added with a type/name)
  // e.g. `queue.add('uploadR2', payload)` will be handled by this processor when queue.name === 'uploadR2'
  try {
    queue.process(name, concurrency, async (job) => {
      try {
        return await processor(job);
      } catch (err) {
        console.error(
          `[Worker:${name}] job ${job.id} processor error`,
          err?.message || err
        );
        throw err;
      }
    });
  } catch (e) {
    // Some Bull versions may throw if overloads mismatch; fall back gracefully below
  }

  // Also register a default (unnamed) handler for jobs added without a name
  queue.process(concurrency, async (job) => {
    try {
      return await processor(job);
    } catch (err) {
      console.error(
        `[Worker:${name}] job ${job.id} processor error`,
        err?.message || err
      );
      throw err;
    }
  });
}