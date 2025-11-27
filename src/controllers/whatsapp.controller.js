import { BaseController } from './controller.js';
import {
    startSession,
    stopSession,
    sendText,
    getStatus,
    getQR,
    listSessions
} from '../helpers/waService.js';

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
}

const whatsappController = new WhatsAppController();

export default whatsappController;