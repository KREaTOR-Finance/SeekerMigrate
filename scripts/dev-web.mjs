import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Proxy API routes to the local API smoke server
const apiTarget = process.env.API_TARGET ?? 'http://localhost:5055';
app.use(
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    logLevel: 'warn',
    pathFilter: '/api',
  })
);

// Serve static public site
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Local web running at http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Proxying /api -> ${apiTarget}`);
});
