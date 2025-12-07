import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';
import { generateInvoiceHtml } from '../templates/invoice.html.js';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { createOnuService } from "../helpers/c320Command.js";
import { compressAndUploadImageToR2 } from '../helpers/r2Helper.js';

class InvoiceController extends BaseController {
    constructor() {
        super();
        this.prefixR2 = 'invoice/';
    }

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

    getPublicById = async (req, res, next) => {
        try {
            const invoice = await prisma.invoice.findUnique({
                where: { id: req.params.id },
                include: {
                    customer: true,
                    invoice_details: true,
                    subscription: {
                        include: {
                            service: true
                        }
                    }
                }
            });
            if (!invoice) {
                return this.sendResponse(res, 404, 'Invoice not found');
            }
            return this.sendResponse(res, 200, 'Invoice retrieved', invoice);
        } catch (err) {
            next(err);
        }
    }

    downloadPublicInvoice = async (req, res, next) => {
        let browser;
        try {
            const invoice = await prisma.invoice.findUnique({
                where: { id: req.params.id },
                include: {
                    customer: true,
                    invoice_details: true,
                    subscription: {
                        include: {
                            service: true
                        }
                    }
                }
            });

            if (!invoice) {
                return this.sendResponse(res, 404, 'Invoice not found');
            }

            const html = generateInvoiceHtml(invoice, this.formatCurrency);

            // Determine chromium executable. On some Windows installs the path
            // returned by @sparticuz/chromium may be a payload file without .exe,
            // or extraction may fail. Try the package path first, then fall back
            // to common system Chrome / Edge locations.
            const candidateExe = await chromium.executablePath();
            const isWin = process.platform === 'win32';
            const candidates = [];
            if (candidateExe) candidates.push(candidateExe);
            if (isWin) {
                candidates.push(
                    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
                    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
                    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
                    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe')
                );
            } else {
                candidates.push('/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/chromium');
            }

            const executablePath = candidates.find(p => p && fs.existsSync(p));
            if (!executablePath) {
                const tried = candidates.filter(Boolean).join(', ');
                throw new Error(`Chromium/Chrome executable not found. Tried: ${tried}`);
            }

            // Launch puppeteer with a valid executable
            browser = await puppeteer.launch({
                executablePath,
                args: chromium.args || [],
                defaultViewport: chromium.defaultViewport || null,
                headless: chromium.headless ?? true,
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            });

            await browser.close();
            browser = null;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no}.pdf`);
            res.send(pdfBuffer);
        } catch (err) {
            next(err);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }

    recordPayment = async (req, res, next) => {
        try {
            const { total_invoice, payment_method, is_first_payment } = req.body;
            if (!total_invoice || !payment_method) {
                return this.sendResponse(res, 400, 'total_invoice and payment_method are required');
            }

            if (!req.file) {
                return this.sendResponse(res, 400, 'Payment proof image is required');
            }

            if (req.file && !['image/jpeg', 'image/jpg', 'image/png'].includes(req.file.mimetype)) {
                return this.sendResponse(res, 400, 'Only JPEG images are allowed for payment proof');
            }

            const extention = path.extname(req.file ? req.file.originalname : '').toLowerCase();
            const fileName = req.file ? `payment_proof_${req.params.id}${extention}` : null;

            await compressAndUploadImageToR2(
                req.file ? req.file.buffer : null,
                this.prefixR2,
                fileName,
                req.file ? req.file.mimetype : null
            );

            const invoice = await prisma.invoice.update({
                where: { id: req.params.id },
                data: {
                    total_invoice: Number(total_invoice),
                    payment_method,
                    payment_proof: fileName,
                    status: 'PAID'
                }
            });

            if (is_first_payment) {
                // If this is the first payment, update the subscription status to ACTIVE
                const updateSubs = await prisma.subscriptions.update({
                    where: { id: invoice.subscription_id },
                    data: { status: 'ACTIVE' },
                    include: { olt: true, service: true, customer: true }
                });

                const ssh = {
                    host: updateSubs.olt.ip_address,
                    username: updateSubs.olt.username,
                    password: updateSubs.olt.password,
                };

                await createOnuService(updateSubs, ssh); // then create ONU with delay
            }

            return this.sendResponse(res, 200, 'Payment recorded', invoice);
        } catch (err) {
            next(err);
        }
    }
}

const invoiceController = new InvoiceController();
export default invoiceController;
