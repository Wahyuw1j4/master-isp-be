// Controller for Odc (ES6 + OOP, arrow functions)
import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class OdcController extends BaseController {
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

  getById = async (req, res, next) => {
    try {
      const odc = await prismaQuery(() =>
        prisma.odc.findUnique({
          where: { id: req.params.id },
          include: { olt: true, subscriptions: true, odps: true }
        }));
      if (!odc) {
        const err = new Error('Odc not found');
        err.status = 404;
        return next(err);
      }
      return this.sendResponse(res, 200, 'Odc retrieved', { data: odc });
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const odc = await prismaQuery(() =>
        prisma.odc.create({ data: req.body })
      );
      return this.sendResponse(res, 201, 'Odc created', { data: odc });
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
      return this.sendResponse(res, 200, 'Odc updated', { data: odc });
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
