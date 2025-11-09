import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";
class UserController extends BaseController {
  list = async (req, res, next) => {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
      const skip = (page - 1) * limit;

      const where = {};
      if (req.query.username) {
        where.username = { contains: req.query.username, mode: 'insensitive' };
      }
      if (req.query.email) {
        where.email = { contains: req.query.email, mode: 'insensitive' };
      }

	  const [users, total] = await prismaQuery(() =>
		Promise.all([
		  prisma.users.findMany({
			where,
			skip,
    take: limit,
			orderBy: { username: 'asc' },
			select: {
			  id: true,
			  username: true,
        fullName: true,
			  email: true,
			  role: {
				select: {
				  id: true,
				  name: true
				}
			  }
			}
		  }),
		  prisma.users.count({ where })
		])
	  );

      const totalPages = Math.ceil(total / limit) || 1;
      return this.sendResponse(res, 200, "User retrieved", { data: users, meta: { page, limit, total, totalPages } });
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const { fullName, username, email, passwordHash } = req.body;
      const user = await prisma.users.create({ data: { fullName, username, email, passwordHash } });
      return this.sendResponse(res, 201, "User created", { data: user });
    } catch (err) {
      next(err);
    }
  }
}
const userController = new UserController();
export default userController;
