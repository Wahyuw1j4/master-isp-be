// Controller untuk admin: set roles, bump sessionVersion, revoke sessions
import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';

class AdminController extends BaseController {
  async setRoles(req, res) {
    const { userId } = req.params;
    const { roleIds } = req.body;
    await prisma.user_roles.deleteMany({ where: { userId } });
    for (const roleId of roleIds) {
      await prisma.user_roles.create({ data: { userId, roleId } });
    }
    await prisma.users.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } }
    });
    await prisma.sessions.updateMany({
      where: { userId },
      data: { revokedAt: new Date() }
    });
    res.json({ status: 'success' });
  }
}

export default new AdminController();
