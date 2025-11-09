import { BaseController } from "./controller.js";
import { prismaQuery, prisma } from "../prisma.js";

class SubscriptionController extends BaseController {
    getCoverage = async (req, res, next) => {
        try {
            const subscriptions = await prismaQuery(() =>
                prisma.subscriptions.findMany({
                    select: {
                        id: true,
                        latitude: true,
                        longitude: true,
                        oid_identifier: true,
                        serial_number: true,
                        status: true,
                        customer: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        service: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        odc: {
                            select: {
                                id: true,
                                name: true,
                                olt_id: true,
                                latitude: true,
                                longitude: true
                            }
                        },
                        olt: {
                            select: {
                                id: true,
                                name: true,
                                latitude: true,
                                longitude: true
                            }
                        },
                        odp: {
                            select: {
                                id: true,
                                name: true,
                                olt_id: true,
                                latitude: true,
                                longitude: true
                            }
                        },
                        onus: {
                            select: {
                                snmp_values: true,
                            }
                        },
                        customer: {
                            select: {
                                name: true,
                            }
                        }
                    }
                })
            );
            return this.sendResponse(res, 200, "Subscriptions retrieved", subscriptions);
        } catch (err) {
            next(err);
        }
    }

    getAll = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            // build where filter from query params
            const where = {};
            if (req.query.id) {
                // assume id is numeric; Prisma schema may differ — adjust if needed
                const idVal = isNaN(req.query.id) ? req.query.id : parseInt(req.query.id, 10);
                where.id = idVal;
            }
            if (req.query.customer_name) {
                where.customer_name = { contains: req.query.customer_name, mode: 'insensitive' };
            }
            // generic search across customer_name and service_name
            if (req.query.search) {
                const q = req.query.search;
                where.OR = [
                    { customer_name: { contains: q, mode: 'insensitive' } },
                    { service_name: { contains: q, mode: 'insensitive' } }
                ];
            }

            const [subscriptions, total] = await prismaQuery(async () => {
                // custom status order
                const statusOrder = ['NEW REQUEST', 'PROCEED', 'PENDING', 'ACTIVE', 'DISMANTLE', 'CANCELLED'];

                // total count (gunakan prisma untuk count dengan where yang sudah ada)
                const total = await prisma.subscriptions.count({ where });

                // build CASE expression for custom ordering (use single-quoted string literals)
                const caseExpr = statusOrder
                    .map((s, i) => `WHEN status = '${s.replace(/'/g, "''")}' THEN ${i}`)
                    .join(' ');

                // NOTE: if you have filters in `where` you must convert them to SQL safely.
                // Below example does NOT include dynamic WHERE building — add it securely for production.
                const rows = await prisma.$queryRawUnsafe(`
                    SELECT id
                    FROM subscriptions
                    ORDER BY CASE ${caseExpr} ELSE ${statusOrder.length} END, created_at DESC
                    LIMIT ${limit} OFFSET ${skip}
                `);

                const pageIds = rows.map(r => r.id);
                if (pageIds.length === 0) return [[], total];

                const subscriptions = await prisma.subscriptions.findMany({
                    where: { id: { in: pageIds } },
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } }
                    }
                });

                // preserve DB order
                const subsById = new Map(subscriptions.map(s => [s.id, s]));
                const ordered = pageIds.map(id => subsById.get(id)).filter(Boolean);

                return [ordered, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;

            return this.sendResponse(res, 200, "Subscriptions retrieved", {
                data: subscriptions,
                meta: { page, limit, total, totalPages }
            });
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.findUnique({
                where: { id: req.params.id },
                include: {
                    odc: true,
                    olt: true, 
                    odp: true, 
                    customer: { select: { id: true, name: true } },
                    service: { select: { id: true, name: true } },
                    created_by_user: true
                }
            });
            if (!subscription) {
                const err = new Error('Subscription not found');
                err.status = 404;
                return next(err);
            }
            return this.sendResponse(res, 200, "Subscription retrieved", subscription);
        } catch (err) {
            next(err);
        }
    }

    async generateSubscriptionId() {
        // Format: yymmiiiii
        // yy: last 2 digits of year, mm: 2 digit month, iiiii: sequence padded to 5 digits, reset each month
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${yy}${mm}`;

        // find the latest subscription id for this month
        const last = await prisma.subscriptions.findFirst({
            where: { id: { startsWith: prefix } },
            orderBy: { created_at: 'desc' }
        });

        let seq = 1;
        if (last && typeof last.id === 'string' && last.id.length >= 9) {
            const lastSeq = parseInt(last.id.slice(4), 10);
            if (!Number.isNaN(lastSeq)) seq = lastSeq + 1;
        }

        const seqStr = String(seq).padStart(5, '0');
        return `${prefix}${seqStr}`;
    }


    create = async (req, res, next) => {
        try {
            console.log('data:', req.user);
            const data = req.body;
            const subscription = await prisma.subscriptions.create({
                data: {
                    id: await this.generateSubscriptionId(),
                    ...data,
                    customer: { connect: { id: data.customer_id } },
                    service: { connect: { id: data.service_id } },
                    status: 'NEW REQUEST',
                    customer_id: undefined,
                    service_id: undefined,
                    created_by_user: { connect: { id: req.user.id } }
                }
            });
            return this.sendResponse(res, 201, "Subscription created", subscription);
        } catch (err) {
            next(err);
        }
    }

    updateProceed = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.update({
                where: { id: req.params.id },
                data: { 
                    status: 'PROCEED',
                    olt: { connect: { id: req.body.olt_id } },
                    odc: { connect: { id: req.body.odc_id } },
                    odp: { connect: { id: req.body.odp_id } }
                }
            });
            return this.sendResponse(res, 200, "Subscription updated to PROCEED", subscription);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.subscriptions.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, { message: 'Subscription deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const subscriptionController = new SubscriptionController();
export default subscriptionController;
