import { get } from "https";
import prisma from "../src/prisma.js";
import snmp from "net-snmp";


function snmpgetbulk(oid, host, community, maxRepetitions = 50) {
    return new Promise((resolve, reject) => {
        const session = snmp.createSession(host, community, { version: snmp.Version2c });
        session.getBulk([oid], 0, maxRepetitions, (error, varbinds) => {
            session.close();
            if (error) return reject(error);

            const results = varbinds.map(vb => ({
                oid: vb.oid,
                type: vb.type,
                value: Buffer.isBuffer(vb.value) ? vb.value.toString().trim() : vb.value
            }));

            resolve(results);   // <--- ini yang ngirim hasil ke .then()
        });
    });
}


const getOlt = async () => {
    const olts = await prisma.olt.findMany({
        where: {
            type: 'GPON',
        },
    });
    return olts;
}

const mappingOid = async () => {
    const olts = await getOlt();
    const brands = [...new Set(olts.map(olt => olt.brand))];
    const mappings = await prisma.oid_map.findMany({
        where: {
            profile: { in: brands },
        }
    });
    return mappings;
}

const setSnmpValue = async () => {
    const olts = await getOlt();
    const mappings = await mappingOid();
    for (const data of mappings) {
        // kumpulin semua snmpwalk dalam 1 batch
        const promises = olts.map(element => {
            return snmpwalk(data.oid, element.ip_address, element.read_community)
                .then(res => {
                    const pretty = res.map(v => ({
                        oid: v.oid,
                        type: v.type,
                        value: Buffer.isBuffer(v.value) ? v.value.toString().trim() : v.value
                    }));
                    console.log('res pretty:', {
                        ip: element.ip_address,
                        oid: data.oid,
                        metric: data.metric_key,
                        count: pretty.length,
                        values: pretty
                    });
                    return pretty;
                })
                .catch(err => {
                    console.error('err:', {
                        ip: element.ip_address,
                        oid: data.oid,
                        metric: data.metric_key,
                        msg: err.message || err
                    });
                    return [];
                });
        });

        // tunggu semua OLT untuk OID ini selesai
        await Promise.all(promises);

        break; // ⬅️ di sini baru break, setelah semua OLT selesai eksekusi OID pertama
    }
}

async function snmpWalkAndExit(target, community, baseOid, {
    maxRepetitions = 25,
    timeout = 3000,
    retries = 1,
} = {}) {
    return await new Promise((resolve, reject) => {
        const session = snmp.createSession(target, community, {
            version: snmp.Version2c,
            timeout,
            retries,
        });

        const results = [];
        let shouldStop = false;

        session.walk(
            baseOid,
            maxRepetitions,
            (varbinds) => {
                if (shouldStop) return;
                for (const vb of varbinds) {
                    if (snmp.isVarbindError(vb)) {
                        shouldStop = true;
                        return reject(snmp.varbindError(vb));
                    }
                    if (!vb.oid.startsWith(baseOid)) {
                        shouldStop = true;
                        break;
                    }
                    console.log('OID:', vb.oid, 'Value:', vb.value);
                    results.push({ oid: vb.oid, value: String(vb.value) });
                }
            },
            (error) => {
                session.close();
                if (error && !shouldStop) return reject(error);
                resolve(results);
            }
        );
    });
}

snmpgetbulk("1.3.6.1.4.1.3902.1012.3.28.1.1.2", "136.1.1.100", "pajangro", 50)
    .then(res => {
        console.log("hasil bulk:", res);
    })
    .catch(err => {
        console.error("error bulk:", err);
    });