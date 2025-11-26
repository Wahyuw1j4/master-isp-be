import { prisma, prismaQuery, prismaTx } from '../prisma.js';
import { BaseController } from './controller.js';
import siteController from './site.controller.js';
import { getR2SignedUrl } from '../helpers/compressAndUploadImageToR2.js';
import { addUploadR2Job } from '../bull/queues/uploadR2.js';

class TicketSiteController extends BaseController {
  constructor() {
    super();
    this.prefixR2 = 'ticket-site/';
  }
  generateMTId = async () => {
    const prefix = 'TS';
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefixWithDate = `${prefix}${yy}${mm}`; // TSyymm

    // Mulai dari seq berdasarkan record terakhir (jika ada), lalu loop sampai menemukan ID yang benar-benar unik
    const last = await prismaQuery(() =>
      prisma.ticket_site.findFirst({
        where: { mt_site_id: { startsWith: prefixWithDate } },
        orderBy: { created_at: 'desc' }
      })
    );

    let seq = 1;
    if (last && last.mt_site_id) {
      const match = last.mt_site_id.match(new RegExp(`^${prefixWithDate}(\\d{1,})$`));
      if (match) {
        const lastSeqNum = parseInt(match[1], 10);
        if (!Number.isNaN(lastSeqNum)) seq = lastSeqNum + 1;
      }
    }

    const maxAttempts = 10000;
    let attempts = 0;
    while (true) {
      const seqStr = String(seq).padStart(4, '0'); // iiii
      const candidate = `${prefixWithDate}${seqStr}`;

      // cek apakah candidate sudah ada di DB
      const exists = await prismaQuery(() => prisma.ticket_site.findUnique({ where: { mt_site_id: candidate }, select: { mt_site_id: true } }));
      if (!exists) return candidate;

      // jika sudah ada, increment dan ulangi
      seq += 1;
      attempts += 1;
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique mt_site_id after many attempts');
      }
    }
  }

  generateMtDtlId = async (counter = 0) => {
    const prefix = `DTL`;
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefixWithDate = `${prefix}${yy}${mm}`; // DTLyymm
    const last = await prismaQuery(() =>
      prisma.ticket_site_detail.findFirst({
        where: { maintenance_site_detail_id: { startsWith: prefixWithDate } },
        orderBy: { created_at: 'desc' }
      })
    );

    let seq = 1;
    if (last && last.maintenance_site_detail_id) {
      const match = last.maintenance_site_detail_id.match(new RegExp(`^${prefixWithDate}(\\d{1,})$`));
      if (match) {
        const lastSeqNum = parseInt(match[1], 10);
        if (!Number.isNaN(lastSeqNum)) seq = lastSeqNum + 1 + counter;
      }
    }

    const maxAttempts = 10000;
    let attempts = 0;
    while (true) {
      const seqStr = String(seq).padStart(4, '0');
      const candidate = `${prefixWithDate}${seqStr}`;
      const exists = await prismaQuery(() => prisma.ticket_site_detail.findUnique({ where: { maintenance_site_detail_id: candidate }, select: { maintenance_site_detail_id: true } }));
      if (!exists) return candidate;
      seq += 1;
      attempts += 1;
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique maintenance_site_detail_id after many attempts');
      }
    }
  }


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

      let [rows, total] = await prismaQuery(() =>
        Promise.all([
          prisma.ticket_site.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: { submit_by_user: true, ticket_details: true } }),
          prisma.ticket_site.count({ where })
        ])
      );

      rows = await Promise.all(rows.map(async row => {
        let { ticket_details } = row;
        ticket_details = await Promise.all(ticket_details.map(async detail => {
          if (detail.site_id && row.site_type) {
            switch (row.site_type.toLowerCase()) {
              case 'olt': {
                const olt = await siteController.getSiteByid('olt', detail.site_id);
                detail.site_info = olt;
                break;
              }
              case 'odc': {
                const odc = await siteController.getSiteByid('odc', detail.site_id);
                detail.site_info = odc;
                break;
              }
              case 'odp': {
                const odp = await siteController.getSiteByid('odp', detail.site_id);
                detail.site_info = odp;
                break;
              }
            }
          }
          return detail;
        }));
        row.ticket_details = ticket_details;
        return row;
      }));

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
      site.problem_picture = await getR2SignedUrl(this.prefixR2 + site.problem_picture, 600); // URL berlaku selama 10 menit
      return this.sendResponse(res, 200, 'Ticket site retrieved', site);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const { problemReport, siteType, oltId, odcId, odpIds } = req.body;
      switch (siteType.toLowerCase()) {
        case 'olt':
          if (!oltId) return this.sendResponse(res, 400, 'oltId is required for siteType OLT');
          break;
        case 'odc':
          if (!odcId) return this.sendResponse(res, 400, 'odcId is required for siteType ODC');
          break;
        case 'odp':
          if (!odpIds || !Array.isArray(odpIds) || odpIds.length === 0) return this.sendResponse(res, 400, 'odpIds array is required for siteType ODP');
          break;
        default:
          return this.sendResponse(res, 400, 'Invalid siteType. Must be OLT, ODC, or ODP');
      }
      const createMtSite = await prismaTx(async (tx, afterCommit) => {
        const mt_site_id = await this.generateMTId();
        const data = {
          mt_site_id,
          problem_report: problemReport,
          site_type: siteType.toLowerCase(),
          submit_by: req.user && req.user.id ? req.user.id : null
        };
        const extentionFile = req.file.originalname.split('.').pop();
        const fileName = "mtsite" + '_' + data.mt_site_id + '_' + Date.now() + '.' + extentionFile;
        data.problem_picture = fileName;
        if (req.file && req.file.buffer) {
          afterCommit(async () => {
            addUploadR2Job({
              imageBuffer: req.file.buffer,
              filename: fileName,
              mimeType: req.file.mimetype,
              options: { keyPrefix: this.prefixR2, cacheControl: 'public, max-age=86400' }
            });
            // await compressAndUploadImageToR2(
            //   { buffer: req.file.buffer, filename: fileName, mimeType: req.file.mimetype },
            //   { keyPrefix: this.prefixR2, cacheControl: 'public, max-age=86400' }
            // );
          });
        }

        const createTicketSite = await tx.ticket_site.create({ data });

        let createSiteDetail;

        switch (siteType.toLowerCase()) {
          case 'olt': {
            const mtDtlId = await this.generateMtDtlId(createTicketSite.mt_site_id);
            createSiteDetail = await tx.ticket_site_detail.create({
              data: {
                maintenance_site_detail_id: mtDtlId,
                mt_site_id: createTicketSite.mt_site_id,
                site_id: oltId
              }
            });
            break;
          }
          case 'odc': {
            const mtDtlId = await this.generateMtDtlId(createTicketSite.mt_site_id);
            createSiteDetail = await tx.ticket_site_detail.create({
              data: {
                maintenance_site_detail_id: mtDtlId,
                mt_site_id: createTicketSite.mt_site_id,
                site_id: odcId
              }
            });
            break;
          }
          case 'odp': {
            const createdDetails = [];
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
            let count = 0;
            for (const element of (odpIds || [])) {
              const mtDtlId = await this.generateMtDtlId(count);
              console.log('mtDtlId:', count);
              const detail = await tx.ticket_site_detail.create({
                data: {
                  maintenance_site_detail_id: mtDtlId,
                  mt_site_id: createTicketSite.mt_site_id,
                  site_id: element
                }
              });
              createdDetails.push(detail);
              count += 1;
              await sleep(100);
            }
            createSiteDetail = createdDetails;
            break;
          }
        }

        const siteWithDetails = await tx.ticket_site.findUnique({
          where: { mt_site_id: createTicketSite.mt_site_id },
          include: { ticket_details: true, submit_by_user: true, handle_by_team_rel: true }
        });

        return siteWithDetails;
      });


      return this.sendResponse(res, 201, 'Ticket site created', createMtSite);
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
