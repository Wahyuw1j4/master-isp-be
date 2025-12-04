import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class NotificationController extends BaseController {
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10, search = '', category = '' } = req.query;
      const skip = (page - 1) * limit;

      const where = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
          { notif_identifier: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (category) {
        where.category = category;
      }

      const [notifications, total] = await prismaQuery(() =>
        Promise.all([
          prisma.notification.findMany({
            skip: parseInt(skip),
            take: parseInt(limit),
            where,
            orderBy: { created_at: 'desc' }
          }),
          prisma.notification.count({ where })
        ])
      );

      const totalPages = Math.ceil(total / limit) || 1;

      return this.sendResponse(res, 200, 'Notifications retrieved', {
        data: notifications,
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

const notificationController = new NotificationController();
export default notificationController;
