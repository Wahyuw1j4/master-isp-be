import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class InvoiceDetailController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.invoice_no) where.invoice_no = { contains: req.query.invoice_no, mode: 'insensitive' };
            if (req.query.subscription_id) where.subscription_id = req.query.subscription_id;

            const [items, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.invoice_detail.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: { subscription: true, invoice: true } }),
                    prisma.invoice_detail.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Invoice details retrieved', { data: items, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const item = await prisma.invoice_detail.findUnique({ where: { id: req.params.id }, include: { subscription: true, invoice: true } });
            if (!item) {
                return this.sendResponse(res, 404, 'Invoice detail not found');
            }
            return this.sendResponse(res, 200, 'Invoice detail retrieved', item);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const item = await prisma.invoice_detail.create({ data: req.body });
            return this.sendResponse(res, 201, 'Invoice detail created', item);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const item = await prisma.invoice_detail.update({ where: { id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Invoice detail updated', item);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.invoice_detail.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, 'Invoice detail deleted', { message: 'Invoice detail deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const invoiceDetailController = new InvoiceDetailController();
export default invoiceDetailController;
