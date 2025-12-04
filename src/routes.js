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
import whatsappController from './controllers/whatsapp.controller.js';
import notificationController from './controllers/notification.controller.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 50 MB limit

// Auth
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', requireSession, AuthController.logout);
router.get('/me', requireSession, AuthController.me);

// Users
router.get('/users', requireSession, requireScope(['user.read']), userController.list);
router.post('/users', requireSession, requireScope(['user.create']), userController.create);

// Roles
router.get('/roles', requireSession, requireScope(['role.read']), roleController.list);
router.post('/roles', requireSession, requireScope(['role.create']), roleController.create);

router.delete('/roles/:id', requireSession, requireScope(['role.delete']), roleController.delete);
router.post('/roles/:roleId/scopes/:scopeId', requireSession, requireScope(['role.scope.add']), roleController.addScope);

// Scopes
router.get('/scopes', requireSession, requireScope(['scope.read']), ScopeController.list);
router.post('/scopes', requireSession, requireScope(['scope.create']), ScopeController.create);

// Admin
router.post('/admin/users/:userId/set-roles', requireSession, requireScope(['admin.update']), AdminController.setRoles);

// Sessions
router.get('/sessions/me', requireSession, SessionController.listMine);
router.post('/sessions/me/revoke/:sid', requireSession, SessionController.revokeOne);
router.post('/sessions/me/revoke-all', requireSession, SessionController.revokeAll);

router.get('/customers', requireSession, requireScope(['customer.read']), CustomerController.getAll)
router.get('/customers/search', requireSession, requireScope(['customer.read']), CustomerController.searchCustomers)
router.get('/customers/:id', requireSession, requireScope(['customer.read']), CustomerController.getById)
router.post('/customers', requireSession, requireScope(['customer.create']), upload.single('ktp_file'), CustomerController.create)
router.put('/customers/:id', requireSession, requireScope(['customer.update']), CustomerController.update)
router.delete('/customers/:id', requireSession, requireScope(['customer.delete']), CustomerController.delete)

// Subscription routes
router.get('/coverage', requireSession, requireScope(['subscription.read']), SubscriptionController.getCoverage)
router.get('/subscriptions', requireSession, requireScope(['subscription.read']), SubscriptionController.getAll)

// Notifications
router.get('/notifications', requireSession, requireScope(['subscription.read']), notificationController.getAll)
//get subscription by service id
router.get('/subscriptions/service/:serviceId', requireSession, requireScope(['subscription.read']), SubscriptionController.getByServiceId)
router.get('/subscriptions/olt/:oltId', requireSession, requireScope(['subscription.read']), SubscriptionController.getByOltId)
router.get('/subscriptions/olt/:oltId/coordinates', requireSession, requireScope(['subscription.read']), SubscriptionController.getCoordinatesByOltId)
router.get('/subscriptions/odc/:odcId', requireSession, requireScope(['subscription.read']), SubscriptionController.getByOdcId)
router.get('/subscriptions/odc/:odcId/coordinates', requireSession, requireScope(['subscription.read']), SubscriptionController.getCoordinatesByOdcId)
router.get('/subscriptions/odp/:odpId', requireSession, requireScope(['subscription.read']), SubscriptionController.getByOdpId)
router.get('/subscriptions/odp/:odpId/coordinates', requireSession, requireScope(['subscription.read']), SubscriptionController.getCoordinatesByOdpId)
router.get('/subscriptions/search', requireSession, requireScope(['subscription.read']), SubscriptionController.searchSubscriptions)
router.get('/subscriptions/:id', requireSession, requireScope(['subscription.read']), SubscriptionController.getById)
router.post('/subscriptions', requireSession, requireScope(['subscription.create']), SubscriptionController.create)
router.put('/subscriptions/:id/update-proceed', requireSession, requireScope(['subscription.update']), SubscriptionController.updateProceed)
router.delete('/subscriptions/:id', requireSession, requireScope(['subscription.delete']), SubscriptionController.delete)
router.post('/subscriptions/create-onu', requireSession, requireScope(['subscription.create']), SubscriptionController.createOnu)
router.post('/subscriptions/delete-onu', requireSession, requireScope(['subscription.delete']), SubscriptionController.deleteOnu)
router.post('/subscriptions/reinstall-onu', requireSession, requireScope(['subscription.update']), SubscriptionController.reinstallOnu)
router.post('/subscriptions/:id/suspend', requireSession, requireScope(['subscription.update']), SubscriptionController.suspendSubscription)
router.post('/subscriptions/:id/unsuspend', requireSession, requireScope(['subscription.update']), SubscriptionController.unsuspendSubscription)


// Services
router.get('/services', requireSession, ServicesController.paginateAll)
router.get('/services/get-all-active', requireSession, requireScope(['service.read']), ServicesController.getAllActive)
router.get('/services/get-all-inactive-too', requireSession, requireScope(['service.read']), ServicesController.getAllInactiveToo)
router.get('/services/:id', requireSession, requireScope(['service.read']), ServicesController.getById)
router.post('/services', requireSession, requireScope(['service.create']), ServicesController.create)
router.put('/services/:id', requireSession, requireScope(['service.update']), ServicesController.update)
router.delete('/services/:id', requireSession, requireScope(['service.delete']), ServicesController.delete)

// Invoices
router.get('/invoices', requireSession, requireScope(['invoice.read']), InvoiceController.getAll)
router.get('/invoices/:id', requireSession, requireScope(['invoice.read']), InvoiceController.getById)
router.post('/invoices', requireSession, requireScope(['invoice.create']), InvoiceController.create)
router.put('/invoices/:id', requireSession, requireScope(['invoice.update']), InvoiceController.update)
router.delete('/invoices/:id', requireSession, requireScope(['invoice.delete']), InvoiceController.delete)
router.get('/invoices/public/:id', InvoiceController.getPublicById)
router.get('/invoices/public/:id/download', InvoiceController.downloadPublicInvoice)

// Invoice details
router.get('/invoice-details', requireSession, requireScope(['invoice_detail.read']), InvoiceDetailController.getAll)
router.get('/invoice-details/:id', requireSession, requireScope(['invoice_detail.read']), InvoiceDetailController.getById)
router.post('/invoice-details', requireSession, requireScope(['invoice_detail.create']), InvoiceDetailController.create)
router.put('/invoice-details/:id', requireSession, requireScope(['invoice_detail.update']), InvoiceDetailController.update)
router.delete('/invoice-details/:id', requireSession, requireScope(['invoice_detail.delete']), InvoiceDetailController.delete)

// Vendor technitians
router.get('/vendor-tenchnitians', requireSession, requireScope(['admin.read']), VendorTenchnitianController.getAll)
router.get('/vendor-tenchnitians/:id', requireSession, requireScope(['admin.read']), VendorTenchnitianController.getById)
router.post('/vendor-tenchnitians', requireSession, requireScope(['admin.create']), VendorTenchnitianController.create)
router.put('/vendor-tenchnitians/:id', requireSession, requireScope(['admin.update']), VendorTenchnitianController.update)
router.delete('/vendor-tenchnitians/:id', requireSession, requireScope(['admin.delete']), VendorTenchnitianController.delete)
// Technician teams
router.get('/technitian-teams', requireSession, requireScope(['admin.read']), TechnitianTeamController.getAll)
router.get('/technitian-teams/:id', requireSession, requireScope(['admin.read']), TechnitianTeamController.getById)
router.post('/technitian-teams', requireSession, requireScope(['admin.create']), TechnitianTeamController.create)
router.put('/technitian-teams/:id', requireSession, requireScope(['admin.update']), TechnitianTeamController.update)
router.delete('/technitian-teams/:id', requireSession, requireScope(['admin.delete']), TechnitianTeamController.delete)

// Technician team members
router.get('/technitian-team-members', requireSession, requireScope(['manager_technitian.read']), TechnitianTeamMemberController.getAll)
router.get('/technitian-team-members/:id', requireSession, requireScope(['manager_technitian.read']), TechnitianTeamMemberController.getById)
router.post('/technitian-team-members', requireSession, requireScope(['manager_technitian.create']), TechnitianTeamMemberController.create)
router.put('/technitian-team-members/:id', requireSession, requireScope(['manager_technitian.update']), TechnitianTeamMemberController.update)
router.delete('/technitian-team-members/:id', requireSession, requireScope(['manager_technitian.delete']), TechnitianTeamMemberController.delete)

// Olt routes
router.get('/olts', requireSession, requireScope(['site.read']), OltController.getAll)
router.get('/olts/search', requireSession, requireScope(['site.read']), OltController.searchOlts)
router.get('/olts/:id', requireSession, requireScope(['site.read']), OltController.getById)
router.post('/olts', requireSession, requireScope(['site.create']), OltController.create)
router.put('/olts/:id', requireSession, requireScope(['site.update']), OltController.update)
router.delete('/olts/:id', requireSession, requireScope(['site.delete']), OltController.delete)

// Odc routes
router.get('/odcs', requireSession, requireScope(['site.read']), OdcController.getAll)
router.get('/odcs/search', requireSession, requireScope(['site.read']), OdcController.searchOdcs)
router.get('/odcs/:id', requireSession, requireScope(['site.read']), OdcController.getById)
router.post('/odcs', requireSession, requireScope(['site.create']), OdcController.create)
router.put('/odcs/:id', requireSession, requireScope(['site.update']), OdcController.update)
router.delete('/odcs/:id', requireSession, requireScope(['site.delete']), OdcController.delete)

// Odp routes
router.get('/odps', requireSession, requireScope(['site.read']), OdpController.getAll)
router.get('/odps/search', requireSession, requireScope(['site.read']), OdpController.searchOdps)
router.get('/get-nearby-odps', requireSession, requireScope(['site.read']), OdpController.getNearbyOdps)
router.get('/odps/:id', requireSession, requireScope(['site.read']), OdpController.getById)
router.post('/odps', requireSession, requireScope(['site.create']), OdpController.create)
router.put('/odps/:id', requireSession, requireScope(['site.update']), OdpController.update)
router.delete('/odps/:id', requireSession, requireScope(['site.delete']), OdpController.delete)


// Ticket subscription routes
router.get('/ticket-subscriptions', requireSession, requireScope(['maintenance.read']), ticketSubscriptionController.getAll)
router.get('/ticket-subscriptions/:id', requireSession, requireScope(['maintenance.read']), ticketSubscriptionController.getById)
router.post('/ticket-subscriptions', upload.single('image_problem'), requireSession, requireScope(['maintenance.create']), ticketSubscriptionController.create)
router.put('/ticket-subscriptions/:id', requireSession, requireScope(['maintenance.update']), ticketSubscriptionController.update)
router.delete('/ticket-subscriptions/:id', requireSession, requireScope(['maintenance.delete']), ticketSubscriptionController.delete)
// Ticket site routes
router.get('/ticket-sites', requireSession, requireScope(['maintenance.read']), ticketSiteController.getAll)
router.get('/ticket-sites/:id', requireSession, requireScope(['maintenance.read']), ticketSiteController.getById)
router.post('/ticket-sites', upload.single('image_problem'), requireSession, requireScope(['maintenance.create']), ticketSiteController.create)
router.put('/ticket-sites/:id', requireSession, requireScope(['maintenance.update']), ticketSiteController.update)
router.delete('/ticket-sites/:id', requireSession, requireScope(['maintenance.delete']), ticketSiteController.delete)


router.get('/fiber-routes', requireSession, requireScope(['subscription.read']), fiberRouteController.getAll)
router.post('/fiber-routes', requireSession, requireScope(['subscription.create']), fiberRouteController.create)
router.put('/fiber-routes/:id', requireSession, requireScope(['subscription.update']), fiberRouteController.update)
router.delete('/fiber-routes/:id', requireSession, requireScope(['subscription.delete']), fiberRouteController.delete)

router.get('/bps/provinces', requireSession, requireScope(['subscription.read']), bpsController.getProvinsi)
router.get('/bps/regencies', requireSession, requireScope(['subscription.read']), bpsController.getKota)
router.get('/bps/districts', requireSession, requireScope(['subscription.read']), bpsController.getKecamatan)
router.get('/bps/villages', requireSession, requireScope(['subscription.read']), bpsController.getKelurahan)

// WhatsApp routes
router.post('/whatsapp/sessions', requireSession, whatsappController.createSession)
router.get('/whatsapp/sessions', requireSession, whatsappController.listAll)
router.get('/whatsapp/sessions/:name/status', requireSession, whatsappController.getSessionStatus)
router.get('/whatsapp/sessions/:name/qr', requireSession, whatsappController.getSessionQR)
router.post('/whatsapp/sessions/:name/send', requireSession, whatsappController.sendMessage)
router.post('/whatsapp/sessions/:name/restart', requireSession, whatsappController.restartSession)
router.delete('/whatsapp/sessions/:name', requireSession, whatsappController.deleteSession)
router.get('/whatsapp/messages', requireSession, whatsappController.getMessages)

// WhatsApp Template routes
router.get('/whatsapp/templates', requireSession, whatsappController.getTemplates);
router.post('/whatsapp/templates', requireSession, whatsappController.createTemplate);
router.put('/whatsapp/templates/:code', requireSession, whatsappController.updateTemplate);
router.get('/whatsapp/templates/:code', requireSession, whatsappController.getTemplateByCode);
router.post('/whatsapp/sessions/:name/send-template', requireSession, whatsappController.sendTemplateMessage);

// Auth routes
router.post('/auth/register', AuthController.register)
router.post('/auth/login', AuthController.login)

export default router;
