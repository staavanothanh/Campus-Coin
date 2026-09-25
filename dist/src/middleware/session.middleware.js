export function createSessionMiddleware(authService, config) {
    return async (req, res, next) => {
        try {
            const cookieName = config.session.cookieName;
            const rawSessionId = req.cookies?.[cookieName];
            if (!rawSessionId) {
                req.appSession = undefined;
                req.appUser = undefined;
                return next();
            }
            const result = await authService.getSession(rawSessionId);
            if (!result) {
                res.clearCookie(cookieName, {
                    httpOnly: true,
                    secure: config.session.secure,
                    sameSite: config.session.sameSite,
                    path: '/',
                    domain: config.session.domain
                });
                req.appSession = undefined;
                req.appUser = undefined;
                return next();
            }
            req.appSession = result.session;
            req.appUser = result.user;
            next();
        }
        catch (error) {
            req.appSession = undefined;
            req.appUser = undefined;
            next();
        }
    };
}
//# sourceMappingURL=session.middleware.js.map