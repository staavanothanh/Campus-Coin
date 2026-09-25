import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.middleware.js';
import { validationError } from '../../lib/errors.js';
const preferencesSchema = z.object({
    displayName: z.string().min(1).max(120).optional(),
    locale: z.enum(['en', 'vi']).optional()
}).refine(data => data.displayName !== undefined || data.locale !== undefined, {
    message: "At least one field must be provided"
});
export function createPreferencesRouter(authService) {
    const router = Router();
    router.patch('/', requireAuth, async (req, res, next) => {
        try {
            const result = preferencesSchema.safeParse(req.body);
            if (!result.success) {
                throw validationError(result.error.errors);
            }
            const updatedUser = await authService.updatePreferences(req.appUser.id, {
                displayName: result.data.displayName,
                locale: result.data.locale
            });
            res.status(200).json({
                data: {
                    id: updatedUser.id,
                    displayName: updatedUser.displayName,
                    email: updatedUser.email,
                    locale: updatedUser.locale,
                    role: updatedUser.role
                }
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
//# sourceMappingURL=preferences.routes.js.map