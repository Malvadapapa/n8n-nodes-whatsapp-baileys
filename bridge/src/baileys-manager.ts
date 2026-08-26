import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  BaileysEventMap,
  proto,
  downloadMediaMessage,
  getContentType,
  WAMessageContent,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: Date;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'system' | 'error';
  fromOrTo: string;
  senderName?: string;
  content: string;
  detail?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  phoneNumber: string | null;
  name: string | null;
  lastConnected: Date | null;
  statusMessage: string;
  errorDetail: string | null;
  state: 'disconnected' | 'waiting_qr' | 'connecting' | 'connected' | 'error';
  registeredWebhooksCount: number;
  isWebhooksPaused: boolean;
}

export interface IncomingMessage {
  from: string;
  fromName: string | null;
  senderNumber: string;
  senderFormatted: string;
  to: string;
  messageId: string;
  timestamp: number;
  type: string;
  body: string | null;
  isGroup: boolean;
  isSelfChat: boolean;
  groupName: string | null;
  hasMedia: boolean;
  mediaType: string | null;
  quotedMessage: any | null;
  rawMessage: any;
}

/**
 * BaileysManager — Manages the Baileys WhatsApp connection lifecycle.
 * Handles QR generation, session persistence, message forwarding to webhooks,
 * and exposes methods for sending various message types.
 */
export class BaileysManager {
  private sock: WASocket | null = null;
  private qrCode: string | null = null;
  private isWebhooksPaused = false;
  private status: ConnectionStatus = {
    connected: false,
    phoneNumber: null,
    name: null,
    lastConnected: null,
    statusMessage: '⏳ Iniciando conexión con WhatsApp...',
    errorDetail: null,
    state: 'disconnected',
    registeredWebhooksCount: 0,
    isWebhooksPaused: false,
  };
  private webhooks: Map<string, WebhookRegistration> = new Map();
  private activityLogs: ActivityLogItem[] = [];
  private authDir: string;
  private logger: pino.Logger;
  private reconnectAttempts = 0;
  private qrGenerationCount = 0;

  constructor(authDir?: string) {
    this.authDir = authDir || path.resolve(__dirname, '../auth_info');
    this.logger = pino({ level: process.env.LOG_LEVEL || 'info' });

    // Ensure auth directory exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    // Load persisted webhooks if any
    this.loadWebhooksFromFile();
  }

  private getWebhooksFilePath(): string {
    return path.join(this.authDir, 'webhooks_config.json');
  }

  private loadWebhooksFromFile(): void {
    try {
      const filePath = this.getWebhooksFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list: WebhookRegistration[] = JSON.parse(raw);
        for (const item of list) {
          this.webhooks.set(item.id, { ...item, createdAt: new Date(item.createdAt) });
        }
        this.status.registeredWebhooksCount = this.webhooks.size;
        this.logger.info(`Loaded ${this.webhooks.size} persisted webhooks.`);
      }
    } catch (e: any) {
      this.logger.error({ err: e }, 'Failed to load webhooks file');
    }
  }

  private saveWebhooksToFile(): void {
    try {
      const filePath = this.getWebhooksFilePath();
      const list = Array.from(this.webhooks.values());
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e: any) {
      this.logger.error({ err: e }, 'Failed to save webhooks file');
    }
  }

  /**
   * Log an activity item to the in-memory circular buffer (keeps last 80 entries)
   */
  public logActivity(
    type: ActivityLogItem['type'],
    fromOrTo: string,
    content: string,
    senderName?: string,
    detail?: string
  ): void {
    const now = new Date();
    const logItem: ActivityLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: now.toISOString(),
      type,
      fromOrTo,
      senderName,
      content,
      detail,
    };
    this.activityLogs.unshift(logItem);
    if (this.activityLogs.length > 80) {
      this.activityLogs.pop();
    }
  }

  public getActivityLogs(): ActivityLogItem[] {
    return [...this.activityLogs];
  }

  /**
   * Start the Baileys connection.
   */
  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.sock = makeWASocket({
      auth: state,
      logger: this.logger as any,
      printQRInTerminal: false,
      browser: ['n8n-baileys-bridge', 'Chrome', '22.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: true,
    });

    // Handle connection updates (QR code, connect, disconnect)
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.qrGenerationCount++;
        this.status.state = 'waiting_qr';
        this.status.errorDetail = null;

        if (this.qrGenerationCount <= 1) {
          this.status.statusMessage = '📱 Escanea el código QR con WhatsApp para conectar';
        } else {
          this.status.statusMessage = `📱 Nuevo QR generado (intento ${this.qrGenerationCount}). Expira en 20s`;
        }
        this.logger.info(this.status.statusMessage);
        this.logActivity('system', 'Sistema', `Nuevo código QR generado (intento #${this.qrGenerationCount})`);
      }

      if (connection === 'open') {
        this.qrCode = null;
        this.reconnectAttempts = 0;
        this.qrGenerationCount = 0;
        this.status.connected = true;
        this.status.lastConnected = new Date();
        this.status.state = 'connected';
        this.status.errorDetail = null;

        // Get phone info
        const user = this.sock?.user;
        if (user) {
          this.status.phoneNumber = user.id.split(':')[0].split('@')[0];
          this.status.name = user.name || null;
        }

        this.status.statusMessage = `✅ Conectado como ${this.status.name || this.status.phoneNumber}`;
        this.logger.info(this.status.statusMessage);
        this.logActivity('system', 'WhatsApp', `Conectado exitosamente como +${this.status.phoneNumber} (${this.status.name || 'Sin nombre'})`);
      }

      if (connection === 'close') {
        this.status.connected = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        const errorMessage = (lastDisconnect?.error as any)?.message || 'Error desconocido';

        this.logger.warn(`Connection closed. Status: ${statusCode}. Reconnect: ${shouldReconnect}`);

        if (shouldReconnect) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, Math.min(this.reconnectAttempts, 5)), 30000);
          this.qrGenerationCount = 0;
          this.status.state = 'connecting';

          if (statusCode === 408) {
            this.status.statusMessage = '⏳ El QR expiró. Generando uno nuevo automáticamente...';
            this.status.errorDetail = 'El código QR no fue escaneado a tiempo. Se generará uno nuevo en unos segundos.';
            this.logActivity('system', 'Sistema', 'El código QR expiró sin ser escaneado. Regenerando...');
          } else if (statusCode === 401) {
            this.status.statusMessage = '🔑 Sesión inválida. Reconectando...';
            this.status.errorDetail = 'La sesión anterior ya no es válida. Se creará una nueva.';
            this.logActivity('system', 'WhatsApp', 'Sesión anterior inválida. Reconectando...');
          } else if (statusCode === 503) {
            this.status.statusMessage = '🌐 WhatsApp no disponible temporalmente. Reintentando...';
            this.status.errorDetail = 'Los servidores de WhatsApp no responden. Esto suele ser temporal.';
            this.logActivity('error', 'Red', 'Servidores de WhatsApp no responden. Reintentando...');
          } else if (statusCode === 515) {
            this.status.statusMessage = '🔄 WhatsApp requiere reconexión. Reintentando...';
            this.status.errorDetail = 'WhatsApp solicitó una reconexión. Esto es normal.';
            this.logActivity('system', 'WhatsApp', 'Reconexión solicitada por el servidor.');
          } else {
            this.status.statusMessage = `⚠️ Conexión perdida (código ${statusCode}). Reconectando en ${Math.round(delay / 1000)}s...`;
            this.status.errorDetail = `Error: ${errorMessage}. Intento #${this.reconnectAttempts}.`;
            this.logActivity('error', 'Conexión', `Conexión cerrada (código ${statusCode}). Reconectando...`);
          }

          this.logger.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        } else {
          // Logged out — clear session and re-auth
          this.status.state = 'error';
          this.status.statusMessage = '🚫 Sesión cerrada. Necesitas volver a vincular el dispositivo.';
          this.status.errorDetail = 'Tu sesión de WhatsApp fue cerrada. Reinicia para generar un nuevo QR.';
          this.qrCode = null;
          this.logActivity('system', 'WhatsApp', 'Sesión desvinculada. Generando nuevo código QR...');

          try {
            const files = fs.readdirSync(this.authDir);
            for (const file of files) {
              fs.unlinkSync(path.join(this.authDir, file));
            }
            this.status.statusMessage = '🔄 Sesión limpiada. Generando nuevo QR en 3 segundos...';
            setTimeout(() => this.connect(), 3000);
          } catch (err) {
            this.logger.error({ err }, 'Failed to clear auth session');
          }
        }
      }
    });

    // Save credentials on update
    this.sock.ev.on('creds.update', saveCreds);

    // Set of processed message IDs to prevent duplicates/loops
    const processedMessageIds = new Set<string>();
    // Map of recent message content hashes to prevent duplicate sync events
    const recentMessageDedupe = new Map<string, number>();

    // Handle incoming messages
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      const now = Date.now();

      // Clean up old dedupe entries (older than 10 seconds)
      for (const [key, timestamp] of recentMessageDedupe.entries()) {
        if (now - timestamp > 10000) {
          recentMessageDedupe.delete(key);
        }
      }

      for (const msg of messages) {
        if (!msg.message) continue;

        // Anti-loop: Check if message ID was already processed
        const messageId = msg.key.id || '';
        if (messageId && processedMessageIds.has(messageId)) continue;
        if (messageId) {
          processedMessageIds.add(messageId);
          if (processedMessageIds.size > 3000) {
            const first = processedMessageIds.values().next().value;
            if (first) processedMessageIds.delete(first);
          }
        }

        const parsed = this.parseMessage(msg);
        if (parsed) {
          // Discard empty synchronization stubs or non-content messages
          if (!parsed.body && !parsed.hasMedia) {
            continue;
          }

          // Anti-loop: If the message starts with the bot prefix '🤖', ignore it
          if (parsed.body && parsed.body.startsWith('🤖')) {
            continue;
          }

          // Check if message is strictly a self-chat (note to self)
          const myPhoneNumber = (this.status.phoneNumber || '').replace(/[^\d]/g, '');
          const userObj = this.sock?.user as any;
          const myLidNumber = userObj && userObj.lid ? String(userObj.lid).split(':')[0].replace(/[^\d]/g, '') : '';
          const remoteJid = msg.key.remoteJid || '';
          const remoteNumber = remoteJid.split('@')[0].replace(/[^\d]/g, '');

          const isSelfChat = Boolean(
            (myPhoneNumber && remoteNumber === myPhoneNumber) ||
            (myLidNumber && remoteNumber === myLidNumber)
          );

          // If fromMe is true AND it's not strictly a self-chat, ignore (outbound chats to friends/contacts)
          if (msg.key.fromMe && !isSelfChat) {
            continue;
          }

          // Deduplicate rapid sync duplicates for same content from same sender within 2.5 seconds
          const dedupeKey = `${parsed.from}_${parsed.body || ''}_${parsed.type}`;
          const lastSeen = recentMessageDedupe.get(dedupeKey);
          if (lastSeen && now - lastSeen < 2500) {
            this.logger.debug(`Ignoring duplicate message sync event for key: ${dedupeKey}`);
            continue;
          }
          recentMessageDedupe.set(dedupeKey, now);

          const preview = parsed.body ? (parsed.body.length > 60 ? parsed.body.substring(0, 60) + '...' : parsed.body) : `[${parsed.type}]`;
          let displaySender = '';
          if (isSelfChat) {
            displaySender = 'Tú (Nota personal)';
          } else if (parsed.fromName && parsed.senderFormatted) {
            displaySender = `${parsed.fromName} (${parsed.senderFormatted})`;
          } else if (parsed.fromName) {
            displaySender = `${parsed.fromName} (${parsed.senderNumber || parsed.from})`;
          } else if (parsed.senderFormatted) {
            displaySender = parsed.senderFormatted;
          } else {
            displaySender = parsed.from.replace('@s.whatsapp.net', '').replace('@g.us', ' (Grupo)');
          }

          this.logActivity('incoming', displaySender, preview);
          await this.forwardToWebhooks(parsed);
        }
      }
    });
  }

  /**
   * Parse a raw WhatsApp message into our standard IncomingMessage format.
   */
  private parseMessage(msg: proto.IWebMessageInfo): IncomingMessage | null {
    try {
      let messageContent: any = msg.message;
      if (!messageContent) return null;

      // Unwrap modern WhatsApp nested message wrappers (deviceSentMessage, ephemeral, viewOnce, etc.)
      while (
        messageContent?.ephemeralMessage ||
        messageContent?.viewOnceMessage ||
        messageContent?.viewOnceMessageV2 ||
        messageContent?.viewOnceMessageV2Extension ||
        messageContent?.documentWithCaptionMessage ||
        messageContent?.deviceSentMessage
      ) {
        messageContent =
          messageContent.ephemeralMessage?.message ||
          messageContent.viewOnceMessage?.message ||
          messageContent.viewOnceMessageV2?.message ||
          messageContent.viewOnceMessageV2Extension?.message ||
          messageContent.documentWithCaptionMessage?.message ||
          messageContent.deviceSentMessage?.message;
      }

      const contentType = getContentType(messageContent as WAMessageContent);
      if (!contentType) return null;

      let body: string | null = null;
      let type = 'unknown';
      let hasMedia = false;
      let mediaType: string | null = null;

      switch (contentType) {
        case 'conversation':
          type = 'text';
          body = messageContent.conversation || null;
          break;
        case 'extendedTextMessage':
          type = 'text';
          body = messageContent.extendedTextMessage?.text || null;
          break;
        case 'imageMessage':
          type = 'image';
          body = messageContent.imageMessage?.caption || null;
          hasMedia = true;
          mediaType = 'image';
          break;
        case 'videoMessage':
          type = 'video';
          body = messageContent.videoMessage?.caption || null;
          hasMedia = true;
          mediaType = 'video';
          break;
        case 'audioMessage':
          type = 'audio';
          hasMedia = true;
          mediaType = 'audio';
          break;
        case 'documentMessage':
          type = 'document';
          body = messageContent.documentMessage?.fileName || null;
          hasMedia = true;
          mediaType = 'document';
          break;
        case 'stickerMessage':
          type = 'sticker';
          hasMedia = true;
          mediaType = 'sticker';
          break;
        case 'contactMessage':
          type = 'contact';
          body = messageContent.contactMessage?.displayName || null;
          break;
        case 'locationMessage':
          type = 'location';
          const loc = messageContent.locationMessage;
          body = loc ? `${loc.degreesLatitude},${loc.degreesLongitude}` : null;
          break;
        default:
          type = contentType;
          break;
      }

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');

      const myPhoneNumber = (this.status.phoneNumber || '').replace(/[^\d]/g, '');
      const userObj = this.sock?.user as any;
      const myLidNumber = userObj && userObj.lid ? String(userObj.lid).split(':')[0].replace(/[^\d]/g, '') : '';
      const remoteNumber = remoteJid.split('@')[0].replace(/[^\d]/g, '');
      const isSelfChat = Boolean(
        (myPhoneNumber && remoteNumber === myPhoneNumber) ||
        (myLidNumber && remoteNumber === myLidNumber)
      );

      const rawSenderJid = msg.key.participant || remoteJid;
      let extractedNumber = '';

      if (isSelfChat) {
        extractedNumber = myPhoneNumber;
      } else if (rawSenderJid.endsWith('@s.whatsapp.net')) {
        extractedNumber = rawSenderJid.split('@')[0].replace(/[^\d]/g, '');
      } else {
        const msgAny = msg as any;
        const pnCandidate =
          msgAny.key?.participantPn ||
          msgAny.key?.peerRecipientPn ||
          msgAny.peer_recipient_pn ||
          msgAny.participantPn;

        if (pnCandidate) {
          extractedNumber = String(pnCandidate).split('@')[0].replace(/[^\d]/g, '');
        } else {
          extractedNumber = rawSenderJid.split('@')[0].replace(/[^\d]/g, '');
        }
      }

      const senderNumber = extractedNumber;
      const senderFormatted = extractedNumber ? `+${extractedNumber}` : '';

      // Get quoted message if replying
      let quotedMessage: any = null;
      if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage) {
        quotedMessage = {
          messageId: messageContent.extendedTextMessage.contextInfo.stanzaId,
          participant: messageContent.extendedTextMessage.contextInfo.participant,
        };
      }

      return {
        from: msg.key.participant || remoteJid,
        fromName: msg.pushName || null,
        senderNumber,
        senderFormatted,
        to: remoteJid,
        messageId: msg.key.id || '',
        timestamp: typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp
          : Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
        type,
        body,
        isGroup,
        isSelfChat,
        groupName: null,
        hasMedia,
        mediaType,
        quotedMessage,
        rawMessage: msg,
      };
    } catch (err) {
      this.logger.error({ err }, 'Failed to parse message');
      return null;
    }
  }

  /**
   * Forward a parsed message to all registered webhooks.
   */
  private async forwardToWebhooks(message: IncomingMessage): Promise<void> {
    const payload = { ...message, rawMessage: undefined };

    if (this.isWebhooksPaused) {
      this.logActivity('system', 'Webhook', `⏸️ Mensaje recibido pero el reenvío a n8n está PAUSADO.`);
      return;
    }

    if (this.webhooks.size === 0) {
      this.logActivity('system', 'Webhook', '⚠️ Mensaje recibido pero no hay ningún webhook de n8n configurado.');
      return;
    }

    for (const [id, webhook] of this.webhooks) {
      if (webhook.events.length > 0 && !webhook.events.includes('messages') && !webhook.events.includes('*')) {
        continue;
      }

      // Auto-sanitize n8n:5678 to localhost:5678 in local environment
      let targetUrl = webhook.url;
      if (targetUrl.includes('://n8n:5678')) {
        targetUrl = targetUrl.replace('://n8n:5678', '://localhost:5678');
      }

      try {
        await axios.post(targetUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });
        this.logger.info(`Webhook ${id} notified: ${message.type} from ${message.from}`);
        this.logActivity('system', 'Webhook', `✓ Entregado a n8n correctamente (HTTP 200)`);
      } catch (err: any) {
        this.logger.error(`Webhook ${id} failed: ${err.message}`);
        this.logActivity('error', 'Webhook', `❌ Falló entrega a n8n: ${err.message}`, undefined, `URL: ${targetUrl}`);
      }
    }
  }

  // ─── Public API Methods ───────────────────────────────────────────────

  toggleWebhooksPause(): boolean {
    this.isWebhooksPaused = !this.isWebhooksPaused;
    this.status.isWebhooksPaused = this.isWebhooksPaused;
    this.logActivity('system', 'Webhook', this.isWebhooksPaused ? '⏸️ Reenvío de mensajes a n8n PAUSADO manualmente.' : '▶️ Reenvío de mensajes a n8n REANUDADO.');
    return this.isWebhooksPaused;
  }

  isPaused(): boolean {
    return this.isWebhooksPaused;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getStatus(): ConnectionStatus {
    return {
      ...this.status,
      isWebhooksPaused: this.isWebhooksPaused,
      registeredWebhooksCount: this.webhooks.size,
    };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Register a webhook URL to receive incoming messages.
   */
  registerWebhook(id: string, url: string, events: string[] = ['*']): WebhookRegistration {
    const registration: WebhookRegistration = { id, url, events, createdAt: new Date() };
    this.webhooks.set(id, registration);
    this.saveWebhooksToFile();
    this.logger.info(`Webhook registered: ${id} → ${url}`);
    this.logActivity('system', 'Webhook', `Webhook configurado: ${url}`);
    return registration;
  }

  removeWebhook(id: string): boolean {
    const removed = this.webhooks.delete(id);
    if (removed) {
      this.saveWebhooksToFile();
      this.logger.info(`Webhook removed: ${id}`);
      this.logActivity('system', 'Webhook', `Webhook eliminado: ${id}`);
    }
    return removed;
  }

  getWebhooks(): WebhookRegistration[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Format phone number to WhatsApp JID.
   */
  private formatJid(phone: string): string {
    if (phone.includes('@')) return phone;
    const cleaned = phone.replace(/[^\d]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Send a text message.
   */
  async sendText(to: string, message: string): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const result = await this.sock.sendMessage(jid, { text: message });
    const preview = message.length > 60 ? message.substring(0, 60) + '...' : message;
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', '').replace('@g.us', ' (Grupo)'), preview);
    return result;
  }

  /**
   * Send an image message.
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const result = await this.sock.sendMessage(jid, {
      image: buffer,
      caption: caption || undefined,
    });
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', ''), `[Imagen] ${caption || ''}`);
    return result;
  }

  /**
   * Send a document message.
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    mimetype?: string
  ): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const result = await this.sock.sendMessage(jid, {
      document: buffer,
      mimetype: mimetype || 'application/octet-stream',
      fileName: filename,
    });
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', ''), `[Documento] ${filename}`);
    return result;
  }

  /**
   * Send a location message.
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string
  ): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const result = await this.sock.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: name || undefined,
      },
    });
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', ''), `[Ubicación] ${name || `${latitude}, ${longitude}`}`);
    return result;
  }

  /**
   * Send a contact vCard message.
   */
  async sendContact(
    to: string,
    contactName: string,
    contactPhone: string
  ): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `FN:${contactName}\n` +
      `TEL;type=CELL;type=VOICE;waid=${contactPhone.replace(/[^\d]/g, '')}:${contactPhone}\n` +
      `END:VCARD`;

    const result = await this.sock.sendMessage(jid, {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard }],
      },
    });
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', ''), `[Contacto] ${contactName} (${contactPhone})`);
    return result;
  }

  /**
   * Reply to a specific message by quoting it.
   */
  async sendReply(
    to: string,
    message: string,
    quotedMessageId: string
  ): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this.status.connected) {
      throw new Error('WhatsApp no está conectado');
    }
    const jid = this.formatJid(to);
    const result = await this.sock.sendMessage(jid, { text: message }, {
      quoted: {
        key: {
          remoteJid: jid,
          id: quotedMessageId,
        },
        message: { conversation: '' },
      } as proto.IWebMessageInfo,
    });
    const preview = message.length > 60 ? message.substring(0, 60) + '...' : message;
    this.logActivity('outgoing', to.replace('@s.whatsapp.net', '').replace('@g.us', ' (Grupo)'), `[Cita] ${preview}`);
    return result;
  }

  /**
   * Log out of WhatsApp, delete saved credentials, and generate a new QR immediately.
   */
  async logout(): Promise<void> {
    this.logActivity('system', 'Usuario', 'Cierre de sesión manual solicitado. Limpiando credenciales...');
    
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock.end(undefined);
        this.sock = null;
      }
    } catch (e) {
      // Ignore
    }

    // Delete session files
    try {
      if (fs.existsSync(this.authDir)) {
        const files = fs.readdirSync(this.authDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.authDir, file));
        }
      }
    } catch (err: any) {
      this.logger.error({ err }, 'Error cleaning authDir during logout');
    }

    this.status.connected = false;
    this.status.phoneNumber = null;
    this.status.name = null;
    this.status.state = 'waiting_qr';
    this.status.statusMessage = '🔄 Sesión cerrada. Generando nuevo código QR...';
    this.qrCode = null;

    this.logActivity('system', 'WhatsApp', 'Sesión reseteada. Listo para vincular nuevo número.');

    // Reconnect to get a fresh QR
    setTimeout(() => this.connect(), 1500);
  }

  /**
   * Disconnect and clean up.
   */
  async disconnect(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    this.status.connected = false;
    this.qrCode = null;
  }
}
