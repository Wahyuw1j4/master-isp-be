import { BaseController } from "./controller.js";
import { prismaQuery, prisma } from "../prisma.js";
import { createOnuService, deleteOnuService } from "../helpers/c320Command.js";
import { hitMikrotikJob } from "../bull/queues/hitMikrotik.js";

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

    searchSubscriptions = async (req, res, next) => {
        try {
            const q = (req.query.q || '').trim();
            if (!q) return this.sendResponse(res, 200, 'Subscriptions search results', { data: [] });
            console.log('q:', q);
            const subscriptions = await prismaQuery(() =>
                prisma.subscriptions.findMany({
                    where: {
                        OR: [
                            { id: { contains: q, mode: 'insensitive' } },
                            { customer: { name: { contains: q, mode: 'insensitive' } } },
                            { customer: { phone: { contains: q, mode: 'insensitive' } } },
                        ]
                    },
                    take: 10,
                    orderBy: { created_at: 'desc' },
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                    }
                })
            );

            return this.sendResponse(res, 200, 'Subscriptions search results', { data: subscriptions });
        } catch (err) {
            next(err);
        }
    }

    // Paginated getters by relation ids (service, customer, olt, odc, odp)
    getByServiceId = async (req, res, next) => {
        try {
            const serviceId = req.params.serviceId;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { service_id: serviceId };
            if (req.query.status) where.status = req.query.status;

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                        odc: { select: { id: true, name: true } },
                        olt: { select: { id: true, name: true } },
                        odp: { select: { id: true, name: true } }
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                });
                return [rows, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Subscriptions retrieved', { data, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getByCustomerId = async (req, res, next) => {
        try {
            const customerId = req.params.customerId;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { customer_id: customerId };
            if (req.query.status) where.status = req.query.status;

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                        odc: true,
                        olt: true,
                        odp: true
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                });
                return [rows, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Subscriptions retrieved', { data, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getByOltId = async (req, res, next) => {
        try {
            const oltId = req.params.oltId;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { olt_id: oltId };
            if (req.query.status) where.status = req.query.status;

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                        odc: true,
                        olt: true,
                        odp: true
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                });
                return [rows, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Subscriptions retrieved', { data, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    // Coordinates helpers: return subscription markers (only those with coordinates)
    getCoordinatesByOltId = async (req, res, next) => {
        try {
            const oltId = req.params.oltId;
            const coords = await prismaQuery(() => prisma.subscriptions.findMany({
                where: {
                    olt_id: oltId,
                    latitude: { not: null },
                    longitude: { not: null }
                },
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    status: true,
                    customer: { select: { id: true, name: true } },
                    service: { select: { id: true, name: true } },
                    odc: { select: { id: true, name: true } },
                    odp: { select: { id: true, name: true } }
                }
            }));

            return this.sendResponse(res, 200, 'Coordinates retrieved', coords);
        } catch (err) {
            next(err);
        }
    }

    getCoordinatesByOdcId = async (req, res, next) => {
        try {
            const odcId = req.params.odcId;
            const coords = await prismaQuery(() => prisma.subscriptions.findMany({
                where: {
                    odc_id: odcId,
                    latitude: { not: null },
                    longitude: { not: null }
                },
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    status: true,
                    customer: { select: { id: true, name: true } },
                    service: { select: { id: true, name: true } }
                }
            }));

            return this.sendResponse(res, 200, 'Coordinates retrieved', coords);
        } catch (err) {
            next(err);
        }
    }

    getCoordinatesByOdpId = async (req, res, next) => {
        try {
            const odpId = req.params.odpId;
            const coords = await prismaQuery(() => prisma.subscriptions.findMany({
                where: {
                    odp_id: odpId,
                    latitude: { not: null },
                    longitude: { not: null }
                },
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    status: true,
                    customer: { select: { id: true, name: true } },
                    service: { select: { id: true, name: true } }
                }
            }));

            return this.sendResponse(res, 200, 'Coordinates retrieved', coords);
        } catch (err) {
            next(err);
        }
    }

    getByOdcId = async (req, res, next) => {
        try {
            const odcId = req.params.odcId;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { odc_id: odcId };
            if (req.query.status) where.status = req.query.status;

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                        odc: true,
                        olt: true,
                        odp: true
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                });
                return [rows, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Subscriptions retrieved', { data, meta: { page, limit, total, totalPages } });
        } catch (err) {
            next(err);
        }
    }

    getByOdpId = async (req, res, next) => {
        try {
            const odpId = req.params.odpId;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { odp_id: odpId };
            if (req.query.status) where.status = req.query.status;

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true } },
                        odc: true,
                        olt: true,
                        odp: true
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                });
                return [rows, total];
            });

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Subscriptions retrieved', { data, meta: { page, limit, total, totalPages } });
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
                    customer: true,
                    service: true,
                    created_by_user: true,
                    invoice_details: true
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
            const { olt_id, odc_id, odp_id, odp_distance, pppoe_username, pppoe_password } = req.body;
            const subscription = await prisma.subscriptions.update({
                where: { id: req.params.id },
                data: {
                    status: 'PROCEED',
                    olt: { connect: { id: olt_id } },
                    odc: { connect: { id: odc_id } },
                    odp: { connect: { id: odp_id } },
                    odp_distance: odp_distance,
                    pppoe_username: pppoe_username,
                    pppoe_password: pppoe_password
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



    createOnu = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.findUnique({
                where: { id: req.body.subscription_id },
                include: { olt: true }
            });
            const ssh = {
                host: subscription.olt.ip_address,
                username: subscription.olt.username,
                password: subscription.olt.password,
            };

            await createOnuService(subscription, ssh); // then create ONU with delay

            return this.sendResponse(res, 200, "ONU creation command queued", {});
        } catch (err) {
            next(err);
        }
    }

    deleteOnu = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.findUnique({
                where: { id: req.body.subscription_id },
                include: { olt: true }
            });
            const ssh = {
                host: subscription.olt.ip_address,
                username: subscription.olt.username,
                password: subscription.olt.password,
            };
            await deleteOnuService(subscription, ssh, 0); // delete immediately

            return this.sendResponse(res, 200, "ONU reinstallation commands queued", {});
        } catch (err) {
            next(err);
        }
    }

    reinstallOnu = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.findUnique({
                where: { id: req.body.subscription_id },
                include: { olt: true }
            });
            const ssh = {
                host: subscription.olt.ip_address,
                username: subscription.olt.username,
                password: subscription.olt.password,
            };
            console.log('subscription:', subscription);
            await deleteOnuService(subscription, ssh, 0); // delete immediately
            await createOnuService(subscription, ssh, 15000); // then create ONU with delay
            return this.sendResponse(res, 200, "ONU reinstallation commands queued", {});
        } catch (err) {
            next(err);
        }
    }

    suspendSubscription = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.update({
                where: { id: req.params.id },
                data: { status: 'SUSPEND' }
            });

            const address = "172.25.220.8"

            await hitMikrotikJob({
                url: 'http://103.153.149.228:8080/rest/ip/firewall/address-list/add',
                method: 'POST',
                data: {
                    address,
                    list: 'blocked_clients',
                    comment: `suspend from api by wahyu wijaya subscription:${subscription.id}`
                }
            });
            return this.sendResponse(res, 200, "Subscription suspended", subscription);
        } catch (err) {
            next(err);
        }
    }

    unsuspendSubscription = async (req, res, next) => {
        try {
            const subscription = await prisma.subscriptions.update({
                where: { id: req.params.id },
                data: { status: 'ACTIVE' }
            });
            const address = "172.25.220.8"
            await hitMikrotikJob({
                url: 'http://103.153.149.228:8080/rest/ip/firewall/address-list/address',
                method: 'DELETE',
                data: {
                    address,
                    list: 'blocked_clients',
                }
            });
            return this.sendResponse(res, 200, "Subscription unsuspended", subscription);
        } catch (err) {
            next(err);
        }
    }
}
const subscriptionController = new SubscriptionController();
export default subscriptionController;
