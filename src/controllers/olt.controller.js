import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class OltController extends BaseController {
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
      const olt = await prismaQuery(() =>
        prisma.olt.create({ data: req.body })
      );
      return this.sendResponse(res, 201, 'OLT created', olt);
    } catch (err) {
      next(err);
    }
  }

  update = async (req, res, next) => {
    try {
      const olt = await prismaQuery(() =>
        prisma.olt.update({
          where: { id: req.params.id },
          data: req.body
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
