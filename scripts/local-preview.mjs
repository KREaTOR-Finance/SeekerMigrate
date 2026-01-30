import 'dotenv/config';
import http from 'node:http';
import { readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 4173);
const publicDir = normalize(join(process.cwd(), 'public'));
const indexHtml = join(publicDir, 'index.html');
const proxyBase = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': contentTypes['.json'],
    'cache-control': 'no-store',
  });
  res.end(json);
}

function serveFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  const type = contentTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (proxyBase && url.pathname.startsWith('/api/')) {
    try {
      const body = await readBody(req);
      const headers = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (!value || key === 'host' || key === 'content-length') continue;
        headers[key] = Array.isArray(value) ? value.join(',') : value;
      }

      const upstream = await fetch(proxyBase + url.pathname + url.search, {
        method: req.method,
        headers,
        body: body.length > 0 ? body : undefined,
      });
      const upstreamBody = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || contentTypes['.json'],
        'cache-control': 'no-store',
      });
      res.end(upstreamBody);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proxy failed';
      sendJson(res, 502, { error: message, proxyBase });
      return;
    }
  }

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      mode: 'local-preview',
      endpoints: ['/api/health'],
    });
  }

  const safePath = normalize(join(publicDir, url.pathname.replace(/^\/+/, '')));
  if (safePath.startsWith(publicDir) && existsSync(safePath)) {
    const stat = statSync(safePath);
    if (stat.isFile()) {
      return serveFile(res, safePath);
    }
  }

  // SPA-style fallback to the landing/app surface.
  if (existsSync(indexHtml)) {
    return serveFile(res, indexHtml);
  }

  res.writeHead(404, { 'content-type': contentTypes['.json'] });
  res.end(JSON.stringify({ error: 'public/index.html not found' }));
});

server.listen(port, () => {
  const indexSize = existsSync(indexHtml) ? readFileSync(indexHtml).length : 0;
  const proxyNote = proxyBase ? ` (proxying /api/* to ${proxyBase})` : '';
  console.log(
    `Local preview running at http://localhost:${port}${proxyNote} (index bytes: ${indexSize})`
  );
});
