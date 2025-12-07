// Controller for Odc (ES6 + OOP, arrow functions)
import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class OdcController extends BaseController {
  ganerateServiceID = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`; // yymm

    // Cari data terakhir yang id-nya diawali dengan prefix yymm
    const last = await prismaQuery(() =>
      prisma.odc.findFirst({
        where: { id: { startsWith: `ODC${prefix}` } },
        orderBy: { created_at: 'desc' }
      })
    );

    let nextNum = 1;
    if (last && typeof last.id === 'string') {
      // ambil bagian increment (4 digit) setelah yymm
      const seqStr = last.id.slice(7); // karena prefix ODCyymm panjang 7
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) nextNum = seq + 1;
    }

    const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
    return `ODC${prefix}${seqPadded}`; // hasil: ODCyymmIIII
  }
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (page - 1) * limit;
      const where = search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
          ]
        }
        : undefined;
      const odcs = await prismaQuery(() =>
        prisma.odc.findMany({
          skip: parseInt(skip),
          take: parseInt(limit),
          where,
          include: { olt: true }
        })
      );
      const total = await prismaQuery(() => prisma.odc.count({ where }));
      return this.sendResponse(res, 200, 'ODCs retrieved', {
        data: odcs,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  searchOdcs = async (req, res, next) => {
    try {
      const { q } = req.query;
      const odcs = await prismaQuery(() =>
        prisma.odc.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
          },
          select: { id: true, name: true }
        })
      );
      return this.sendResponse(res, 200, 'ODC search results', odcs);
    } catch (err) {
      next(err);
    }
  }

  getById = async (req, res, next) => {
    try {
      const odc = await prismaQuery(() =>
        prisma.odc.findUnique({
          where: { id: req.params.id },
          include: { olt: true }
        }));
      if (!odc) {
        const err = new Error('Odc not found');
        err.status = 404;
        return next(err);
      }
      return this.sendResponse(res, 200, 'Odc retrieved', odc);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const {name, olt_id, latitude, longitude} = req.body;
      req.body.id = await this.ganerateServiceID();
      const odc = await prismaQuery(() =>
        prisma.odc.create({ data: { name, olt_id, latitude, longitude, id: req.body.id } })
      );
      return this.sendResponse(res, 201, 'Odc created', odc);
    } catch (err) {
      next(err);
    }
  }

  update = async (req, res, next) => {
    try {
      const odc = await prismaQuery(() =>
        prisma.odc.update({
          where: { id: req.params.id },
          data: req.body
        })
      );
      return this.sendResponse(res, 200, 'Odc updated', odc);
    } catch (err) {
      next(err);
    }
  }

  delete = async (req, res, next) => {
    try {
      await prismaQuery(() =>
        prisma.odc.delete({ where: { id: req.params.id } })
      );
      return this.sendResponse(res, 200, 'Odc deleted');
    } catch (err) {
      next(err);
    }
  }
}

const odcController = new OdcController();
export default odcController;
