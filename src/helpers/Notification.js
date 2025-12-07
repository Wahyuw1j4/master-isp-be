import { prismaQuery, prisma } from "../prisma.js";
import axios from "axios";


const createNotification = async ({ notif_id, notif_identifier, title, message, category, link }) => {
    const notification = await prismaQuery((db) =>
        db.notification.create({
            data: {
                notif_id,
                notif_identifier,
                title,
                message,
                category,
                link,
            }
        })
    );

    await axios.post(`${process.env.APP_URL}/socketxyz/internal/emit`, {
        event: "new-notification",
        data: { notification }
    });
    return notification;
}

const updateNotification = async (id, updates) => {
    try {
        const updatedNotif = await prismaQuery((db) =>
            db.notification.update({
                where: { id },
                data: updates,
            })
        );
        console.log(`${process.env.APP_URL}/socketxyz/internal/emit`);
        await axios.post(`${process.env.APP_URL}/socketxyz/internal/emit`, {
            event: "update-notification",
            data: { notification: updatedNotif }
        });
        return updatedNotif;
    } catch (error) {
        console.log('stack:', error);
    }
}

export { createNotification, updateNotification };