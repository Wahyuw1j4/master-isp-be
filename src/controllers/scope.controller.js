// Controller untuk scope CRUD
import { prismaQuery, prisma } from "../prisma.js";
import { BaseController } from "./controller.js";

class ScopeController extends BaseController {
  list = async (req, res, next) => {
    try {
      const scopes = await prismaQuery(() => prisma.scopes.findMany());
      this.sendResponse(res, 200, 'Scopes retrieved', scopes);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const { name, kind, type, description } = req.body;
      const scope = await prismaQuery(() =>
        prisma.scopes.create({ data: { name, kind, type, description } })
      );
      this.sendResponse(res, 201, 'Scope created', scope);
    } catch (err) {
      next(err);
    }
  }
}

export default new ScopeController();
