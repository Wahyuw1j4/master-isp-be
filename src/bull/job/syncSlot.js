
import { parentPort, workerData } from 'worker_threads';
import OLTSite from '../../model/OLT.js';
import { runCommands } from '../../config/OLT2.js';
import mongoose from "mongoose";
import Port from '../../model/port.js';
import Onu from '../../model/Onu.js';
import { getOnus, getOnuDetails } from "../utilities/OnuUtils.js";


const { slug_olt } = workerData

const getSlot = async (slug_olt) => {
    const _id = new mongoose.Types.ObjectId().toString();
    try {
        const ref_id = slug_olt + "-get-slot";
        parentPort.postMessage({
            type: 'new-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Synchronizing slot data in ${slug_olt}`,
                message: `Please wait, getting slot`,
                category: "get-slot",
                status: "running",
                is_loading: true,
            }
        });

        const olt = await OLTSite.findOne({ slug_name: slug_olt });

        if (!olt) {
            parentPort.postMessage({
                type: 'finish-notification', data: {
                    _id: _id,
                    ref_id: ref_id,
                    title: `Failed to get slot data in ${slug_olt}`,
                    message: `OLT not found`,
                    category: "get-slot",
                    status: "error",
                    is_loading: false,
                }
            });
            return;
        }

        const command = [
            'show card'
        ]

        let commandOutput = await runCommands(command, olt.ip_address, olt.username, olt.password, olt.cipher);
        const splitComand = commandOutput.split('\r\n');
        const key = splitComand[2].split(/[\s]+/);
        const value = splitComand
            .slice(4, -1)
            .map((slot, index) => slot.trim().split(/\s+/));

        // console.log(value);
        let oltUpdatedSlot;
        for (const element of value) {

            let slot = {};
            element.forEach((arr, index) => {
                slot[key[index].toLowerCase()] = arr;
            });
            const slotData = element.splice(-1) == 'OFFLINE' ? {
                rack: element[0],
                shelf: element[1],
                slot: element[2],
                cfgtype: element[3],
                realType: null,
                port: element[4],
                hardver: null,
                softver: null,
                status: element[5],
            } : slot;
            // Keduanya benar secara sintaks, tapi urutannya penting.
            // $pull digunakan untuk menghapus slot lama, lalu $addToSet untuk menambah slot baru (menghindari duplikasi).
            // Jika ingin update data slot, urutan ini sudah benar.

            oltUpdatedSlot = await OLTSite.findOneAndUpdate(
                { slug_name: slug_olt },
                {
                    $pull: { slots: { slot: slotData.slot } },
                },
                { new: true }
            );

            oltUpdatedSlot = await OLTSite.findOneAndUpdate(
                { slug_name: slug_olt },
                { $addToSet: { slots: slotData } },
                { new: true }
            );

            // console.log(oltUpdatedSlot.slots);


            // for (let i = 1; i <= filterSlotInservice.length; i++) {
            //     await Port.deleteMany({ site_OLT: olt._id, slot_OLT: filterSlotInservice[i - 1]._id });
            //     for (let j = 1; j <= filterSlotInservice[i - 1].port; j++) {
            //         console.log({
            //             port_number: i,
            //             slot_OLT: filterSlotInservice[i - 1]._id,
            //             site_OLT: olt._id,
            //         });
            //         await Port.findOneAndUpdate(
            //             {
            //                 port_number: i,
            //                 slot_OLT: filterSlotInservice[i - 1]._id,
            //                 site_OLT: olt._id,
            //             },
            //             {
            //                 port_number: i,
            //                 slot_OLT: filterSlotInservice[i - 1]._id,
            //                 site_OLT: olt._id,
            //             },
            //             { upsert: true, new: true }
            //         );

            //     }
            //     // await Onu.deleteMany({ site_OLT: olt._id, slot_OLT: filterSlotInservice[i - 1]._id });
            //     // await getOnus(slug_olt, filterSlotInservice[i - 1].slot, i);
            //     // await getOnuDetails(slug_olt, filterSlotInservice[i - 1].slot, i);
            // }
        }
        
        const filterSlotInservice = oltUpdatedSlot.slots.filter(slot => slot.status === 'INSERVICE' && ['GTGO', 'GTGH'].includes(slot.cfgtype));
        await Port.deleteMany({ site_OLT: olt._id });
        await Onu.deleteMany({ site_OLT: olt._id });
        filterSlotInservice.forEach(async element => {
            for (let j = 1; j <= element.port; j++) {
                await Port.findOneAndUpdate(
                    {
                        port_number: j,
                        slot_OLT: element._id,
                        site_OLT: olt._id,
                    },
                    {
                        port_number: j,
                        slot_OLT: element._id,
                        site_OLT: olt._id,
                    },
                    { upsert: true, new: true }
                );
            }
        });


        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Slot data in ${slug_olt} fetched successfully`,
                message: `Slot data fetched successfully`,
                category: "get-slot",
                status: "success",
                is_loading: false,
            }
        });
    } catch (err) {
        console.error(err);
        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Failed to get slot data in ${slug_olt}`,
                message: err.message,
                category: "get-slot",
                status: "error",
                is_loading: false,
            }
        });
        parentPort.postMessage({ type: 'end-worker' });
    }
}

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB in worker");
    await getSlot(slug_olt);
}).catch(err => {
    parentPort.postMessage(`Database connection error: ${err.message}`);
});
