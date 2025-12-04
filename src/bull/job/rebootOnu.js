import { runCommands } from "../../config/OLT2.js";
import Olt from "../../model/OLT.js";
import Onu from "../../model/Onu.js";
import { workerData, parentPort } from "worker_threads";
import mongoose from "mongoose";

const rebootOnu = async (subscription) => {

    const OLT = await Olt.findOne({ slug_name: slug_olt });


    const { onu_index } = subscription.onu;
    const idNotif = new mongoose.Types.ObjectId().toString()

    parentPort.postMessage({
            type: 'new-notification', data: {
                _id: idNotif,
                ref_id: subscription.slug_olt + "-reboot-onu-" + onu_index,
                title: `Reboot ${subscription.slug_olt} GPON_ONU_${onu_index}`,
                message: `Subscription ${subscription.onu.onu_name} is being rebooted`,
                category: "fetch-onu",
                status: "running",
                is_loading: true,
            }
        })

    if (!OLT) {
        parentPort.postMessage({
            type: 'finish-notification', data: {
                _id: idNotif,
                ref_id: slug_olt + "-reboot-onu-" + onu_index,
                title: `Subscription ${onu.onu_name} failed to reboot`,
                message: `OLT not found`,
                category: "reboot-onu",
                status: "error",
                is_loading: false,
            }
        });
        return;
    };
    const { ip_address, username, password, cipher } = OLT;

    

    await runCommands(commands, ip_address, username, password, cipher);

    parentPort.postMessage({
        type: 'finish-notification', data: {
            _id: idNotif,
            ref_id: slug_olt + "-reboot-onu-" + onu_index,
            title: `Success reboot onu ${onu_index}`,
            message: `Subscription ${onu.onu_name} has been successfully rebooted`,
            category: "reboot-onu",
            status: "success",
            is_loading: false,
        }
    });

    parentPort.postMessage({ type: 'end-worker', message: 'This is reboot onu' });
}

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB in worker");
    await rebootOnu(slug_olt, id);
}).catch(err => {
    console.error(err);
    parentPort.postMessage(`Database connection error: ${err.message}`);
});