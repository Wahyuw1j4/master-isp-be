import snmp from "net-snmp";
import { prismaQuery, prisma } from "../prisma.js";
import fetch from "node-fetch";

function createSnmpSession(host, community) {
    return snmp.createSession(host, community, {
        version: snmp.Version2c,
        timeout: 2500,
        retries: 1,
    });
}

// GET sekali, return varbind atau throw
function getOnce(session, oid) {
    return new Promise((resolve, reject) => {
        session.get([oid], (err, varbinds) => {
            if (err) return reject(err);
            const vb = varbinds?.[0];
            if (!vb) return reject(new Error('Empty varbind'));
            if (snmp.isVarbindError(vb)) return reject(new Error(snmp.varbindError(vb)));
            resolve(vb);
        });
    });
}

// Bulkwalk kolom (tanpa index) untuk warm-up
function bulkwalkColumn(session, columnRoot, maxRepetitions = 10) {
    return new Promise((resolve, reject) => {
        const rows = [];
        session.bulkWalk(columnRoot, maxRepetitions, (varbinds) => {
            for (const vb of varbinds) {
                if (!snmp.isVarbindError(vb)) rows.push(vb);
            }
        }, (err) => (err ? reject(err) : resolve(rows)));
    });
}

//$res = $val == 65535 ? null : ($val > 30000) ?  ($val - 65536) * 0.002 - 30 : $val * 0.002 - 30
function convertValue(val) {
    if (val === 65535) return null;
    if (val > 30000) return (val - 65536) * 0.002 - 30;
    return val * 0.002 - 30;
}

async function safeGet(session, instanceOid, opts = {}) {
    const {
        columnRoot,
        delayMs = 150,
        warmupOnFail = true,
    } = opts;

    // 1st try
    try {
        return await getOnce(session, instanceOid);
    } catch (e) {
        const msg = String(e.message || e);
        const looksLikeNoSuch =
            /nosuchname|nosuchinstance|nosuchobject/i.test(msg);

        if (!looksLikeNoSuch) throw e;

        // Backoff kecil
        await new Promise(r => setTimeout(r, delayMs));

        // Warm-up tabel kalau diminta & ada columnRoot
        if (warmupOnFail && columnRoot) {
            try { await bulkwalkColumn(session, columnRoot, 15); } catch (_) { /* ignore */ }
            // Backoff lagi sebentar
            await new Promise(r => setTimeout(r, delayMs));
        }

        // Retry final
        return await getOnce(session, instanceOid);
    }
}

const getSnmpArray = async (session, oidList) => {
    return new Promise((resolve, reject) => {
        session.get(oidList, (err, varbinds) => {
            if (err) return reject(err);
            // Convert Buffer values to strings for easier handling
            const processedVarbinds = varbinds.map(vb => {
                if (Buffer.isBuffer(vb.value)) {
                    return { ...vb, value: vb.value };
                }
                return vb;
            });
            resolve(processedVarbinds);
        });
    });
}

const getSubs = async () => {
    try {
        const subscriptions = await prismaQuery(() =>
            prisma.subscriptions.findMany({
                select: {
                    id: true,
                    customer_name: true,
                    serial_number: true,
                    status: true,
                    olt: {
                        select: {
                            id: true,
                            ip_address: true,
                            read_community: true,
                        }
                    },
                    onus: {
                        select: {
                            id: true,
                            oid_identifier: true,
                        }
                    }
                }
            })
        );
        return subscriptions;
    } catch (err) {
        console.log('Error fetching subscriptions:', err);
    }
}

const setStatusOltC320 = (status) => {
    const statusMap = {
        "0": "logging",
        "1": "LOS",
        "2": "syncMib",
        "3": "Online",
        "4": "PowerOff",
        "5": "authFailed",
        "6": "Offline"
    };
    return statusMap[String(status)] || null;
};

const hitInternalEndpoint = async (data) => {
    try {
        const response = await fetch('http://localhost:3000/socketxyz/internal/emit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            console.error('Failed to hit internal endpoint:', response.statusText);
        } else {
            console.log('hit OK');
        }
    } catch (error) {
        console.error('Error hitting internal endpoint:', error);
    }
};

try {
    const subscriptions = await getSubs();
    for (const sub of subscriptions) {
        // await new Promise(resolve => setTimeout(resolve, 200)); // stagger requests by 200ms
        if (sub.olt && sub.onus && sub.onus.length > 0) {
            try {
                // console.log('oid:', `1.3.6.1.4.1.3902.1012.3.50.12.1.1.10${sub.onus[0].oid_identifier}`, 'community read:', sub.olt.read_community, 'ip:', sub.olt.ip_address);
                const session = createSnmpSession(sub.olt.ip_address, sub.olt.read_community);
                const oidRx = `1.3.6.1.4.1.3902.1012.3.50.12.1.1.10${sub.onus[0].oid_identifier}.1`;
                const checkOidRx = await prismaQuery(() =>
                    prisma.snmp_values.findUnique({
                        where: {
                            onu_id_metric_key: {
                                onu_id: sub.onus[0].id,
                                metric_key: 'rx'
                            }
                        }
                    })
                );
                if (!checkOidRx) {
                    console.log('Inserting new OID record for RX:', oidRx);
                    const saveRx = await safeGet(session, oidRx);
                    await prismaQuery(() => prisma.snmp_values.upsert({
                        where: {
                            onu_id_metric_key: {
                                onu_id: sub.onus[0].id,
                                metric_key: 'rx'
                            }
                        },
                        update: {
                            value: String(convertValue(saveRx.value)),
                            updated_at: new Date()
                        },
                        create: {
                            onu_id: sub.onus[0].id,
                            metric_key: 'rx',
                            oid: oidRx,
                            value: String(convertValue(saveRx.value)),
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    }));
                } else {
                    const oidStatus = "1.3.6.1.4.1.3902.1012.3.28.2.1.4" + sub.onus[0].oid_identifier; // operStatus
                    const saveStatus = await safeGet(session, oidStatus)
                    const checkStatus = await prismaQuery(() =>
                        prisma.snmp_values.findUnique({
                            where: {
                                onu_id_metric_key: {
                                    onu_id: sub.onus[0].id,
                                    metric_key: 'status'
                                }
                            }
                        })
                    );

                    if (checkStatus?.value && checkStatus.value == setStatusOltC320(saveStatus.value)) {
                        console.log('Status unchanged, skipping update for ONU ID:', sub.onus[0].id);
                        continue;
                    } else if (checkStatus?.value && checkStatus.value != setStatusOltC320(saveStatus.value)) {
                        const saveRx = await safeGet(session, oidRx);
                        const upsertRx = await prismaQuery(() => prisma.snmp_values.upsert({
                            where: {
                                onu_id_metric_key: {
                                    onu_id: sub.onus[0].id,
                                    metric_key: 'rx'
                                }
                            },
                            update: {
                                value: String(convertValue(saveRx.value)),
                                updated_at: new Date()
                            },
                            create: {
                                onu_id: sub.onus[0].id,
                                metric_key: 'rx',
                                oid: oidRx,
                                value: String(convertValue(saveRx.value)),
                                created_at: new Date(),
                                updated_at: new Date()
                            }
                        }));

                        const upsertStatus = await prismaQuery(() => prisma.snmp_values.upsert({
                            where: {
                                onu_id_metric_key: {
                                    onu_id: sub.onus[0].id,
                                    metric_key: 'status'
                                }
                            },
                            update: {
                                value: String(setStatusOltC320(saveStatus.value)),
                                updated_at: new Date()
                            },
                            create: {
                                onu_id: sub.onus[0].id,
                                metric_key: 'status',
                                oid: oidStatus,
                                value: String(setStatusOltC320(saveStatus.value)),
                                created_at: new Date(),
                                updated_at: new Date()
                            }
                        }));

                        console.log('Upserting RX:', upsertRx);
                        console.log('Upserting Status:', upsertStatus);
                        await hitInternalEndpoint({ "event": "coverage-notif", "data": { "status": upsertStatus, "rx": upsertRx, "subscription_id": sub.id } });

                    } else {
                        await prismaQuery(() => prisma.snmp_values.upsert({
                            where: {
                                onu_id_metric_key: {
                                    onu_id: sub.onus[0].id,
                                    metric_key: 'status'
                                }
                            },
                            update: {
                                value: String(setStatusOltC320(saveStatus.value)),
                                updated_at: new Date()
                            },
                            create: {
                                onu_id: sub.onus[0].id,
                                metric_key: 'status',
                                oid: oidStatus,
                                value: String(setStatusOltC320(saveStatus.value)),
                                created_at: new Date(),
                                updated_at: new Date()
                            }
                        }));
                        console.log('Updating existing OID record for RX:', String(setStatusOltC320(saveStatus.value)));
                    }
                }

                // sleep 100 ms between requests to avoid overwhelming the SNMP agent
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                continue;
            }
            // break;
        }
    }
} catch (err) {
    console.error('Error fetching subscriptions:', err);
}


// try {
//     const subscriptions = await getSubs();
//     for (const sub of subscriptions) {
//         // await new Promise(resolve => setTimeout(resolve, 200)); // stagger requests by 200ms
//         if (sub.olt && sub.onus && sub.onus.length > 0) {
//             try {
//                 console.log('community read:', sub.olt.read_community, 'ip:', sub.olt.ip_address);
//                 const session = createSnmpSession(sub.olt.ip_address, sub.olt.read_community);
//                 const result = await getSnmpArray(session, [`1.3.6.1.4.1.3902.1012.3.50.12.1.1.10${sub.onus[0].oid_identifier}`]);
//                 console.log('SNMP Get Result:', result);
//             } catch (error) {
//                 console.error('SNMP Get Error:', error);
//             }
//             break;
//         }
//     }
// } catch (err) {
//     console.error('Error fetching subscriptions:', err);
// }