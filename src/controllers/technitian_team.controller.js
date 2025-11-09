import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class TechnitianTeamController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const teams = await prismaQuery(() => prisma.technitian_team.findMany({ include: { members: true }, orderBy: { name: 'asc' } }));
            return this.sendResponse(res, 200, 'Technician teams retrieved', teams);
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const team = await prisma.technitian_team.findUnique({ where: { id: req.params.id }, include: { members: true } });
            if (!team) {
                return this.sendResponse(res, 404, 'Team not found');
            }
            return this.sendResponse(res, 200, 'Team retrieved', team);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const team = await prisma.technitian_team.create({ data: req.body });
            return this.sendResponse(res, 201, 'Team created', team);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const team = await prisma.technitian_team.update({ where: { id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Team updated', team);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.technitian_team.delete({ where: { id: req.params.id } });
            return this.sendResponse(res, 200, 'Team deleted', { message: 'Team deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const technitianTeamController = new TechnitianTeamController();
export default technitianTeamController;
