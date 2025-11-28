import { BaseController } from './controller.js';
import {
    startSession,
    stopSession,
    sendText,
    getStatus,
    getQR,
    listSessions,
    sendWhatsappWithTemplate
} from '../helpers/waService.js';
import { prismaQuery, prisma } from '../prisma.js';

class WhatsAppController extends BaseController {
    /**
     * POST /api/sessions
     * { name }
     */
    createSession = async (req, res, next) => {
        try {
            const { name } = req.body;
            if (!name) {
                return this.sendResponse(res, 400, 'name wajib diisi');
            }
            await startSession(name);
            this.sendResponse(res, 201, 'Session dibuat/started', { name });
        } catch (e) {
            console.error('[WhatsAppController.createSession]', e);
            next(e);
        }
    };

    /**
     * GET /api/sessions
     */
    listAll = async (req, res, next) => {
        try {
            const rows = await listSessions();
            this.sendResponse(res, 200, 'Daftar session', rows);
        } catch (e) {
            console.error('[WhatsAppController.listAll]', e);
            next(e);
        }
    };

    /**
     * GET /api/sessions/:name/status
     */
    getSessionStatus = async (req, res, next) => {
        try {
            const data = await getStatus(req.params.name);
            this.sendResponse(res, 200, 'Status session', data);
        } catch (e) {
            console.error('[WhatsAppController.getSessionStatus]', e);
            next(e);
        }
    };

    /**
     * GET /api/sessions/:name/qr
     */
    getSessionQR = async (req, res, next) => {
        try {
            const data = await getQR(req.params.name);
            this.sendResponse(res, 200, 'QR code session', data);
        } catch (e) {
            console.error('[WhatsAppController.getSessionQR]', e);
            next(e);
        }
    };

    /**
     * POST /api/sessions/:name/send
     * { number, message }
     */
    sendMessage = async (req, res, next) => {
        try {
            const { number, message } = req.body;
            if (!number || !message) {
                return this.sendResponse(res, 400, 'number & message wajib diisi');
            }
            const result = await sendText(req.params.name, number, message);
            this.sendResponse(res, 200, 'Pesan berhasil dikirim', { result });
        } catch (e) {
            console.error('[WhatsAppController.sendMessage]', e);
            next(e);
        }
    };

    /**
     * POST /api/sessions/:name/restart
     */
    restartSession = async (req, res, next) => {
        try {
            const { name } = req.params;
            await stopSession(name, { logout: false, deleteDb: false });
            await startSession(name);
            this.sendResponse(res, 200, 'Session direstart', { name });
        } catch (e) {
            console.error('[WhatsAppController.restartSession]', e);
            next(e);
        }
    };

    /**
     * DELETE /api/sessions/:name
     */
    deleteSession = async (req, res, next) => {
        try {
            const { name } = req.params;
            await stopSession(name, { logout: true, deleteDb: true });
            this.sendResponse(res, 200, 'Session dihapus', { name });
        } catch (e) {
            console.error('[WhatsAppController.deleteSession]', e);
            next(e);
        }
    };

    getMessages = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.jid) {
                where.jid = { contains: req.query.jid };
            }
            if (req.query.status) {
                where.status = { contains: req.query.status, mode: 'insensitive' };
            }
            if (req.query.search) {
                const q = req.query.search;
                where.OR = [
                    { jid: { contains: q, mode: 'insensitive' } },
                    { status: { contains: q, mode: 'insensitive' } },
                    { message_id: { contains: q, mode: 'insensitive' } }
                ];
            }

            const [messages, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.whatsapp_message_log.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { created_at: 'desc' }
                    }),
                    prisma.whatsapp_message_log.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Daftar pesan WhatsApp', {
                data: messages,
                meta: { page, limit, total, totalPages }
            });
        } catch (e) {
            console.error('[WhatsAppController.getMessages]', e);
            next(e);
        }
    };

    getTemplates = async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
            const skip = (page - 1) * limit;

            const where = {};
            if (req.query.code) {
                where.code = { contains: req.query.code, mode: 'insensitive' };
            }
            if (req.query.label) {
                where.label = { contains: req.query.label, mode: 'insensitive' };
            }
            if (req.query.search) {
                const q = req.query.search;
                where.OR = [
                    { code: { contains: q, mode: 'insensitive' } },
                    { label: { contains: q, mode: 'insensitive' } },
                    { body: { contains: q, mode: 'insensitive' } }
                ];
            }

            const [templates, total] = await prismaQuery(() =>
                Promise.all([
                    prisma.whatsapp_template.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { created_at: 'desc' },
                        include: { variables: true }
                    }),
                    prisma.whatsapp_template.count({ where })
                ])
            );

            const totalPages = Math.ceil(total / limit) || 1;
            return this.sendResponse(res, 200, 'Whatsapp templates retrieved', {
                data: templates,
                meta: { page, limit, total, totalPages }
            });
        } catch (err) {
            console.error('[WhatsAppController.getTemplates]', err);
            next(err);
        }
    }

    createTemplate = async (req, res, next) => {
        try {
            const { code, label, body, message_type, variables, example_vars } = req.body;

            if (!code || !label || !body) {
                return this.sendResponse(res, 400, 'code, label, and body are required');
            }

            const templateData = {
                code,
                label,
                body,
                message_type,
                example_vars,
            };

            if (variables && variables.length > 0) {
                templateData.variables = {
                    create: variables.map(v => ({
                        key: v.key,
                        label: v.label,
                        description: v.description,
                        required: v.required
                    }))
                };
            }

            const newTemplate = await prisma.whatsapp_template.create({
                data: templateData,
                include: {
                    variables: true,
                },
            });

            this.sendResponse(res, 201, 'Template created successfully', newTemplate);
        } catch (err) {
            console.error('[WhatsAppController.createTemplate]', err);
            next(err);
        }
    }

    getTemplateById = async (req, res, next) => {
        try {
            const { id } = req.params;
            console.log('id:', id);
            const template = await prisma.whatsapp_template.findUnique({
                where: { id },
                include: { variables: true },
            });
            if (!template) {
                return this.sendResponse(res, 404, 'Template not found');
            }
            this.sendResponse(res, 200, 'Template retrieved successfully', template);
        } catch (err) {
            console.error('[WhatsAppController.getTemplateByCode]', err);
            next(err);
        }
    }

    getTemplateByCode = async (req, res, next) => {
        try {
            const { code } = req.params;
            const template = await prisma.whatsapp_template.findUnique({
                where: { code },
                include: { variables: true },
            });
            if (!template) {
                return this.sendResponse(res, 404, 'Template not found');
            }
            this.sendResponse(res, 200, 'Template retrieved successfully', template);
        } catch (err) {
            console.error('[WhatsAppController.getTemplateByCode]', err);
            next(err);
        }
    }

    updateTemplate = async (req, res, next) => {
        try {
            const { code } = req.params;
            const { label, body, message_type, variables, example_vars } = req.body;
            const existingTemplate = await prisma.whatsapp_template.findUnique({
                where: { code },
            });
            if (!existingTemplate) {
                return this.sendResponse(res, 404, 'Template not found');
            }
            const updateData = {
                label,
                body,
                message_type,
                example_vars,
            };

            if (variables && Array.isArray(variables)) {
                await prisma.whatsapp_template_variable.deleteMany({
                    where: { template_id: existingTemplate.id },
                });
                updateData.variables = {
                    create: variables.map(v => ({
                        key: v.key,
                        label: v.label,
                        description: v.description,
                        required: v.required
                    }))
                };
            }
            const updatedTemplate = await prisma.whatsapp_template.update({
                where: { code },
                data: updateData,
                include: { variables: true },
            });
            this.sendResponse(res, 200, 'Template updated successfully', updatedTemplate);
        } catch (err) {
            console.error('[WhatsAppController.updateTemplate]', err);
            next(err);
        }
    }

    sendTemplateMessage = async (req, res, next) => {
        try {
            const { name } = req.params;
            const { number, template_code, variables } = req.body;

            if (!number || !template_code) {
                return this.sendResponse(res, 400, 'number and template_code are required');
            }

            const result = await sendWhatsappWithTemplate(name, number, template_code, variables);
            this.sendResponse(res, 200, 'Template message sent successfully', { result });
        } catch (err) {
            console.error('[WhatsAppController.sendTemplateMessage]', err);
            next(err);
        }
    }
}

const whatsappController = new WhatsAppController();

export default whatsappController;