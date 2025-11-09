import {prisma} from '../src/prisma/prisma.js';
import fs from 'fs';

async function main() {
    // baca file JSON
    const raw = fs.readFileSync('prisma/data/c320_oid.json', 'utf-8');
    const parsed = JSON.parse(raw);

    for (const device of parsed) {
        for (const item of device.data) {
            await prisma.oid_map.upsert({
                where: {
                    profile_metric_key: {
                        profile: item.profile,
                        metric_key: item.metric_key
                    }
                },
                update: {
                    oid: item.oid,
                    values: item.values || undefined,
                    formula: item.formula || undefined
                },
                create: {
                    profile: item.profile,
                    metric_key: item.metric_key,
                    oid: item.oid,
                    values: item.values || undefined,
                    formula: item.formula || undefined
                }
            });
        }
    }
}

main()
    .then(async () => {
        console.log('✅ OID C320 map seeded!');
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
