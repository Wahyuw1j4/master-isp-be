import { runCommands } from "../../config/OLT2.js";
import Olt from "../../model/OLT.js";
import Onu from "../../model/Onu.js";
import { workerData, parentPort } from "worker_threads";
import mongoose from "mongoose";
import publishToQueue from "../utilities/rabbitPublisher.js";

const { slug_olt, id, sn, odc_number, subs_id, customer_name, vlan, vlan_profile, speed, network_password } = workerData;

const findMissingNumber = (arr) => {
    return Array.from({ length: 128 }, (_, i) => i + 1).find(n => !arr.includes(n));
}

const reinstallOnu = async (slug_olt, id, sn, odc_number, subs_id, customer_name, vlan, vlan_profile, speed, network_password) => {
    const _id = new mongoose.Types.ObjectId().toString();
    const onu = await Onu.findOne({ _id: id });
    const { onu_index } = onu;
    const olt = await Olt.findOne({ slug_name: slug_olt });
    const ref_id = olt.name + "-reinstall-onu-gpon-onu_" + onu_index;
    try {
        parentPort.postMessage({
            type: 'new-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Reinstall onu gpon-onu_${onu_index} on ${olt.name}`,
                message: `Please wait, reinstall onu gpon-onu_${onu_index} on ${olt.name}`,
                category: "reinstall-onu",
                status: "running",
                is_loading: true,
            }
        })

        if (!olt) {
            parentPort.postMessage({
                type: 'finish-notification', data: {
                    _id: _id,
                    ref_id: ref_id,
                    title: `Failed to reinstall onu gpon-onu_${onu_index} on ${slug_olt}`,
                    message: `OLT not found`,
                    category: "reinstall-onu",
                    status: "error",
                    is_loading: false,
                }
            });
        }
        if (!onu) {
            parentPort.postMessage({
                type: 'finish-notification', data: {
                    _id: _id,
                    ref_id: ref_id,
                    title: `Failed to reinstall onu gpon-onu_${onu_index} on ${slug_olt}`,
                    message: `ONU not found`,
                    category: "reinstall-onu",
                    status: "error",
                    is_loading: false,
                }
            });
        }

        const { ip_address, username, password, cipher } = olt;

        const splitOnuIndex = onu_index.split(":");
        const onu_number = splitOnuIndex[1];

        const oltOnu = splitOnuIndex[0].split("/");
        const slot_number = oltOnu[1];
        const port_number = oltOnu[2];

        const commands = [
            'conf t',
            `interface gpon-olt_1/${slot_number}/${port_number}`,
            `no onu ${onu_number}`
        ];
        console.log('[DEBUG] delete onu command');
        const response = await runCommands(commands, ip_address, username, password, cipher);

        if (response.includes(".[Successful]")) {
            const commands1 = [
                'conf t',
                'show gpon onu uncfg'
            ];
            let slotNumber = 1
            let portNumber = 0
            if (odc_number <= 16) {
                slotNumber = 1
                portNumber = odc_number
            } else {
                slotNumber = 2
                portNumber = odc_number - 16
            }

            console.log('[DEBUG] waiting 10 seconds for the command to take effect');
            await new Promise(resolve => setTimeout(resolve, 10000));
            console.log('[DEBUG] show gpon onu uncfg command');

            const commandOutput1 = await runCommands(commands1, olt.ip_address, olt.username, olt.password, olt.cipher);

            const dataRow = commandOutput1.split('\n').map(row => row.trim()).slice(6, -1);
            const dataRowSpaces = dataRow.map(row => row.split(/\s+/));
            let realSpeed = 0
            if (speed >= 5 && speed <= 10) {
                realSpeed = 30
            } else if (speed >= 20 && speed <= 30) {
                realSpeed = 50
            } else if (speed >= 40 && speed <= 80) {
                realSpeed = 100
            } else {
                realSpeed = speed
            }

            if (dataRowSpaces.some(unconfig => unconfig[1].toLowerCase() === sn.toLowerCase())) {
                const commands2 = [
                    'conf t',
                    `interface gpon-olt_1/${slotNumber}/${portNumber}`,
                    `onu ${onu_number} type ZTE sn ${sn}`,
                    '!',
                    `interface gpon-onu_1/${slotNumber}/${portNumber}:${onu_number}`,
                    `name ${subs_id} - ${customer_name.toUpperCase()}`,
                    `description CUSTOMER ${vlan_profile} ${customer_name.toUpperCase()}`,
                    `tcont 1 name ${vlan_profile} profile ${realSpeed}M`,
                    `gemport 1 name ${vlan_profile} tcont 1`,
                    `gemport 1 traffic-limit upstream ${realSpeed}M downstream ${realSpeed}M`,
                    `service-port 1 vport 1 user-vlan ${vlan} vlan ${vlan}`,
                    '!',
                    `pon-onu-mng gpon-onu_1/${slotNumber}/${portNumber}:${onu_number}`,
                    `service 1 gemport 1 vlan ${vlan}`,
                    `wan-ip 1 mode pppoe username ${subs_id} password ${network_password} vlan-profile ${vlan_profile} host 1`,
                    'security-mgmt 1 state enable mode forward protocol web',
                ]

                console.log(commands2);

                onu.serial_number = sn;
                onu.subs_id = subs_id;
                onu.customer_name = customer_name;
                onu.onu_number = onu_number;
                onu.onu_index = `1/${slotNumber}/${portNumber}:${onu_number}`;
                onu.onu_name = `${subs_id} - ${customer_name.toUpperCase()}`;
                onu.ref_id = subs_id;
                onu.vlan = vlan;

                onu.save().then(() => {
                    console.log('Onu updated successfully');
                }).catch((error) => {
                    console.error('Error updating onu:', error);
                });

                await runCommands(commands2, olt.ip_address, olt.username, olt.password, olt.cipher);

                parentPort.postMessage({
                    type: 'finish-notification', data: {
                        _id: _id,
                        ref_id: ref_id,
                        title: `Onu gpon-onu_${onu_index} reinstall successfully on ${slug_olt}`,
                        message: `Onu reinstall successfully`,
                        category: "reinstall-onu",
                        status: "success",
                        is_loading: false,
                    }
                });

                await publishToQueue('onu_service', JSON.stringify({
                    category: "reinstall-onu",
                    slug_olt: slug_olt,
                    id: onu._id,
                }));
            } else {
                console.log(response);
                parentPort.postMessage({
                    type: 'finish-notification', data: {
                        _id: _id,
                        ref_id: ref_id,
                        title: `Failed to reinstall onu gpon-onu_${onu_index} on ${slug_olt}`,
                        message: 'Onu reinstall Failed',
                        category: "reinstall-onu",
                        status: "error",
                        is_loading: false,
                    }
                });
            }

            parentPort.postMessage({ type: 'end-worker' });
        } else {
            console.log(response);
            parentPort.postMessage({
                type: 'finish-notification', data: {
                    _id: _id,
                    ref_id: ref_id,
                    title: `Failed to reinstall onu gpon-onu_${onu_index} on ${slug_olt}`,
                    message: `Onu reinstall Failed onu gpon-onu_${onu_index} on ${slug_olt}`,
                    category: "reinstall-onu",
                    status: "error",
                    is_loading: false,
                }
            });
            parentPort.postMessage({ type: 'end-worker' });
            parentPort.postMessage({ stack: response.stack });
        }
    } catch (error) {
        console.error(error);
        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Failed to reinstall onu gpon-onu_${onu_index} on ${slug_olt}`,
                message: error.message,
                category: "reinstall-onu",
                status: "error",
                is_loading: false,
            }
        });
        parentPort.postMessage({ stack: error.stack });
        parentPort.postMessage({ type: 'end-worker' });
    }
}


// Initialize MongoDB connection in worker
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB in worker");
    await reinstallOnu(slug_olt, id, sn, odc_number, subs_id, customer_name, vlan, vlan_profile, speed, network_password);
}).catch(err => {
    console.error(err);
    parentPort.postMessage(`Database connection error: ${err.message}`);
});