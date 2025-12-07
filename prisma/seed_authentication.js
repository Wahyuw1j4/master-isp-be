import { prisma } from '../src/prisma/prisma.js';
import bcrypt from 'bcryptjs';

// Resources and CRUD actions to generate permissions (scopes)
const RESOURCES = ['user','customer', 'invoice', 'service', 'fiber_route', 'manager_technitian', 'maintenance', 'technitian', 'subscription', 'site', 'role', 'scope', 'session', 'whatsapp'];
const CRUD = ['create', 'read', 'update', 'delete'];

// NOTE: project convention uses dot-notation for scopes (e.g. "subscription.read").
// Although the request showed colon ("user:create"), this seed will create scopes
// using the dot notation to match existing `requireScope('x.y')` checks.

// Role definitions with their scopes
const ROLE_DEFINITIONS = {
	admin: {
		description: 'Administrator role with full permissions',
		// Admin gets ALL scopes (will be assigned dynamically)
		scopes: 'ALL'
	},
	noc: {
		description: 'Network Operations Center - Monitoring & Network Management',
		scopes: [
			// NOC focuses on network monitoring, subscriptions, sites, and OLT management
			'subscription.read', 'subscription.update', 'subscription.create',
			'customer.read', 'customer.update', 'customer.create',
			'site.read', 'site.create', 'site.update',
			'fiber_route.read', 'fiber_route.create', 'fiber_route.update',
			'maintenance.read', 'maintenance.create', 'maintenance.update',
			'service.read', 
			'whatsapp.read', 'whatsapp.create', // for sending notifications
			'session.read'
		]
	},
	finance: {
		description: 'Finance - Invoice & Payment Management',
		scopes: [
			// Finance focuses on invoices, customers, and financial reports
			'invoice.read', 'invoice.create', 'invoice.update', 'invoice.delete',
			'customer.read', 'customer.update',
			'subscription.read',
			'service.read',
			'whatsapp.read', 'whatsapp.create', // for sending payment reminders
			'session.read'
		]
	},
	teknisi: {
		description: 'Teknisi - Field Technician for Installation & Maintenance',
		scopes: [
			// Teknisi focuses on installation, maintenance, and field work
			'technitian.read', 'technitian.update',
		]
	}
};

async function main() {
	console.log('Seeding RBAC scopes and roles...');

	// 1) Create/upsert scopes
	const createdScopes = [];
	const scopeMap = new Map(); // name -> scope object
	for (const resource of RESOURCES) {
		for (const action of CRUD) {
			const name = `${resource}.${action}`;
			const description = `${action.toUpperCase()} permission on ${resource}`;
			const scope = await prisma.scopes.upsert({
				where: { name },
				update: { description, updatedAt: new Date() },
				create: { name, description }
			});
			createdScopes.push(scope);
			scopeMap.set(name, scope);
			console.log(`Upserted scope: ${name}`);
		}
	}

	// 2) Create roles and assign scopes
	const roleMap = new Map(); // roleName -> role object

	for (const [roleName, roleConfig] of Object.entries(ROLE_DEFINITIONS)) {
		// Create or update role
		const role = await prisma.roles.upsert({
			where: { name: roleName },
			update: { description: roleConfig.description, updatedAt: new Date() },
			create: { name: roleName, description: roleConfig.description }
		});
		roleMap.set(roleName, role);
		console.log(`Upserted role: ${roleName}`);

		// Determine scopes to assign
		let scopesToAssign = [];
		if (roleConfig.scopes === 'ALL') {
			scopesToAssign = createdScopes;
		} else {
			scopesToAssign = roleConfig.scopes
				.map(scopeName => scopeMap.get(scopeName))
				.filter(Boolean); // filter out undefined scopes
		}

		// Map role -> scopes (createMany with skipDuplicates)
		const roleScopeRows = scopesToAssign.map(s => ({ roleId: role.id, scopeId: s.id }));

		// Remove stale role_scope entries so the DB matches ROLE_DEFINITIONS.
		// Strategy: delete any existing mappings for the role that are NOT in the
		// desired set, then (re)create the desired mappings. This ensures when
		// scopes are removed from ROLE_DEFINITIONS, they are also removed from DB.
		if (roleConfig.scopes === 'ALL') {
			// For ALL, desired ids are all createdScopes
			const newScopeIds = createdScopes.map(s => s.id);
			if (newScopeIds.length) {
				const del = await prisma.role_scopes.deleteMany({
					where: { roleId: role.id, scopeId: { notIn: newScopeIds } }
				});
				if (del && typeof del.count === 'number') console.log(`Removed ${del.count} stale scopes from role ${roleName}`);
			}
		} else {
			const newScopeIds = roleScopeRows.map(r => r.scopeId);
			if (newScopeIds.length) {
				const del = await prisma.role_scopes.deleteMany({
					where: { roleId: role.id, scopeId: { notIn: newScopeIds } }
				});
				if (del && typeof del.count === 'number') console.log(`Removed ${del.count} stale scopes from role ${roleName}`);
			} else {
				// No scopes defined for this role in ROLE_DEFINITIONS -> remove all
				const del = await prisma.role_scopes.deleteMany({ where: { roleId: role.id } });
				if (del && typeof del.count === 'number') console.log(`Removed ${del.count} stale scopes from role ${roleName} (role now has no scopes)`);
			}
		}

		if (roleScopeRows.length) {
			await prisma.role_scopes.createMany({ data: roleScopeRows, skipDuplicates: true });
			console.log(`Assigned ${roleScopeRows.length} scopes to role ${roleName}`);
		} else {
			console.log(`No scopes to assign to role ${roleName}`);
		}
	}

	// 3) Create default users for each role
	const defaultUsers = [
		{
			username: 'admin',
			email: 'wijaya@gmail.com',
			password: 'wijaya123',
			fullName: 'Administrator',
			role: 'admin'
		},
		{
			username: 'noc',
			email: 'noc@ayodyanet.com',
			password: 'noc123',
			fullName: 'NOC Staff',
			role: 'noc'
		},
		{
			username: 'finance',
			email: 'finance@ayodyanet.com',
			password: 'finance123',
			fullName: 'Finance Staff',
			role: 'finance'
		},
		{
			username: 'teknisi',
			email: 'teknisi@ayodyanet.com',
			password: 'teknisi123',
			fullName: 'Teknisi Staff',
			role: 'teknisi'
		}
	];

	for (const userData of defaultUsers) {
		const role = roleMap.get(userData.role);
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(userData.password, salt);

		const user = await prisma.users.upsert({
			where: { username: userData.username },
			update: { 
				email: userData.email, 
				passwordHash: hash, 
				fullName: userData.fullName, 
				roleId: role.id,
				updatedAt: new Date() 
			},
			create: { 
				username: userData.username, 
				email: userData.email, 
				passwordHash: hash, 
				fullName: userData.fullName, 
				roleId: role.id 
			}
		});
		console.log(`Upserted user: ${user.username} with role '${userData.role}'`);
	}

	console.log('RBAC seeding completed.');
	console.log('\n=== Default Users ===');
	console.log('Admin    : admin / wijaya123');
	console.log('NOC      : noc / noc123');
	console.log('Finance  : finance / finance123');
	console.log('Teknisi  : teknisi / teknisi123');
}

main()
	.then(async () => {
		await prisma.$disconnect();
		process.exit(0);
	})
	.catch(async (e) => {
		console.error('Seeding failed:', e);
		await prisma.$disconnect();
		process.exit(1);
	});

