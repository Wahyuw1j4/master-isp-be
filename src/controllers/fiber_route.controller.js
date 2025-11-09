import { BaseController } from './controller.js';
import { prismaQuery, prisma } from '../prisma.js';

class FiberRouteController extends BaseController {
    generateId = async () => {
        const lastFiberRoute = await prismaQuery(() =>
            prisma.fiber_route.findFirst({
                orderBy: {
                    created_at: 'desc'
                }
            })
        );
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');

        let increament = 1;
        if (lastFiberRoute) {
            const lastId = lastFiberRoute.id;
            const lastYY = lastId.slice(3, 5);
            const lastMM = lastId.slice(5, 7);
            const lastIIII = parseInt(lastId.slice(7), 10);

            if (lastYY === yy && lastMM === mm) {
                increament = lastIIII + 1;
            }
        }
        const newId = `${yy}${mm}${String(increament).padStart(4, '0')}`;
        return `FR-${String(newId).padStart(4, '0')}`;
    }

    create = async (req, res, next) => {
        try {
            const { name, polyline, color } = req.body;
            const id = await this.generateId();
            const fiberRoute = await prismaQuery(() =>
                prisma.fiber_route.create({
                    data: {
                        id,
                        name,
                        polyline,
                        color
                    }
                })
            );
            return this.sendResponse(res, 201, 'Fiber route created successfully', fiberRoute);
        } catch (err) {
            next(err);
        }
    }

    getAll = async (req, res, next) => {
        try {
            const fiberRoutes = await prismaQuery(() =>
                prisma.fiber_route.findMany()
            );
            this.sendResponse(res, 200, 'Fiber routes retrieved successfully', fiberRoutes);
        } catch (err) {
            next(err);
        }
    }

    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, polyline, color } = req.body;
            const update = await prismaQuery(() =>
                prisma.fiber_route.update({
                    where: { id },
                    data: {
                        name,
                        polyline,
                        color
                    }
                })
            );
            return this.sendResponse(res, 200, 'Fiber route updated successfully', update);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const deleteFiberRoute = await prismaQuery(() =>
                prisma.fiber_route.delete({
                    where: { id }
                })
            );
            return this.sendResponse(res, 204, 'Fiber route deleted successfully', deleteFiberRoute);
        } catch (err) {
            next(err);
        }
    }

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const deleteFiberRoute = await prismaQuery(() =>
                prisma.fiber_route.delete({
                    where: { id }
                })
            );
            return this.sendResponse(res, 204, 'Fiber route deleted successfully', deleteFiberRoute);
        } catch (err) {
            next(err);
        }
    }
}

const fiberRouteController = new FiberRouteController();
export default fiberRouteController;