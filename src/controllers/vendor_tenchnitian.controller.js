import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class VendorTenchnitianController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const vendors = await prismaQuery(() => prisma.vendor_tenchnitian.findMany({ orderBy: { company_name: 'asc' } }));
            return this.sendResponse(res, 200, 'Vendors retrieved', vendors);
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const vendor = await prisma.vendor_tenchnitian.findUnique({ where: { id: req.params.id } });
            if (!vendor) {
                return this.sendResponse(res, 404, 'Vendor not found');
            }
            return this.sendResponse(res, 200, 'Vendor retrieved', vendor);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const vendor = await prisma.vendor_tenchnitian.create({ data: req.body });
            return this.sendResponse(res, 201, 'Vendor created', vendor);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const vendor = await prisma.vendor_tenchnitian.update({ where: { id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Vendor updated', vendor);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.vendor_tenchnitian.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, 'Vendor deleted', { message: 'Vendor deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const vendorTenchnitianController = new VendorTenchnitianController();
export default vendorTenchnitianController;
