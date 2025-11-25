import { prisma, prismaQuery } from '../prisma.js';


class TicketSiteController {
    getSiteByid = async (typeSite, siteId) => {
        switch (typeSite.toLowerCase()) {
            case 'olt':
                return await prismaQuery(() => prisma.olt.findUnique({ where: { id: siteId }, select: { id: true, name: true } }));
            case 'odc':
                return await prismaQuery(() => prisma.odc.findUnique({ where: { id: siteId }, select: { id: true, name: true, olt: { select: { id: true, name: true } } } }));
            case 'odp':
                return await prismaQuery(() => prisma.odp.findUnique({ where: { id: siteId }, select: { id: true, name: true, odc: { select: { id: true, name: true, olt: { select: { id: true, name: true } } } } } }));
        }
        return null;
    }
}

export const ticketSiteController = new TicketSiteController();
export default ticketSiteController;