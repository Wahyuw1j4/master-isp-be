import { BaseController } from "./controller.js";
import { prismaQuery, prisma } from "../prisma.js";
class SessionController extends BaseController {
  async listMine(req, res, next) {
    try {
      const userId = req.user.id;
      const sessions = await prismaQuery(() =>
        prisma.sessions.findMany({ where: { userId } })
      );
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  }

  async revokeOne(req, res, next) {
    try {
      const { sid } = req.params;
      const userId = req.user.id;
      await prismaQuery(() =>
        prisma.sessions.updateMany({ where: { sid, userId }, data: { revokedAt: new Date() } })
      );
      res.json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }

  async revokeAll(req, res, next) {
    try {
      const userId = req.user.id;
      await prismaQuery(() =>
        prisma.sessions.updateMany({ where: { userId }, data: { revokedAt: new Date() } })
      );
      res.json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }
}

export default new SessionController();
