import { Router, Request, Response } from 'express';
import { BaileysManager } from '../baileys-manager';

/**
 * Status route — Returns current WhatsApp connection status
 * including user-friendly status messages and error details.
 */
export function createStatusRouter(manager: BaileysManager): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const status = manager.getStatus();
    res.json(status);
  });

  return router;
}
