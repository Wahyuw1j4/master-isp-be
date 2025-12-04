
import { parentPort, workerData } from 'worker_threads';
import OLTSite from '../../model/OLT.js';
import { runCommands } from '../../config/OLT2.js';
import mongoose from "mongoose";


const { slug_olt } = workerData

const getTcont = async (slug_olt) => {
    try {
        const ref_id = slug_olt + "-sync-tcont";
        const _id = new mongoose.Types.ObjectId().toString();
        parentPort.postMessage({
            type: 'new-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Synchronizing tcont data in ${slug_olt}`,
                message: `Please wait, synchronizing tcont`,
                category: "sync-tcont",
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
                    title: `Failed to sync tcont data in ${slug_olt}`,
                    message: `OLT not found`,
                    category: "sync-tcont",
                    status: "error",
                    is_loading: false,
                }
            });
            return;
        }

        const command = [
            'show gpon profile tcont'
        ]

        let commandOutput = await runCommands(command, olt.ip_address, olt.username, olt.password, olt.cipher);
        let tcontDB = [];
        while (commandOutput.includes('Profile name :')) {
            let tcontData = {};
            const separatorStart = `Profile name :`;
            const startIndex = commandOutput.indexOf(separatorStart);
            const cutString1 = commandOutput.substring(startIndex);
            const separatorEnd = '\r\n \r\n'
            const endIndex = cutString1.indexOf(separatorEnd) + separatorEnd.length;
            const cleanText = cutString1.substring(0, endIndex).trim();

            const lines = cleanText.split('\n');
            const tconts = lines.map((row, index) => {
                let parts;
                if (index == 0) {
                    const cleanRow = row.trim().replace('\r', '');
                    parts = cleanRow.split(':');
                } else {
                    parts = row.trim().split(/\s+/);
                }
                return parts;
            });
            commandOutput = commandOutput.slice(endIndex, commandOutput.length);
            tconts.forEach((element, index) => {
                if (index == 0) {
                    tcontData[element[0].toLowerCase().replace(' ', '_').trim()] = element[1];
                }
            })

            tconts[1].forEach((arr, index) => {
                const val = tconts[2][index].trim()
                tcontData[arr] = isNaN(val) ? val : parseInt(val);
            })

            tcontDB.push(tcontData);
        }

        await OLTSite.updateOne(
            { slug_name: slug_olt }, // Kondisi untuk menemukan dokumen
            { $set: { tcont: tcontDB } } // Ganti seluruh array tcont dengan tcontData
        );

        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Successfully to sync tcont data in ${slug_olt}`,
                message: `Tcont data has been synchronized`,
                category: "sync-tcont",
                status: "success",
                is_loading: false,
            }
        });

        parentPort.postMessage({ type: 'end-worker' });
    } catch (err) {
        console.error(err, err.stack, "Error in getTcont");
        parentPort.postMessage({ type: 'finish-notification', data:{
            _id: _id,
            ref_id: ref_id,
            title: `Failed to get tcon data in ${slug_olt}`,
            message: err.message,
            category: "get-tcon",
            status: "error",
            is_loading: false,
        } });
        parentPort.postMessage({ type: 'end-worker' });
    }
}

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB in worker");
    await getTcont(slug_olt);
}).catch(err => {
    parentPort.postMessage(`Database connection error: ${err.message}`);
});
