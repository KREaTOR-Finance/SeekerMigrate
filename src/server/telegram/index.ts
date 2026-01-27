import dotenv from 'dotenv';
import express, { Request, Response } from 'express';

dotenv.config();

const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_ADMIN_CHAT_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const PORT = Number(process.env.PORT ?? 4000);
const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

type WebhookEvent = {
  eventType: 'wallet_connect' | 'payment_request' | 'vanity_request' | 'name_lookup' | string;
  payload?: Record<string, unknown>;
  meta?: string;
};

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/', (_, res) => {
  res.json({ status: 'telegram webhook ready' });
});

app.post('/webhook', async (req: Request, res: Response) => {
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
    await sendTelegramMessage(message);
    return res.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('Telegram send failed:', error);
    return res.status(500).json({ error: 'Telegram send failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Telegram webhook service listening on port ${PORT}`);
});

function renderEventMessage(event: WebhookEvent): string {
  const payload = event.payload ?? {};
  const toText = (value: unknown) => (value == null ? 'n/a' : String(value));

  switch (event.eventType) {
    case 'wallet_connect':
      return [
        'Wallet Connected',
        `• Public key: ${toText(payload.publicKey)}`,
        `• App: ${toText(payload.app ?? 'SeekerApp')}`,
        payload.meta ? `• Note: ${toText(payload.meta)}` : null,
      ]
        .filter(Boolean)
        .join('\n');

    case 'payment_request':
      return [
        'Payment Request',
        `• Amount: ${toText(payload.amountLamports ?? payload.amount ?? 'unknown')} lamports`,
        `• Memo: ${toText(payload.memo ?? payload.reason ?? 'n/a')}`,
        `• Signature: ${toText(payload.signature ?? 'pending')}`,
      ].join('\n');

    case 'vanity_request':
      return [
        'Vanity request',
        `• Prefix: ${toText(payload.prefix ?? 'n/a')}`,
        `• Address: ${toText(payload.address ?? 'pending')}`,
        `• Cost: ${toText(payload.costLamports ?? 'unknown')} lamports`,
      ].join('\n');

    case 'name_lookup':
      return [
        'Name lookup',
        `• Name: ${toText(payload.name ?? payload.domain ?? 'unknown')}`,
        `• Status: ${toText(payload.status ?? (payload.available ? 'available' : 'taken'))}`,
        `• Owner: ${toText(payload.owner ?? 'n/a')}`,
      ].join('\n');

    default:
      return `Event: ${event.eventType}\nPayload: ${JSON.stringify(payload)}`;
  }
}

async function sendTelegramMessage(text: string): Promise<void> {
  const response = await fetch(`${telegramApiUrl}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.description ?? 'Telegram sendMessage failed');
  }
}
