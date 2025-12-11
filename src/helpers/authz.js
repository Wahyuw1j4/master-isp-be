// Helper untuk RBAC: ambil dan cek scope user
import { prisma } from '../prisma.js';

export async function getScopesForUser(userId) {
  // Ambil scope dari role (melalui field roleId di users) dan user scope
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          roleScopes: { include: { scope: true } }
        }
      }
    }
  });
  const roleScopes = user?.role?.roleScopes?.map(rs => rs.scope.name) || [];
  const userScopes = await prisma.user_scopes.findMany({
    where: { userId },
    include: { scope: true }
  });
  const directScopes = userScopes.map(us => us.scope.name);
  return Array.from(new Set([...roleScopes, ...directScopes]));
}

export function hasScope(scopes, needed) {
  // Cek scope dan wildcard
  const neededArr = Array.isArray(needed) ? needed : [needed];
  for (const n of neededArr) {
    for (const s of scopes) {
      if (s === n) return true;
      if (s.endsWith('*')) {
        const prefix = s.replace(/\.\*$/, '');
        if (n.startsWith(prefix + '.')) return true;
      }
      if (!s.includes('.') && n.startsWith(s + '.')) return true;
    }
  }
  return false;
}
