import dotenv from 'dotenv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

type WebhookEvent = {
  eventType: 'wallet_connect' | 'payment_request' | 'vanity_request' | 'name_lookup' | string;
  payload?: Record<string, unknown>;
  meta?: string;
};

function ensureEnv(res: VercelResponse) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET || !TELEGRAM_ADMIN_CHAT_ID) {
    res.status(500).json({
      error: 'Telegram environment variables are not configured',
      required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_ADMIN_CHAT_ID'],
    });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!ensureEnv(res)) {
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'telegram webhook ready' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const incomingSecret = (req.headers['x-telegram-webhook-secret'] ?? '').toString();
  if (incomingSecret !== TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const event = req.body as WebhookEvent;
  if (!event?.eventType) {
    return res.status(400).json({ error: 'Missing eventType in payload' });
  }

  const message = renderEventMessage(event);

  try {
    await sendTelegramMessage(message, TELEGRAM_BOT_TOKEN!, TELEGRAM_ADMIN_CHAT_ID!);
    return res.status(202).json({ status: 'accepted' });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Telegram send failed';
    console.error('Telegram send failed:', error);
    return res.status(502).json({ error: messageText });
  }
}

function renderEventMessage(event: WebhookEvent): string {
  const payload = event.payload ?? {};
  const toText = (value: unknown) => (value == null ? 'n/a' : String(value));

  switch (event.eventType) {
    case 'wallet_connect':
      return [
        'Wallet Connected',
        `- Public key: ${toText(payload.publicKey)}`,
        `- App: ${toText(payload.app ?? 'SeekerApp')}`,
        event.meta ? `- Note: ${toText(event.meta)}` : null,
      ]
        .filter(Boolean)
        .join('\n');

    case 'payment_request':
      return [
        'Payment Request',
        `- Amount: ${toText(payload.amountLamports ?? payload.amount ?? 'unknown')} lamports`,
        `- Memo: ${toText(payload.memo ?? payload.reason ?? 'n/a')}`,
        `- Signature: ${toText(payload.signature ?? 'pending')}`,
      ].join('\n');

    case 'vanity_request':
      return [
        'Vanity Request',
        `- Prefix: ${toText(payload.prefix ?? 'n/a')}`,
        `- Address: ${toText(payload.address ?? 'pending')}`,
        `- Cost: ${toText(payload.costLamports ?? 'unknown')} lamports`,
      ].join('\n');

    case 'name_lookup':
      return [
        'Name Lookup',
        `- Name: ${toText(payload.name ?? payload.domain ?? 'unknown')}`,
        `- Status: ${toText(payload.status ?? (payload.available ? 'available' : 'taken'))}`,
        `- Owner: ${toText(payload.owner ?? 'n/a')}`,
      ].join('\n');

    default:
      return `Event: ${event.eventType}\nPayload: ${JSON.stringify(payload)}`;
  }
}

async function sendTelegramMessage(text: string, token: string, chatId: string): Promise<void> {
  const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(telegramApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.description ?? 'Telegram sendMessage failed');
  }
}

