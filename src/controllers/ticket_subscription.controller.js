import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';
import { compressAndUploadImageToR2, getR2SignedUrl } from '../helpers/compressAndUploadImageToR2.js';

class TicketSubscriptionController extends BaseController {
    constructor() {
        super();
        this.prefixR2 = 'ticket-subscriptions/';
    }
    getAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.status) where.status = req.query.status;
            if (req.query.customer_id) where.customer_id = req.query.customer_id;
            if (req.query.submit_by) where.submit_by = req.query.submit_by;
            if (req.query.subscription_id) where.subscription_id = req.query.subscription_id;
            if (req.query.search) {
                const q = req.query.search;
                where.OR = [
                    { subject_problem: { contains: q, mode: 'insensitive' } },
                    { customer_report: { contains: q, mode: 'insensitive' } },
                ];
            }

            const [rows, total] = await prismaQuery(async () => {
                // total count with filters applied
                const total = await prisma.ticket_subscription.count({ where });

                // DB-side ordering using CASE expression
                const statusOrder = ['Open', 'Progress', 'Pending', 'Solved', 'Closed'];
                const caseExpr = statusOrder.map((s, i) => `WHEN status = '${s.replace(/'/g, "''")}' THEN ${i}`).join(' ');

                // NOTE: This example does not inject dynamic WHERE clauses into the raw SQL for simplicity.
                // For complex filtering you may want to build a parameterized SQL WHERE expression.
                const rowsIds = await prisma.$queryRawUnsafe(`
                    SELECT ticket_id
                    FROM ticket_subscription
                    ORDER BY CASE ${caseExpr} ELSE ${statusOrder.length} END, created_at DESC
                    LIMIT ${limit} OFFSET ${skip}
                `);

                const pageIds = rowsIds.map(r => r.ticket_id);
                if (pageIds.length === 0) return [[], total];

                const items = await prisma.ticket_subscription.findMany({
                    where: { ticket_id: { in: pageIds } },
                    include: { submit_by_user: true, work_by_user: true, subscription: true, customer: true },
                });

                // preserve DB order
                const byId = new Map(items.map(i => [i.ticket_id, i]));
                const ordered = pageIds.map(id => byId.get(id)).filter(Boolean);
                return [ordered, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Ticket subscriptions retrieved', { data: rows, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const ticket = await prismaQuery(() =>
                prisma.ticket_subscription.findUnique({
                    where: { ticket_id: req.params.id },
                    include: { submit_by_user: true, work_by_user: true, subscription: true },
                })
            );
            if (ticket && ticket.picture_from_customer) {
                ticket.picture_from_customer = await getR2SignedUrl(this.prefixR2 + ticket.picture_from_customer, 600); // URL berlaku selama 10 menit
            }
            if (!ticket) return this.sendResponse(res, 404, 'Ticket subscription not found');
            return this.sendResponse(res, 200, 'Ticket subscription retrieved', ticket);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            // accept fields from middleware-populated req.data or plain req.body
            const payload = req.data || req.body || {};

            const data = {
                subscription_id: payload.subscription_id,
                customer_id: payload.customer_id,
                subject_problem: payload.subject_problem,
                customer_report: payload.customer_report,
                status: "Open",
                created_by: req.user && req.user.id,
                submit_by: req.user && req.user.id,
            };
            const extentionFile = req.file.originalname.split('.').pop();
            const fileName = "tsubs" + '_' + data.subscription_id + '_' + Date.now() + '.' + extentionFile;
            data.picture_from_customer = fileName;
            const ticket = await prismaQuery(() => prisma.ticket_subscription.create({ data }));

            if (req.file && req.file.buffer) {
                await compressAndUploadImageToR2(
                    { buffer: req.file.buffer, filename: fileName, mimeType: req.file.mimetype },
                    { keyPrefix: this.prefixR2, cacheControl: 'public, max-age=86400' }
                );
            }

            
            return this.sendResponse(res, 201, 'Ticket subscription created', ticket);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const data = { ...req.body };
            const ticket = await prismaQuery(() => prisma.ticket_subscription.update({ where: { ticket_id: req.params.id }, data }));
            return this.sendResponse(res, 200, 'Ticket subscription updated', ticket);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prismaQuery(() => prisma.ticket_subscription.delete({ where: { ticket_id: req.params.id } }));
            return this.sendResponse(res, 200, 'Ticket subscription deleted', { message: 'deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const ticketSubscriptionController = new TicketSubscriptionController();
export default ticketSubscriptionController;
