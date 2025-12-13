import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";
import bcrypt from "bcryptjs";
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
              phoneNumber: true,
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
      const user = await prismaQuery(() => prisma.users.create({ data: { fullName, username, email, passwordHash } }));
      return this.sendResponse(res, 201, "User created", { data: user });
    } catch (err) {
      next(err);
    }
  }

  getProfile = async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await prismaQuery(() => prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          metaData: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }));
      if (!user) {
        return this.sendResponse(res, 404, "User not found");
      }
      return this.sendResponse(res, 200, "User profile retrieved", user);
    } catch (err) {
      next(err);
    }
  }

  updateProfile = async (req, res, next) => {
    try {
      const id = req.params.id;
      const { name, email, fullName, phoneNumber } = req.body;
      const user = await prismaQuery(() => prisma.users.update({
        where: { id },
        data: { name, email, fullName, phoneNumber }
      }));
      return this.sendResponse(res, 200, "User profile updated", user);
    } catch (err) {
      next(err);
    }
  }
  changePassword = async (req, res, next) => {
    try {
      const id = req.params.id;
      const { 
        password, confirmPassword
       } = req.body;
      if (password !== confirmPassword) {
        return this.sendResponse(res, 400, "Password and confirm password do not match");
      }
      const newPasswordHash = bcrypt.hashSync(password, 10);
      const user = await prismaQuery(() => prisma.users.update({
        where: { id },
        data: { passwordHash: newPasswordHash }
      }));
      return this.sendResponse(res, 200, "Password changed successfully", user);
    } catch (err) {
      next(err);
    }
  }
  updatePreferences = async (req, res, next) => {
    try {
      const id = req.params.id;
      const { thameColor, isDarkMode } = req.body;

      const user = await prismaQuery(() => prisma.users.update({
        where: { id },
        data: { metaData: { thameColor, isDarkMode } }
      }));
      return this.sendResponse(res, 200, "User preferences updated", user);
    } catch (err) {
      next(err);
    }
  }
}
const userController = new UserController();
export default userController;
