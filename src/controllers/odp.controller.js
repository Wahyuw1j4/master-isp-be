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

  ganerateOdpId = async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`; // yymm

    // Cari data terakhir yang id-nya diawali dengan prefix yymm
    const last = await prismaQuery(() =>
      prisma.odp.findFirst({
        where: { id: { startsWith: `ODP${prefix}` } },
        orderBy: { created_at: 'desc' }
      })
    );

    let nextNum = 1;
    if (last && typeof last.id === 'string') {
      // ambil bagian increment (4 digit) setelah yymm
      const seqStr = last.id.slice(7); // karena prefix ODPyymm panjang 7
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) nextNum = seq + 1;
    }

    const seqPadded = String(nextNum).padStart(4, '0'); // iiii 4 digit
    return `ODP${prefix}${seqPadded}`; // hasil: ODPyymmIIII
  }

  searchOdps = async (req, res, next) => {
    try {
      const { q } = req.query;
      const odps = await prismaQuery(() =>
        prisma.odp.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
          },
          select: { id: true, name: true }
        })
      );
      return this.sendResponse(res, 200, 'ODP search results', odps);
    } catch (err) {
      next(err);
    }
  }

  getNearbyOdps = async (req, res, next) => {
    try {
      const { lat, lng, limit } = req.query;
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
      console.log('query:', `SELECT odp.*,
            row_to_json(odc) AS odc,
            row_to_json(olt) AS olt,
        ST_DistanceSphere(
          ST_MakePoint(${lngNum}::double precision, ${latNum}::double precision),
          ST_MakePoint(odp.longitude::double precision, odp.latitude::double precision)
        ) AS distance
          FROM public.odp AS odp
          LEFT JOIN public.odc AS odc ON odp.odc_id = odc.id
          LEFT JOIN public.olt AS olt ON odp.olt_id = olt.id
          ORDER BY distance
          LIMIT ${lim}`);
      const odps = await prismaQuery(() =>
        prisma.$queryRaw`
    SELECT 
      odp.*,
      row_to_json(odc) AS odc,
      row_to_json(olt) AS olt,
      ST_DistanceSphere(
        ST_MakePoint(
          CAST(${lngNum} AS double precision), 
          CAST(${latNum} AS double precision)
        ),
        ST_MakePoint(
          odp.longitude::double precision, 
          odp.latitude::double precision
        )
      ) AS distance
    FROM public.odp AS odp
    LEFT JOIN public.odc AS odc ON odp.odc_id = odc.id
    LEFT JOIN public.olt AS olt ON odp.olt_id = olt.id
    ORDER BY distance
    LIMIT ${Number(lim)}
  `
      );
      return this.sendResponse(res, 200, 'Nearby ODPs retrieved ', odps);
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
      return this.sendResponse(res, 200, 'Odp retrieved', odp);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      console.log('data:', req.data);
      const { name, odc_id, olt_id, latitude, longitude } = req.body;
      const id = await this.ganerateOdpId();
      const odp = await prismaQuery(() =>
        prisma.odp.create({ data: { name, odc_id, olt_id, latitude, longitude, id } })
      );
      return this.sendResponse(res, 201, 'Odp created', odp);
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
      return this.sendResponse(res, 200, 'Odp updated', odp);
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
