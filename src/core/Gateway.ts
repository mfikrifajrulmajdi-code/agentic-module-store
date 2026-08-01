import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { IEventBus } from '../interfaces/IEventBus';
import { IMemoryProvider } from '../interfaces/IMemoryProvider';
import { IngressPayload, Message } from '../types';

export class Gateway {
  private app = express();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private processedMessages = new Map<string, number>();
  private secretKey: string;

  constructor(
    private eventBus: IEventBus,
    private memoryManager: IMemoryProvider,
    private port: number = 3000
  ) {
    if (process.env.NODE_ENV === 'production' && !process.env.HMAC_SECRET) {
      throw new Error('[FATAL] Gateway Initialization Error: HMAC_SECRET environment variable MUST be defined in production!');
    }
    this.secretKey = process.env.HMAC_SECRET || 'kasku_dev_secret_key_2026';

    this.app.use(express.json());
    this.setupRoutes();
  }

  private isDuplicateMessage(dedupKey: string): boolean {
    const now = Date.now();
    
    for (const [key, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > 30000) {
        this.processedMessages.delete(key);
      }
    }

    if (this.processedMessages.has(dedupKey)) {
      return true;
    }

    this.processedMessages.set(dedupKey, now);
    return false;
  }

  private verifyHmacSignature(rawBody: string, signatureHeader?: string, timestampHeader?: string): boolean {
    if (process.env.NODE_ENV === 'development' && !signatureHeader) {
      return true;
    }
    if (!signatureHeader) return false;

    if (timestampHeader) {
      const requestTime = parseInt(timestampHeader, 10);
      if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 300000) {
        console.warn('[Gateway] Webhook rejected: Timestamp expired or invalid (Replay Attack Prevention)');
        return false;
      }
    }

    const payloadToSign = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody;
    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadToSign)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSig)
    );
  }

  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const limitInfo = this.rateLimits.get(tenantId) || { count: 0, resetTime: now + 60000 };

    if (now > limitInfo.resetTime) {
      limitInfo.count = 0;
      limitInfo.resetTime = now + 60000;
    }

    limitInfo.count++;
    this.rateLimits.set(tenantId, limitInfo);

    return limitInfo.count <= 100;
  }

  private setupRoutes() {
    this.app.post('/api/v1/ingress', async (req: Request, res: Response) => {
      try {
        let payload: IngressPayload = req.body;

        if (req.body && req.body.event === 'message.received') {
          const data = req.body.data || req.body.payload || {};
          
          if (data.direction === 'outgoing' || data.fromMe || data.message?.key?.fromMe) {
            return res.status(200).json({ status: 'ignored' });
          }
          
          const content = data.body || 
                          data.message?.conversation || 
                          data.message?.extendedTextMessage?.text || 
                          (typeof data === 'string' ? data : '[Media/Unsupported Message]');
          
          let userIdentifier = 'unknown';
          if (data.from && data.from.endsWith('@c.us')) {
            userIdentifier = data.from;
          } else if (data.chatId && data.chatId.endsWith('@c.us')) {
            userIdentifier = data.chatId;
          } else {
            userIdentifier = data.chatId || data.from || data.message?.key?.remoteJid || 'unknown';
          }

          const sessionId = req.body.sessionId || data.sessionId || 'default';

          payload = {
            tenant_id: 'tnt_001',
            session_id: sessionId,
            user_identifier: userIdentifier,
            channel: 'whatsapp',
            message: { type: 'text', content }
          };
          req.headers['x-tenant-signature'] = undefined;
        }

        const sigHeader = req.headers['x-tenant-signature'] as string;
        const tsHeader = req.headers['x-timestamp'] as string;
        const rawBody = JSON.stringify(req.body);
        
        if (sigHeader && !this.verifyHmacSignature(rawBody, sigHeader, tsHeader)) {
          return res.status(401).json({ error: 'Unauthorized: Invalid/expired signature or timestamp' });
        }

        if (!payload.tenant_id || !payload.session_id || !payload.message || !payload.message.content) {
          return res.status(400).json({ error: 'Missing required fields (tenant_id, session_id, message.content)' });
        }

        const dedupKey = `${payload.tenant_id}:${payload.session_id}:${payload.user_identifier}:${payload.message.content}`;
        if (this.isDuplicateMessage(dedupKey)) {
          console.warn(`[Gateway] Duplicate message ignored for key [${dedupKey}]`);
          return res.status(200).json({ status: 'ignored', reason: 'duplicate_request' });
        }

        if (!this.checkRateLimit(payload.tenant_id)) {
          return res.status(429).json({ error: 'Too Many Requests: Rate limit exceeded' });
        }

        const userMsg: Message = {
          message_id: uuidv4(),
          session_id: payload.session_id,
          role: 'user',
          content: payload.message.content,
          created_at: new Date()
        };
        await this.memoryManager.saveMessage(payload.tenant_id, payload.session_id, userMsg);

        const context = await this.memoryManager.getConversationContext(payload.tenant_id, payload.session_id);

        await this.eventBus.publishAgentEvent({
          event_type: 'INCOMING_MESSAGE',
          target_agent: 'ROUTER_AGENT',
          session_id: payload.session_id,
          tenant_id: payload.tenant_id,
          handoff_count: 0,
          context: {
            recent_messages: context,
            payload
          }
        });

        res.status(202).json({
          status: 'accepted',
          session_id: payload.session_id,
          message: 'Message queued for processing'
        });
      } catch (err: any) {
        console.error('[Gateway] Error processing ingress request:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`[Gateway] Express Ingress API listening on port ${this.port}`);
    });
  }
}
