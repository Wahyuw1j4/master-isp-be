import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';
import { compressAndUploadImageToR2, getR2SignedUrl,  } from '../helpers/compressAndUploadImageToR2.js';

class CustomerController extends BaseController {
    constructor() {
        super();
        this.prefixR2 = 'customer/';
    }

    generateCustomerID = async () => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${yy}${mm}`; // yymm

        // Cari data terakhir yang id-nya diawali dengan prefix yymm
        const last = await prismaQuery(() =>
            prisma.customers.findFirst({
                where: { id: { startsWith: `CUST${prefix}` } },
                orderBy: { created_at: 'desc' }
            })
        );

        let nextNum = 1;
        if (last && typeof last.id === 'string') {
            // ambil bagian increment (4 digit) setelah yymm
            const seqStr = last.id.slice(8); // karena prefix CUSTyymm panjang 8
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq)) nextNum = seq + 1;
        }

        const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
        return `CUST${prefix}${seqPadded}`; // hasil: yymmiiii
    }


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

            const [customers, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.customers.findMany({ where, skip, take: limit, orderBy: { created_at: 'asc' } }),
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

            customer.ktp_photo = await getR2SignedUrl(
                this.prefixR2 + customer.ktp_photo,
                300
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
            console.log('req.body:', req.body);
            if (!req.body.name || !req.body.email) {
                return this.sendResponse(res, 400, 'Name and email are required');
            }

            const data = {
                id: await this.generateCustomerID(),
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                ktp_number: req.body.nik,
                password: "defaultpassword"
            };

            const customer = await prismaQuery(() =>
                prisma.customers.create({ data })
            );

            const extentionFile = req.file.originalname.split('.').pop();
            const fileName = "cust" + '_' + data.id + '_' + Date.now() + '.' + extentionFile;
            if (req.file) {
                await compressAndUploadImageToR2(
                    { buffer: req.file.buffer, filename: fileName, mimeType: req.file.mimetype },
                    { keyPrefix: this.prefixR2, cacheControl: 'public, max-age=86400' }
                );
            }
            if (req.file) {
                await prismaQuery(() =>
                    prisma.customers.update({
                        where: { id: customer.id },
                        data: { ktp_photo: fileName }
                    })
                );
            }

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
