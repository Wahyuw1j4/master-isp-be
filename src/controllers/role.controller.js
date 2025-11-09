import { prisma, prismaQuery } from '../prisma.js';
import { BaseController } from './controller.js';

class RoleController extends BaseController {
  list = async (req, res, next) => {
    try {
      const roles = await prismaQuery(() => prisma.roles.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          roleScopes: {
            select: {
              scope: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          }
        }
      }));
      // Flatten scopes for easier frontend use
      const rolesWithScopes = roles.map(role => ({
        ...role,
        scopes: role.roleScopes.map(rs => rs.scope)
      }));
      return this.sendResponse(res, 200, 'Roles retrieved', rolesWithScopes);
    } catch (err) {
      next(err);
    }
  }

  create = async (req, res, next) => {
    try {
      const { name, description, scopes } = req.body;
      // Create role
      const role = await prismaQuery(() => prisma.roles.create({ data: { name, description } }));
      // Assign scopes if provided
      if (Array.isArray(scopes) && scopes.length > 0) {
        await prismaQuery(() => prisma.role_scopes.createMany({
          data: scopes.map(scopeId => ({ roleId: role.id, scopeId })),
          skipDuplicates: true
        }));
      }
      // Fetch role with scopes for response
      const roleWithScopes = await prismaQuery(() => prisma.roles.findUnique({
        where: { id: role.id },
        select: {
          id: true,
          name: true,
          description: true,
          roleScopes: {
            select: {
              scope: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          }
        }
      }));
      const result = {
        ...roleWithScopes,
        scopes: roleWithScopes.roleScopes.map(rs => rs.scope)
      };
      return this.sendResponse(res, 201, 'Role created', result);
    } catch (err) {
      next(err);
    }
  }

  addScope = async (req, res, next) => {
    try {
      const { roleId, scopeId } = req.body;
      await prismaQuery(() => prisma.role_scopes.create({ data: { roleId, scopeId } }));
      return this.sendResponse(res, { status: 'success' });
    } catch (err) {
      next(err);
    }
  }
  
  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      // Remove all role_scopes for this role first
      await prismaQuery(() => prisma.role_scopes.deleteMany({ where: { roleId: id } }));
      // Delete the role
      await prismaQuery(() => prisma.roles.delete({ where: { id } }));
      return this.sendResponse(res, 200, 'Role deleted');
    } catch (err) {
      next(err);
    }
  }
}

export default new RoleController();
