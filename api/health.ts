import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    service: 'seekermigrate',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/payments/receipt',
      '/api/vanity',
      '/api/name/lookup',
      '/api/name/mint',
      '/webhook',
    ],
  });
}

