
import { parentPort, workerData } from 'worker_threads';
import OLTSite from '../../model/OLT.js';
import { runCommands } from '../../config/OLT2.js';
import mongoose from "mongoose";

const { slug_olt } = workerData

const getVlan = async (slug_olt) => {
    try {
        const ref_id = slug_olt + "-get-vlan";
        const _id = new mongoose.Types.ObjectId().toString();
        parentPort.postMessage({
            type: 'new-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Synchronizing vlan data in ${slug_olt}`,
                message: `Please wait, getting vlan`,
                category: "get-vlan",
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
                    title: `Failed to get vlan data in ${slug_olt}`,
                    message: `OLT not found`,
                    category: "get-vlan",
                    status: "error",
                    is_loading: false,
                }
            });
            return;
        }

        const command = [
            'show gpon onu profile vlan'
        ]
        
        let commandOutput = await runCommands(command, olt.ip_address, olt.username, olt.password, olt.cipher);
        let vlanDB = [];
        while (commandOutput.includes('Profile name:')) {
            const separatorStart = `Profile name`;
            const startIndex = commandOutput.indexOf(separatorStart);
            const cutString1 = commandOutput.substring(startIndex);
            const separatorEnd = 'CVLAN priority:'
            const endIndex = cutString1.indexOf(separatorEnd) + separatorEnd.length + 1;
            const cleanText = cutString1.substring(0, endIndex).trim();

            const lines = cleanText.trim().split('\n');
            const profile = {};
            lines.forEach(line => {
                const [key, value] = line.split(':').map(s => s.trim());
                if (key && value !== undefined) {
                    profile[key.toLowerCase().replace(/ /g, '_')] = isNaN(value) ? value : Number(value);
                }
            });
            commandOutput = commandOutput.slice(endIndex, commandOutput.length);

            vlanDB.push(profile);
        }
        
        await OLTSite.updateOne(
            { slug_name: slug_olt }, // Kondisi untuk menemukan dokumen
            { $set: { vlan: vlanDB } } // Data yang akan diupdate
        );

        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: _id,
                ref_id: ref_id,
                title: `Vlan data in ${slug_olt} fetched successfully`,
                message: `Vlan data fetched successfully`,
                category: "get-vlan",
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
            title: `Failed to get vlan data in ${slug_olt}`,
            message: err.message,
            category: "get-vlan",
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
    await getVlan(slug_olt);
}).catch(err => {
    parentPort.postMessage(`Database connection error: ${err.message}`);
});
