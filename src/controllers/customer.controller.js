import { prisma, prismaQuery} from '../prisma.js';
import { BaseController } from './controller.js';

class CustomerController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.id) {
                const idVal = req.query.id;
                where.id = idVal;
            }
            if (req.query.name) {
                where.name = { contains: req.query.name, mode: 'insensitive' };
            }
            if (req.query.search) {
                const q = req.query.search;
                where.OR = [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } }
                ];
            }

            where.subscriptions = { some: {} };
            const [customers, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.customers.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
                    prisma.customers.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Customers retrieved', {
                data: customers,
                meta: { page, limit, total, totalPages }
            });
        } catch (err) {
            next(err);
        }
    }

    searchCustomers = async (req, res, next) => {
        try {
            const q = req.query.q || '';
            const customers = await prismaQuery(() =>
                prisma.customers.findMany({
                    where: {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } },
                            { phone: { contains: q, mode: 'insensitive' } }
                        ]
                    },
                    take: 10,
                    orderBy: { name: 'asc' }
                })
            );
            return this.sendResponse(res, 200, 'Customers search results', { data: customers });
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const customer = await prismaQuery(() =>
                prisma.customers.findUnique({
                    where: { id: req.params.id },
                    include: { subscriptions: true }
                })
            );
            if (!customer) {
                return this.sendResponse(res, 404, 'Customer not found');
            }
            return this.sendResponse(res, 200, 'Customer retrieved', customer);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const customer = await prismaQuery(() =>
                prisma.customers.create({ data: req.body })
            );
            return this.sendResponse(res, 201, 'Customer created', customer);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const customer = await prismaQuery(() =>
                prisma.customers.update({
                    where: { id: req.params.id },
                    data: req.body
                })
            );
            return this.sendResponse(res, 200, 'Customer updated', customer);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prismaQuery(() =>
                prisma.customers.delete({ where: { id: req.params.id } })
            );
            return this.sendResponse(res, 200, 'Customer deleted', { message: 'Customer deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const customerController = new CustomerController();
export default customerController;
