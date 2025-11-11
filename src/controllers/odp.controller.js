// Controller for Odp (ES6 + OOP, arrow functions)
import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class OdpController extends BaseController {
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
      const odps = await prismaQuery(() =>
        prisma.odp.findMany({
          skip: parseInt(skip),
          take: parseInt(limit),
          where,
          include: { odc: true, olt: true }
        })
      );
      const total = await prismaQuery(() => prisma.odp.count({ where }));
      return this.sendResponse(res, 200, 'ODPs retrieved', {
        data: odps,
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

  getNearbyOdps = async (req, res, next) => {
    try {
      const { lat, lng, limit } = req.query;
      console.log('lat, lng, limit:', lat, lng, limit);
      if (!lat || !lng) {
        const err = new Error('lat and lon query parameters are required');
        err.status = 400;
        return next(err);
      }
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        const err = new Error('Invalid lat or lng');
        err.status = 400;
        return next(err);
      }
      const lim = parseInt(limit) || 5;

      const odps = await prismaQuery(() =>
        prisma.$queryRaw`
          SELECT odp.*,
            row_to_json(odc) AS odc,
            row_to_json(olt) AS olt,
        ST_DistanceSphere(
          ST_MakePoint(${lngNum}, ${latNum}),
          ST_MakePoint(odp.longitude, odp.latitude)
        ) AS distance
          FROM public.odp AS odp
          LEFT JOIN public.odc AS odc ON odp.odc_id = odc.id
          LEFT JOIN public.olt AS olt ON odp.olt_id = olt.id
          ORDER BY distance
          LIMIT ${lim}
        `
      );
      return this.sendResponse(res, 200, 'Nearby ODPs retrieved', odps);
    } catch (err) {
      next(err);
    }
  }

  getById = async (req, res, next) => {
    try {
      const odp = await prismaQuery(() =>
        prisma.odp.findUnique({
          where: { id: req.params.id },
          include: { odc: true, olt: true, subscriptions: true }
        })
      );
      if (!odp) {
        const err = new Error('Odp not found');
        err.status = 404;
        return next(err);
      }
      return this.sendResponse(res, 200, 'Odp retrieved', odp );
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const odp = await prismaQuery(() =>
        prisma.odp.create({ data: req.body })
      );
      return this.sendResponse(res, 201, 'Odp created', odp );
    } catch (err) {
      next(err);
    }
  }

  update = async (req, res, next) => {
    try {
      const odp = await prismaQuery(() =>
        prisma.odp.update({
          where: { id: req.params.id },
          data: req.body
        })
      );
      return this.sendResponse(res, 200, 'Odp updated', odp );
    } catch (err) {
      next(err);
    }
  }

  delete = async (req, res, next) => {
    try {
      await prismaQuery(() =>
        prisma.odp.delete({ where: { id: req.params.id } })
      );
      return this.sendResponse(res, 200, 'Odp deleted');
    } catch (err) {
      next(err);
    }
  }
}

const odpController = new OdpController();
export default odpController;
