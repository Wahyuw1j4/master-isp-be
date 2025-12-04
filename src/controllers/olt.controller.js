import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class OltController extends BaseController {
  ganerateServiceID = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`; // yymm

    // Cari data terakhir yang id-nya diawali dengan prefix yymm
    const last = await prismaQuery(() =>
      prisma.olt.findFirst({
        where: { id: { startsWith: `OLT${prefix}` } },
        orderBy: { created_at: 'desc' }
      })
    );

    let nextNum = 1;
    if (last && typeof last.id === 'string') {
      // ambil bagian increment (4 digit) setelah yymm
      const seqStr = last.id.slice(7); // karena prefix OLTyymm panjang 7
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) nextNum = seq + 1;
    }

    const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
    return `OLT${prefix}${seqPadded}`; // hasil: OLTyymmIIII
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
      const olts = await prismaQuery(() =>
        prisma.olt.findMany({
          skip: parseInt(skip),
          take: parseInt(limit),
          where,
        })
      );
      const total = await prismaQuery(() => prisma.olt.count({ where }));
      return this.sendResponse(res, 200, 'OLTs retrieved', {
        data: olts,
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

  searchOlts = async (req, res, next) => {
    try {
      const { q } = req.query;
      const olts = await prismaQuery(() =>
        prisma.olt.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
          },
          select: { id: true, name: true }
        })
      );
      return this.sendResponse(res, 200, 'OLT search results', olts);
    } catch (err) {
      next(err);
    }
  }

  getById = async (req, res, next) => {
    try {
      const olt = await prismaQuery(() =>
        prisma.olt.findUnique({
          where: { id: req.params.id },
        })
      );
      if (!olt) {
        const err = new Error('Olt not found');
        err.status = 404;
        return next(err);
      }
      return this.sendResponse(res, 200, 'OLT retrieved', olt);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const {
        name,
        brand,
        type,
        ip_address,
        username,
        password,
        read_community,
        write_community,
        latitude,
        longitude, } = req.body;

      const data = {
        id: await this.ganerateServiceID(),
        name,
        brand,
        type,
        ip_address,
        username,
        password,
        read_community,
        write_community,
        latitude,
        longitude,
      };

      const olt = await prismaQuery(() =>
        prisma.olt.create({ data: data })
      );
      return this.sendResponse(res, 201, 'OLT created', olt);
    } catch (err) {
      next(err);
    }
  }

  update = async (req, res, next) => {
    try {
      const {
        name,
        brand,
        type,
        ip_address,
        username,
        password,
        read_community,
        write_community,
        latitude,
        longitude,
      } = req.body;

      const data = {
        name,
        brand,
        type,
        ip_address,
        username,
        password,
        read_community,
        write_community,
        latitude,
        longitude,
      };

      const olt = await prismaQuery(() =>
        prisma.olt.update({
          where: { id: req.params.id },
          data,
        })
      );
      return this.sendResponse(res, 200, 'OLT updated', olt);
    } catch (err) {
      next(err);
    }
  }

  delete = async (req, res, next) => {
    try {
      await prismaQuery(() =>
        prisma.olt.delete({ where: { id: req.params.id } })
      );
      return this.sendResponse(res, 200, 'OLT deleted', { message: 'OLT deleted' });
    } catch (err) {
      next(err);
    }
  }
}

const oltController = new OltController();
export default oltController;
