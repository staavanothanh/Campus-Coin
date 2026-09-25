import { Router, Response } from 'express';

export function createHealthRouter(pool?: any): Router {
  const router = Router();

  router.get('/', (_req, res: Response) => {
    res.status(200).json({
      data: {
        status: 'pass',
        timestamp: new Date().toISOString()
      }
    });
  });

  router.get('/ready', async (_req, res: Response) => {
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
    } catch (error) {
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
