import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class InvoiceController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.invoice_no) where.invoice_no = { contains: req.query.invoice_no, mode: 'insensitive' };
            if (req.query.customer_id) where.customer_id = req.query.customer_id;

            const [invoices, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.invoice.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: { customer: true, invoice_details: true } }),
                    prisma.invoice.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Invoices retrieved', { data: invoices, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, invoice_details: true } });
            if (!invoice) {
                return this.sendResponse(res, 404, 'Invoice not found');
            }
            return this.sendResponse(res, 200, 'Invoice retrieved', invoice);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const invoice = await prisma.invoice.create({ data: req.body });
            return this.sendResponse(res, 201, 'Invoice created', invoice);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Invoice updated', invoice);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.invoice.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, 'Invoice deleted', { message: 'Invoice deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const invoiceController = new InvoiceController();
export default invoiceController;
