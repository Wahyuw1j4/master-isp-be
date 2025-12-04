
import { parentPort, workerData } from 'worker_threads';
import OLTSite from '../../model/OLT.js';
import { runCommands } from '../../config/OLT2.js';
import mongoose from "mongoose";

const { slug_olt } = workerData

const getTraffic = async (slug_olt) => {
    try {
        const ref_id = slug_olt + "-get-traffic";
        const _id = new mongoose.Types.ObjectId().toString();
        parentPort.postMessage({
            type: 'new-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Synchronizing traffic data in ${slug_olt}`,
                message: `Please wait, getting traffic`,
                category: "get-traffic",
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
                    title: `Failed to get traffic data in ${slug_olt}`,
                    message: `OLT not found`,
                    category: "get-traffic",
                    status: "error",
                    is_loading: false,
                }
            });
            return;
        }

        const command = [
            'show gpon profile traffic'
        ]
        
        let commandOutput = await runCommands(command, olt.ip_address, olt.username, olt.password, olt.cipher);
        let trafficDB = [];
        while (commandOutput.includes('Profile name  :')) {
            let trafficData = {};
            const separatorStart = `Profile name  :`;
            const startIndex = commandOutput.indexOf(separatorStart);
            const cutString1 = commandOutput.substring(startIndex);
            const separatorEnd = '\r\n \r\n'
            const endIndex = cutString1.indexOf(separatorEnd) + separatorEnd.length;
            const cleanText = cutString1.substring(0, endIndex).trim();

            const lines = cleanText.split('\n');
            const traffics = lines.map((row, index) => {
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
            const cleanTraffics = traffics.filter((row) => row.length > 0 && row[0].trim() != '');

            cleanTraffics.forEach((element, index) => {
                if (index == 0) {
                    trafficData[element[0].toLowerCase().replace(' ', '_').trim()] = element[1];
                }
            })

            cleanTraffics[1].forEach((arr, index) => {
                const val = cleanTraffics[2][index].trim();
                trafficData[arr] = isNaN(val) ? val : parseInt(val);
            })

            trafficDB.push(trafficData);
        }

        await OLTSite.updateOne(
            { slug_name: slug_olt }, // Kondisi untuk menemukan dokumen
            { $set: { traffic: trafficDB } } // Data yang akan diupdate
        );

        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Traffic data in ${slug_olt} fetched successfully`,
                message: `Traffic data fetched successfully`,
                category: "get-traffic",
                status: "success",
                is_loading: false,
            }
        });
        
        parentPort.postMessage({ type: 'end-worker' });
    } catch (err) {
        console.error(err);
        parentPort.postMessage({ type: 'finish-notification', data:{
            _id: _id,
            ref_id: ref_id,
            title: `Failed to get traffic data in ${slug_olt}`,
            message: err.message,
            category: "get-traffic",
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
    await getTraffic(slug_olt);
}).catch(err => {
    parentPort.postMessage(`Database connection error: ${err.message}`);
});
