#!/usr/bin/env node
import 'dotenv/config';
import { createQueue } from '../src/bull/config/bull.js';

// Daftar nama queue yang digunakan di project
const QUEUE_NAMES = ['runCommand', 'uploadR2', 'sendWhatsapp', 'sendInvoice'];

async function clearQueue(name) {
  console.log(`Clearing queue: ${name}`);
  const q = createQueue(name);
  try {
    // Pause processing to avoid workers picking jobs while we clean
    await q.pause(true);

    // Remove waiting / paused jobs
    await q.empty();

    // Clean delayed / completed / failed jobs (0 ms grace)
    try { await q.clean(0, 'delayed'); } catch (e) { /* ignore */ }
    try { await q.clean(0, 'completed'); } catch (e) { /* ignore */ }
    try { await q.clean(0, 'failed'); } catch (e) { /* ignore */ }

    // Remove repeatable jobs
    const repeatables = await q.getRepeatableJobs();
    for (const r of repeatables || []) {
      try {
        if (r.key) {
          await q.removeRepeatableByKey(r.key);
          console.log(`  removed repeatable by key: ${r.key}`);
        } else if (r.name && r.cron) {
          await q.removeRepeatable(r.name, { cron: r.cron, tz: r.tz });
          console.log(`  removed repeatable: ${r.name} cron=${r.cron}`);
        }
      } catch (err) {
        console.warn(`  failed to remove repeatable ${r.name || r.key}:`, err?.message || err);
      }
    }

    console.log(`  emptied and cleaned ${name}`);
  } catch (err) {
    console.error(`Error clearing queue ${name}:`, err?.message || err);
  } finally {
    try { await q.close(); } catch (e) { /* ignore close errors */ }
  }
}

async function main() {
  console.log('Starting Redis/Bull cleanup script');
  for (const name of QUEUE_NAMES) {
    // eslint-disable-next-line no-await-in-loop
    await clearQueue(name);
  }

  // Optional full flush if env var FORCE_FLUSH=true is set
  if (process.env.FORCE_FLUSH === 'true') {
    console.warn('FORCE_FLUSH=true detected — flushing entire Redis DB (dangerous)');
    // Use the queue connection to get Redis client and flushdb
    const q = createQueue('__flush_probe__');
    try {
      const client = q.client || q.redis || q.redisClient;
      if (client && typeof client.flushdb === 'function') {
        await client.flushdb();
        console.log('Redis DB flushed');
      } else if (client && typeof client.sendCommand === 'function') {
        await client.sendCommand(['FLUSHDB']);
        console.log('Redis DB flushed via sendCommand');
      } else {
        console.warn('Unable to locate Redis client to flush DB');
      }
    } catch (err) {
      console.error('Error flushing DB:', err?.message || err);
    } finally {
      try { await q.close(); } catch (e) {}
    }
  }

  console.log('Done. No jobs should remain in queues listed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
