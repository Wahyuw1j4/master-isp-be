import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';

class TicketSiteController extends BaseController {
  getAll = async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
      const skip = (page - 1) * limit;

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.mt_site_id) where.mt_site_id = req.query.mt_site_id;
      if (req.query.submit_by) where.submit_by = req.query.submit_by;
      if (req.query.search) {
        const q = req.query.search;
        where.OR = [
          { problem_report: { contains: q, mode: 'insensitive' } },
          { technician_report: { contains: q, mode: 'insensitive' } }
        ];
      }

      const [rows, total] = await prismaQuery(() =>
        Promise.all([
          prisma.ticket_site.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: { ticket_details: true, submit_by_user: true, handle_by_team_rel: true } }),
          prisma.ticket_site.count({ where })
        ])
      );

      const totalPages = Math.ceil(total / limit) || 1;
      return this.sendResponse(res, 200, 'Ticket sites retrieved', { data: rows, meta: { page, limit, total, totalPages } });
    } catch (err) {
      next(err);
    }
  }

  getById = async (req, res, next) => {
    try {
      const site = await prismaQuery(() => prisma.ticket_site.findUnique({ where: { mt_site_id: req.params.id }, include: { ticket_details: true, submit_by_user: true, handle_by_team_rel: true } }));
      if (!site) return this.sendResponse(res, 404, 'Ticket site not found');
      return this.sendResponse(res, 200, 'Ticket site retrieved', site);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const { ticket_details, ...payload } = req.body;
      if (req.user && req.user.id && !payload.submit_by) payload.submit_by = req.user.id;
      if (req.user && req.user.id && !payload.created_by) payload.created_by = req.user.id;

      const site = await prismaQuery(() => prisma.ticket_site.create({ data: payload }));

      if (ticket_details && Array.isArray(ticket_details) && ticket_details.length) {
        await prismaQuery(() => Promise.all(ticket_details.map(d => prisma.ticket_site_detail.create({ data: { ...d, site_id: site.mt_site_id } }))));
      }

      const siteWithDetails = await prismaQuery(() => prisma.ticket_site.findUnique({ where: { mt_site_id: site.mt_site_id }, include: { ticket_details: true, submit_by_user: true, handle_by_team_rel: true } }));
      return this.sendResponse(res, 201, 'Ticket site created', siteWithDetails);
    } catch (err) {
      next(err);
    }
  }

  update = async (req, res, next) => {
    try {
      const data = { ...req.body };
      const site = await prismaQuery(() => prisma.ticket_site.update({ where: { mt_site_id: req.params.id }, data }));
      const siteWithDetails = await prismaQuery(() => prisma.ticket_site.findUnique({ where: { mt_site_id: site.mt_site_id }, include: { ticket_details: true, submit_by_user: true, handle_by_team_rel: true } }));
      return this.sendResponse(res, 200, 'Ticket site updated', siteWithDetails);
    } catch (err) {
      next(err);
    }
  }

  delete = async (req, res, next) => {
    try {
      await prismaQuery(() => prisma.ticket_site.delete({ where: { mt_site_id: req.params.id } }));
      return this.sendResponse(res, 200, 'Ticket site deleted', { message: 'deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Detail helpers
  addDetail = async (req, res, next) => {
    try {
      const siteId = req.params.siteId || req.body.site_id;
      if (!siteId) return this.sendResponse(res, 400, 'site_id is required');
      const data = { ...req.body, site_id: siteId };
      if (req.user && req.user.id && !data.solved_by) data.solved_by = req.user.id;
      const detail = await prismaQuery(() => prisma.ticket_site_detail.create({ data }));
      return this.sendResponse(res, 201, 'Ticket site detail created', detail);
    } catch (err) {
      next(err);
    }
  }

  listDetails = async (req, res, next) => {
    try {
      const siteId = req.params.siteId || req.query.site_id;
      if (!siteId) return this.sendResponse(res, 400, 'site_id is required');
      const details = await prismaQuery(() => prisma.ticket_site_detail.findMany({ where: { site_id: siteId }, orderBy: { created_at: 'desc' } }));
      return this.sendResponse(res, 200, 'Ticket site details', details);
    } catch (err) {
      next(err);
    }
  }
}

const ticketSiteController = new TicketSiteController();
export default ticketSiteController;
