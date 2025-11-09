// Middleware cek scope user
import { getScopesForUser, hasScope } from '../helpers/authz.js';
import { Controller } from '../controllers/controller.js';

export default function requireScope(needed) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return Controller.sendResponse(res, 401, 'Unauthorized');
      }

      // Prefer scopes attached by requireSession; fall back to fetching
      const scopes = Array.isArray(req.user.scopes) ? req.user.scopes : await getScopesForUser(req.user.id);

      // Check permission using helper (supports wildcard and arrays)
      if (!hasScope(scopes, needed)) {
        return Controller.sendResponse(res, 403, 'Insufficient scope');
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
