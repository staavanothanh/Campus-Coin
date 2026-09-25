import { unauthorizedError, accountDisabledError, forbiddenError } from '../lib/errors.js';
export const requireAuth = (req, _res, next) => {
    if (!req.appUser) {
        return next(unauthorizedError());
    }
    if (req.appUser.status === 'disabled') {
        return next(accountDisabledError());
    }
    next();
};
export function requireRole(...roles) {
    return (req, res, next) => {
        requireAuth(req, res, (err) => {
            if (err)
                return next(err);
            if (!req.appUser || !roles.includes(req.appUser.role)) {
                return next(forbiddenError());
            }
            next();
        });
    };
}
//# sourceMappingURL=require-auth.middleware.js.map