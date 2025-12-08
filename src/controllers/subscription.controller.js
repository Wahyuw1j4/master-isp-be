import { BaseController } from "./controller.js";
import { prismaQuery, prisma, prismaTx } from "../prisma.js";
import { createOnuService, deleteOnuService } from "../helpers/c320Command.js";
import { hitMikrotikJob } from "../bull/queues/hitMikrotik.js";
import { createInvoice } from "../helpers/invoice.js";
import { getBulanIndo } from "../helpers/time.js";
import { compressAndUploadImageToR2 } from "../helpers/r2Helper.js";

class SubscriptionController extends BaseController {
    constructor() {
        super();
        this.prefixR2 = 'subscription/';
    }


    generateCustomerID = async () => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${yy}${mm}`; // yymm

        // Cari data terakhir yang id-nya diawali dengan prefix yymm
        const last = await prismaQuery(() =>
            prisma.subscriptions.findFirst({
                where: { id: { startsWith: `SUBS${prefix}` } },
                orderBy: { created_at: 'desc' }
            })
        );

        let nextNum = 1;
        if (last && typeof last.id === 'string') {
            // ambil bagian increment (4 digit) setelah yymm
            const seqStr = last.id.slice(8); // karena prefix SUBSyymm panjang 8
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq)) nextNum = seq + 1;
        }

        const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
        return `SUBS${prefix}${seqPadded}`; // hasil: yymmiiii
    }

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

    update = async (req, res, next) => {
        try {
            const subscriptionId = req.params.id;
            const data = req.body;

            const allowedFields = [
                'latitude',
                'longitude',
                'description',
                'serial_number',
                'pppoe_username',
                'pppoe_password',
                'odp_distance',
                'vlan',
                'vlan_profile',
                'traffic_profile',
                'onu_number'
            ];

            if (!subscriptionId) {
                return this.sendResponse(res, 400, 'Subscription ID is required');
            }
            if (Object.keys(data).length === 0) {
                return this.sendResponse(res, 400, 'No data provided for update');
            }
            if (!allowedFields.some(field => field in data)) {
                return this.sendResponse(res, 400, 'No valid fields provided for update');
            }
            const updateData = {};
            for (const field of allowedFields) {
                if (field in data) {
                    updateData[field] = data[field];
                }
            }
            const updatedSubscription = await prismaQuery(() =>
                prisma.subscriptions.update({
                    where: { id: subscriptionId },
                    data: updateData
                })
            );
            return this.sendResponse(res, 200, 'Subscription updated', updatedSubscription);
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

    subscriptionSetup = async (req, res, next) => {
        try {
            const { olt_id, odc_id, odp_id, odp_distance, pppoe_username, pppoe_password, vlan, vlan_profile, traffic_profile, onu_number } = req.body;
            const subscription = await prisma.subscriptions.update({
                where: { id: req.params.id },
                data: {
                    status: 'PROCEED',
                    olt: { connect: { id: olt_id } },
                    odc: { connect: { id: odc_id } },
                    odp: { connect: { id: odp_id } },
                    odp_distance: odp_distance,
                    pppoe_username: pppoe_username,
                    pppoe_password: pppoe_password,
                    vlan: vlan,
                    vlan_profile: vlan_profile,
                    traffic_profile: traffic_profile,
                    onu_number: onu_number
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
            if (!req.body.subscription_id) {
                return this.sendResponse(res, 400, "subscription_id is required");
            }

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
            if (!req.body.subscription_id) {
                return this.sendResponse(res, 400, "subscription_id is required");
            }
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
            if (!req.body.subscription_id) {
                return this.sendResponse(res, 400, "subscription_id is required");
            }
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

            if (!req.params.id) {
                return this.sendResponse(res, 400, "Subscription ID is required");
            }
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

    getSubscriptionsForTechnitian = async (req, res, next) => {
        try {
            const userId = req.user && req.user.id;
            if (!userId) return this.sendResponse(res, 401, 'Unauthorized');

            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = { status: { in: ['PROCEED', 'PENDING'] } }

            const [data, total] = await prismaQuery(async () => {
                const total = await prisma.subscriptions.count({ where });
                const rows = await prisma.subscriptions.findMany({
                    where,
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
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

    // Returns a single subscription if it's assigned to one of the user's teams
    getSubscriptionForTechnitianById = async (req, res, next) => {
        try {
            const userId = req.user && req.user.id;
            if (!userId) return this.sendResponse(res, 401, 'Unauthorized');


            const subscription = await prisma.subscriptions.findUnique({
                where: { id: req.params.id },
                include: {
                    customer: { select: { name: true } },
                    service: { select: { name: true, speed: true } },
                    odc: { select: { name: true } },
                    olt: { select: { name: true, brand: true, type: true } },
                    odp: { select: { name: true } }
                }
            });
            if (!subscription) {
                const err = new Error('Subscription not found');
                err.status = 404;
                return next(err);
            }

            return this.sendResponse(res, 200, 'Subscription retrieved', subscription);
        } catch (err) {
            next(err);
        }
    }

    // Initial form update by technitian (simple: accept allowed fields and update)
    updateInitialFormForTechnitian = async (req, res, next) => {
        try {
            const { serial_number, odp_distance } = req.body;
            const id = req.params.id;
            if (!req.file || !req.file.buffer) {
                return this.sendResponse(res, 400, 'form_installation file is required');
            }
            const subscriptionTx = await prismaTx(async (tx, afterCommit) => {
                const extentionFile = req.file.originalname.split('.').pop();
                const fileName = "form_installation" + '_' + id + '_' + Date.now() + '.' + extentionFile;
                afterCommit(async () => {
                    await compressAndUploadImageToR2(
                        { buffer: req.file.buffer, filename: fileName, mimeType: req.file.mimetype },
                        { keyPrefix: this.prefixR2, cacheControl: 'public, max-age=86400' }
                    );
                });

                const subscription = await tx.subscriptions.update({
                    where: { id },
                    data: { serial_number, odp_distance: parseInt(odp_distance), form_installation: fileName },
                    include: { service: true }
                });

                const invoice = await createInvoice({ tx, afterCommit }, {
                    customerId: subscription.customer_id,
                    subscriptionId: subscription.id,
                    description: `Langganan ${subscription.service.name} bulan ${getBulanIndo(new Date().getMonth() + 1)} ${new Date().getFullYear()} segera lakukan pembayaran untuk mengaktifkan layanan Anda.`,
                    invDtl: [
                        {
                            billingName: `${subscription.service.name} [ID ${subscription.id}]`,
                            billingDescription: `Langganan ${subscription.service.name} bulan ${getBulanIndo(new Date().getMonth() + 1)} ${new Date().getFullYear()}`,
                            billingPrice: subscription.service.price,
                        },
                    ],
                })

                return { subscription, invoice };
            });


            return this.sendResponse(res, 200, 'Initial form updated and invoice created', { subscription: subscriptionTx.subscription, invoice: subscriptionTx.invoice });
        } catch (err) {
            next(err);
        }
    }

    // Final form update by technitian (simple: accept allowed fields and mark ACTIVE)
    updateFinalFormForTechnitian = async (req, res, next) => {
        try {
            const userId = req.user && req.user.id;
            if (!userId) return this.sendResponse(res, 401, 'Unauthorized');

            const subscriptionId = req.params.id;
            const allowed = ['cpe_photo', 'form_installation', 'speed_test_photo', 'description'];
            const payload = {};
            for (const k of allowed) if (k in req.body) payload[k] = req.body[k];

            payload.installation_by_user_id = userId;
            payload.status = 'ACTIVE';

            const subscription = await prisma.subscriptions.update({ where: { id: subscriptionId }, data: payload });
            return this.sendResponse(res, 200, 'Final form updated', subscription);
        } catch (err) {
            next(err);
        }
    }
}
const subscriptionController = new SubscriptionController();
export default subscriptionController;
