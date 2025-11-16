// Semua route RBAC + session DB-based
import express from 'express';
import multer from 'multer';
import AuthController from './controllers/auth.controller.js';
import userController from './controllers/user.controller.js';
import roleController from './controllers/role.controller.js';
import ScopeController from './controllers/scope.controller.js';
import AdminController from './controllers/admin.controller.js';
import SessionController from './controllers/session.controller.js';
import requireSession from './middleware/requireSession.js';
import requireScope from './middleware/requireScope.js';

import CustomerController from './controllers/customer.controller.js';
import OltController from './controllers/olt.controller.js';
import OdcController from './controllers/odc.controller.js';
import OdpController from './controllers/odp.controller.js';
import SubscriptionController from './controllers/subscription.controller.js';
import fiberRouteController from './controllers/fiber_route.controller.js';
import ServicesController from './controllers/services.controller.js';
import InvoiceController from './controllers/invoice.controller.js';
import InvoiceDetailController from './controllers/invoice_detail.controller.js';
import VendorTenchnitianController from './controllers/vendor_tenchnitian.controller.js';
import TechnitianTeamController from './controllers/technitian_team.controller.js';
import TechnitianTeamMemberController from './controllers/technitian_team_member.controller.js';
import ticketSubscriptionController from './controllers/ticket_subscription.controller.js';
import ticketSiteController from './controllers/ticket_site.controller.js';
import bpsController from './controllers/bps.controller.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 50 MB limit

// Auth
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', requireSession, AuthController.logout);
router.get('/me', requireSession, AuthController.me);

// Users
router.get('/users', requireSession, requireScope('user.read'), userController.list);
router.post('/users', requireSession, requireScope('user.create'), userController.create);

// Roles
router.get('/roles', requireSession, requireScope('role.read'), roleController.list);
router.post('/roles', requireSession, requireScope('role.create'), roleController.create);

router.delete('/roles/:id', requireSession, requireScope('role.delete'), roleController.delete);
router.post('/roles/:roleId/scopes/:scopeId', requireSession, requireScope('role.scope.add'), roleController.addScope);

// Scopes
router.get('/scopes', requireSession, requireScope('scope.read'), ScopeController.list);
router.post('/scopes', requireSession, requireScope('scope.create'), ScopeController.create);

// Admin
router.post('/admin/users/:userId/set-roles', requireSession, requireScope('admin.setRoles'), AdminController.setRoles);

// Sessions
router.get('/sessions/me', requireSession, SessionController.listMine);
router.post('/sessions/me/revoke/:sid', requireSession, SessionController.revokeOne);
router.post('/sessions/me/revoke-all', requireSession, SessionController.revokeAll);

router.get('/customers', requireSession, CustomerController.getAll)
router.get('/customers/search', requireSession, CustomerController.searchCustomers)
router.get('/customers/:id', requireSession, CustomerController.getById)
router.post('/customers', requireSession, CustomerController.create)
router.put('/customers/:id', requireSession, CustomerController.update)
router.delete('/customers/:id', requireSession, CustomerController.delete)

// Subscription routes
router.get('/coverage', requireSession, requireScope('subscription.read'), SubscriptionController.getCoverage)
router.get('/subscriptions', requireSession, requireScope('subscription.read'), SubscriptionController.getAll)
router.get('/subscriptions/search', requireSession, requireScope('subscription.read'), SubscriptionController.searchSubscriptions)
router.get('/subscriptions/:id', requireSession, requireScope('subscription.read'), SubscriptionController.getById)
router.post('/subscriptions', requireSession, requireScope('subscription.create'), SubscriptionController.create)
router.put('/subscriptions/:id/update-proceed', requireSession, requireScope('subscription.update'), SubscriptionController.updateProceed)
router.delete('/subscriptions/:id', requireSession, requireScope('subscription.delete'), SubscriptionController.delete)


// Services
router.get('/services', requireSession, ServicesController.paginateAll)
router.get('/services/get-all-active', requireSession, ServicesController.getAllActive)
router.get('/services/get-all-inactive-too', requireSession, ServicesController.getAllInactiveToo)
router.get('/services/:id', requireSession, ServicesController.getById)
router.post('/services', requireSession, ServicesController.create)
router.put('/services/:id', requireSession, ServicesController.update)
router.delete('/services/:id', requireSession, ServicesController.delete)

// Invoices
router.get('/invoices', requireSession, InvoiceController.getAll)
router.get('/invoices/:id', requireSession, InvoiceController.getById)
router.post('/invoices', requireSession, InvoiceController.create)
router.put('/invoices/:id', requireSession, InvoiceController.update)
router.delete('/invoices/:id', requireSession, InvoiceController.delete)

// Invoice details
router.get('/invoice-details', requireSession, InvoiceDetailController.getAll)
router.get('/invoice-details/:id', requireSession, InvoiceDetailController.getById)
router.post('/invoice-details', requireSession, InvoiceDetailController.create)
router.put('/invoice-details/:id', requireSession, InvoiceDetailController.update)
router.delete('/invoice-details/:id', requireSession, InvoiceDetailController.delete)

// Vendor technitians
router.get('/vendor-tenchnitians', requireSession, VendorTenchnitianController.getAll)
router.get('/vendor-tenchnitians/:id', requireSession, VendorTenchnitianController.getById)
router.post('/vendor-tenchnitians', requireSession, VendorTenchnitianController.create)
router.put('/vendor-tenchnitians/:id', requireSession, VendorTenchnitianController.update)
router.delete('/vendor-tenchnitians/:id', requireSession, VendorTenchnitianController.delete)

// Technician teams
router.get('/technitian-teams', requireSession, TechnitianTeamController.getAll)
router.get('/technitian-teams/:id', requireSession, TechnitianTeamController.getById)
router.post('/technitian-teams', requireSession, TechnitianTeamController.create)
router.put('/technitian-teams/:id', requireSession, TechnitianTeamController.update)
router.delete('/technitian-teams/:id', requireSession, TechnitianTeamController.delete)

// Technician team members
router.get('/technitian-team-members', requireSession, TechnitianTeamMemberController.getAll)
router.get('/technitian-team-members/:id', requireSession, TechnitianTeamMemberController.getById)
router.post('/technitian-team-members', requireSession, TechnitianTeamMemberController.create)
router.put('/technitian-team-members/:id', requireSession, TechnitianTeamMemberController.update)
router.delete('/technitian-team-members/:id', requireSession, TechnitianTeamMemberController.delete)

// Olt routes
router.get('/olts', requireSession, OltController.getAll)
router.get('/olts/:id', requireSession, OltController.getById)
router.post('/olts', requireSession, OltController.create)
router.put('/olts/:id', requireSession, OltController.update)
router.delete('/olts/:id', requireSession, OltController.delete)

// Odc routes
router.get('/odcs', requireSession, OdcController.getAll)
router.get('/odcs/:id', requireSession, OdcController.getById)
router.post('/odcs', requireSession, OdcController.create)
router.put('/odcs/:id', requireSession, OdcController.update)
router.delete('/odcs/:id', requireSession, OdcController.delete)

// Odp routes
router.get('/odps', requireSession, OdpController.getAll)
router.get('/get-nearby-odps', requireSession, OdpController.getNearbyOdps)
router.get('/odps/:id', requireSession, OdpController.getById)
router.post('/odps', requireSession, OdpController.create)
router.put('/odps/:id', requireSession, OdpController.update)
router.delete('/odps/:id', requireSession, OdpController.delete)


// Ticket subscription routes
router.get('/ticket-subscriptions', requireSession, ticketSubscriptionController.getAll)
router.get('/ticket-subscriptions/:id', requireSession, ticketSubscriptionController.getById)
router.post('/ticket-subscriptions', upload.single('image_problem'), requireSession, ticketSubscriptionController.create)
router.put('/ticket-subscriptions/:id', requireSession, ticketSubscriptionController.update)
router.delete('/ticket-subscriptions/:id', requireSession, ticketSubscriptionController.delete)

// Ticket site routes
router.get('/ticket-sites', requireSession, ticketSiteController.getAll)
router.get('/ticket-sites/:id', requireSession, ticketSiteController.getById)
router.post('/ticket-sites', requireSession, ticketSiteController.create)
router.put('/ticket-sites/:id', requireSession, ticketSiteController.update)
router.delete('/ticket-sites/:id', requireSession, ticketSiteController.delete)

// Ticket site detail helpers
router.post('/ticket-sites/:siteId/details', requireSession, ticketSiteController.addDetail)
router.get('/ticket-sites/:siteId/details', requireSession, ticketSiteController.listDetails)

router.get('/fiber-routes', requireSession, fiberRouteController.getAll)
router.post('/fiber-routes', requireSession, fiberRouteController.create)
router.put('/fiber-routes/:id', requireSession, fiberRouteController.update)
router.delete('/fiber-routes/:id', requireSession, fiberRouteController.delete)


router.get('/bps/provinces', requireSession, bpsController.getProvinsi)
router.get('/bps/regencies', requireSession, bpsController.getKota)
router.get('/bps/districts', requireSession, bpsController.getKecamatan)
router.get('/bps/villages', requireSession, bpsController.getKelurahan)


// Auth routes
router.post('/auth/register', AuthController.register)
router.post('/auth/login', AuthController.login)

export default router;
