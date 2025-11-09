import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to verify JWT and attach user to request
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }
}

// Middleware to check for required role
export function authorizeRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: insufficient role' });
        }
        next();
    };
}

// Middleware to check for required permission
export function authorizePermission(permission) {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions || !req.user.permissions.split(',').includes(permission)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden: insufficient permission' });
        }
        next();
    };
}
