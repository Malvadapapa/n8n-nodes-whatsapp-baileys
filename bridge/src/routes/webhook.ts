import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BaileysManager } from '../baileys-manager';

/**
 * Webhook management routes — Register, list, and remove webhook URLs
 * that receive incoming WhatsApp messages from the bridge.
 */
export function createWebhookRouter(manager: BaileysManager): Router {
  const router = Router();

  /**
   * POST /webhook/register
   * Body: { url: string, events?: string[] }
   * Events can be: "*" (all), "messages", "status"
   */
  router.post('/register', (req: Request, res: Response) => {
    try {
      const { url, events, id } = req.body;
      if (!url) {
        res.status(400).json({ error: 'Missing required field: url' });
        return;
      }

      const webhookId = id || uuidv4();
      const registration = manager.registerWebhook(webhookId, url, events || ['*']);
      res.status(201).json({ success: true, webhook: registration });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /webhook — List all registered webhooks
   */
  router.get('/', (req: Request, res: Response) => {
    const webhooks = manager.getWebhooks();
    res.json({ webhooks });
  });

  /**
   * DELETE /webhook/:id — Remove a webhook by ID
   */
  router.delete('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const removed = manager.removeWebhook(id);
    if (removed) {
      res.json({ success: true, message: `Webhook ${id} removed` });
    } else {
      res.status(404).json({ error: `Webhook ${id} not found` });
    }
  });

  return router;
}
