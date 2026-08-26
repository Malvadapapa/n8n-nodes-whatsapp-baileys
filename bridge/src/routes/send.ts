import { Router, Request, Response } from 'express';
import { BaileysManager } from '../baileys-manager';

/**
 * Send routes — Endpoints for sending different types of WhatsApp messages.
 * All endpoints require a JSON body with a "to" field (phone number or JID).
 */
export function createSendRouter(manager: BaileysManager): Router {
  const router = Router();

  /**
   * POST /send/text
   * Body: { to: string, message: string }
   */
  router.post('/text', async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        res.status(400).json({ error: 'Missing required fields: to, message' });
        return;
      }
      const result = await manager.sendText(to, message);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /send/image
   * Body: { to: string, imageUrl: string, caption?: string }
   */
  router.post('/image', async (req: Request, res: Response) => {
    try {
      const { to, imageUrl, caption } = req.body;
      if (!to || !imageUrl) {
        res.status(400).json({ error: 'Missing required fields: to, imageUrl' });
        return;
      }
      const result = await manager.sendImage(to, imageUrl, caption);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /send/document
   * Body: { to: string, documentUrl: string, filename: string, mimetype?: string }
   */
  router.post('/document', async (req: Request, res: Response) => {
    try {
      const { to, documentUrl, filename, mimetype } = req.body;
      if (!to || !documentUrl || !filename) {
        res.status(400).json({ error: 'Missing required fields: to, documentUrl, filename' });
        return;
      }
      const result = await manager.sendDocument(to, documentUrl, filename, mimetype);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /send/location
   * Body: { to: string, latitude: number, longitude: number, name?: string }
   */
  router.post('/location', async (req: Request, res: Response) => {
    try {
      const { to, latitude, longitude, name } = req.body;
      if (!to || latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'Missing required fields: to, latitude, longitude' });
        return;
      }
      const result = await manager.sendLocation(to, latitude, longitude, name);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /send/contact
   * Body: { to: string, contactName: string, contactPhone: string }
   */
  router.post('/contact', async (req: Request, res: Response) => {
    try {
      const { to, contactName, contactPhone } = req.body;
      if (!to || !contactName || !contactPhone) {
        res.status(400).json({ error: 'Missing required fields: to, contactName, contactPhone' });
        return;
      }
      const result = await manager.sendContact(to, contactName, contactPhone);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /send/reply
   * Body: { to: string, message: string, quotedMessageId: string }
   */
  router.post('/reply', async (req: Request, res: Response) => {
    try {
      const { to, message, quotedMessageId } = req.body;
      if (!to || !message || !quotedMessageId) {
        res.status(400).json({ error: 'Missing required fields: to, message, quotedMessageId' });
        return;
      }
      const result = await manager.sendReply(to, message, quotedMessageId);
      res.json({ success: true, messageId: result?.key?.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
