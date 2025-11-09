import { BaseController } from './controller.js';
import { prisma, prismaQuery } from '../prisma.js';

class TechnitianTeamMemberController extends BaseController {
    getAll = async (req, res, next) => {
        try {
            const where = {};
            if (req.query.team_id) where.team_id = req.query.team_id;
            if (req.query.user_id) where.user_id = req.query.user_id;

            const members = await prismaQuery(() => prisma.technitian_team_member.findMany({ where, include: { team: true, user: true } }));
            return this.sendResponse(res, 200, 'Team members retrieved', members);
        } catch (err) {
            next(err);
        }
    }

    getById = async (req, res, next) => {
        try {
            const member = await prisma.technitian_team_member.findUnique({ where: { member_id: req.params.id }, include: { team: true, user: true } });
            if (!member) {
                return this.sendResponse(res, 404, 'Team member not found');
            }
            return this.sendResponse(res, 200, 'Team member retrieved', member);
        } catch (err) {
            next(err);
        }
    }

    create = async (req, res, next) => {
        try {
            const member = await prisma.technitian_team_member.create({ data: req.body });
            return this.sendResponse(res, 201, 'Team member created', member);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const member = await prisma.technitian_team_member.update({ where: { member_id: req.params.id }, data: req.body });
            return this.sendResponse(res, 200, 'Team member updated', member);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            await prisma.technitian_team_member.delete({ where: { member_id: req.params.id } });
            return this.sendResponse(res, 200, 'Team member deleted', { message: 'Team member deleted' });
        } catch (err) {
            next(err);
        }
    }
}

const technitianTeamMemberController = new TechnitianTeamMemberController();
export default technitianTeamMemberController;
