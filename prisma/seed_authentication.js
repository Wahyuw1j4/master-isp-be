import { prisma } from '../src/prisma/prisma.js';
import bcrypt from 'bcryptjs';

// Resources and CRUD actions to generate permissions (scopes)
const RESOURCES = ['user','customer', 'invoice', 'service', 'fiber_route', 'manager_technitian', 'maintenance', 'technitian', 'subscription', 'site', 'role', 'scope', 'session', 'whatsapp'];
const CRUD = ['create', 'read', 'update', 'delete'];

// NOTE: project convention uses dot-notation for scopes (e.g. "subscription.read").
// Although the request showed colon ("user:create"), this seed will create scopes
// using the dot notation to match existing `requireScope('x.y')` checks.

async function main() {
	console.log('Seeding RBAC scopes and admin role...');

	// 1) Create/upsert scopes
	const createdScopes = [];
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
			console.log(`Upserted scope: ${name}`);
		}
	}

	// 2) Create or update an "admin" role and attach all scopes to it
	const roleName = 'admin';
	const role = await prisma.roles.upsert({
		where: { name: roleName },
		update: { description: 'Administrator role with full permissions', updatedAt: new Date() },
		create: { name: roleName, description: 'Administrator role with full permissions' }
	});
	console.log(`Upserted role: ${roleName}`);

	// 3) Map role -> scopes (createMany with skipDuplicates)
	const roleScopeRows = createdScopes.map(s => ({ roleId: role.id, scopeId: s.id }));
	if (roleScopeRows.length) {
		// createMany with skipDuplicates avoids errors if mappings already exist
		await prisma.role_scopes.createMany({ data: roleScopeRows, skipDuplicates: true });
		console.log(`Assigned ${roleScopeRows.length} scopes to role ${roleName}`);
	}

	// 4) Ensure an admin user exists and assign the admin role
	const adminUsername = 'admin';
	const adminEmail = "wijaya@gmail.com"
	const adminPassword = "wijaya123"

	// create password hash
	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(adminPassword, salt);

	const adminUser = await prisma.users.upsert({
		where: { username: adminUsername },
		update: { email: adminEmail, passwordHash: hash, fullName: 'Administrator', updatedAt: new Date() },
		create: { username: adminUsername, email: adminEmail, passwordHash: hash, fullName: 'Administrator', roleId: role.id }
	});
	console.log(`Upserted admin user: ${adminUser.username}`);

	// assign role to admin user is now handled via roleId field on user
	console.log(`Assigned role '${roleName}' to user '${adminUser.username}' via roleId field (1 user : 1 role)`);

	console.log('RBAC seeding completed.');
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

