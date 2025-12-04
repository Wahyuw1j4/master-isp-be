import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class ServicesController extends BaseController {
    ganerateServiceID = async () => {
        const prefix = 'SERV';
        // Cari data terakhir yang id-nya diawali dengan prefix SERV
        const last = await prismaQuery(() =>
            prisma.services.findFirst({
                where: { id: { startsWith: prefix } },
                orderBy: { created_at: 'desc' }
            })
        );
        let nextNum = 1;
        if (last && typeof last.id === 'string') {
            // ambil bagian increment (4 digit) setelah SERV
            const seqStr = last.id.slice(4); // karena prefix SERV panjang 4
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq)) nextNum = seq + 1;
        }
        const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
        return `${prefix}${seqPadded}`; // hasil: SERViiii
    }


    paginateAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.name) {
                where.name = { contains: req.query.name, mode: 'insensitive' };
            }

            const [services, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.services.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
                    prisma.services.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;

            return this.sendResponse(res, 200, 'Services retrieved', { data: services, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getAllActive = async (req, res, next) => {
        try {
            const services = await prisma.services.findMany({
                orderBy: { name: 'asc' },
                where: {
                    is_active: true
                }
            });
            return this.sendResponse(res, 200, 'Services retrieved', services);
        } catch (err) {
            next(err);
        }
    }

    getAllInactiveToo = async (req, res, next) => {
        try {
            const services = await prisma.services.findMany({
                orderBy: { name: 'asc' },
            });
            return this.sendResponse(res, 200, 'Services retrieved', services);
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const service = await prisma.services.findUnique({ where: { id: req.params.id } });
            if (!service) {
                return this.sendResponse(res, 404, 'Service not found');
            }
            return this.sendResponse(res, 200, 'Service retrieved', service);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const serviceID = await this.ganerateServiceID();
            const data = { id: serviceID, 
                    name: req.body.name,
                    price: req.body.price,
                    speed: req.body.speed,
             };
            const service = await prisma.services.create({ data });
            return this.sendResponse(res, 201, 'Service created', service);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const service = await prisma.services.update({ where: { id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Service updated', service);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.services.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, 'Service deleted', { message: 'Service deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const servicesController = new ServicesController();
export default servicesController;
