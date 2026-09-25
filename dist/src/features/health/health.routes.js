import { Router } from 'express';
export function createHealthRouter(pool) {
    const router = Router();
    router.get('/', (_req, res) => {
        res.status(200).json({
            data: {
                status: 'pass',
                timestamp: new Date().toISOString()
            }
        });
    });
    router.get('/ready', async (_req, res) => {
        if (!pool) {
            return res.status(200).json({
                data: {
                    status: 'pass',
                    checks: { database: 'unconfigured' }
                }
            });
        }
        try {
            await pool.query('SELECT 1');
            return res.status(200).json({
                data: {
                    status: 'pass',
                    checks: { database: 'pass' }
                }
            });
        }
        catch (error) {
            return res.status(503).json({
                data: {
                    status: 'fail',
                    checks: { database: 'fail' }
                }
            });
        }
    });
    return router;
}
//# sourceMappingURL=health.routes.js.map