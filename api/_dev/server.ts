import 'dotenv/config';
import express from 'express';
import featured from '../content/featured';
import ads from '../content/ads';
import social from '../content/social';

import nameLookup from '../name/lookup';
import nameRegister from '../name/register';
import vanityRequest from '../vanity/request';
import vanityStatus from '../vanity/status';
import vanityChallenge from '../vanity/challenge';
import vanityReveal from '../vanity/reveal';

import paymentsMeta from '../payments/meta';
import paymentsQuote from '../payments/quote';

import smnsLookup from '../smns/lookup';
import smnsChallenge from '../smns/challenge';
import smnsRegister from '../smns/register';
import smnsReverse from '../smns/reverse';
import smnsSetPrimary from '../smns/set-primary';

import badgeChallenge from '../badges/challenge';
import badgeRequest from '../badges/request';

const app = express();
app.use(express.json({ limit: '2mb' }));

const DEV_ENDPOINTS = [
  '/api/health',
  '/api/content/featured',
  '/api/content/ads',
  '/api/content/social',
  '/api/name/lookup',
  '/api/name/register',
  '/api/vanity/request',
  '/api/vanity/status',
  '/api/vanity/challenge',
  '/api/vanity/reveal',
  '/api/payments/meta',
  '/api/payments/quote',
  '/api/smns/lookup',
  '/api/smns/challenge',
  '/api/smns/register',
  '/api/smns/reverse',
  '/api/smns/set-primary',
  '/api/badges/challenge',
  '/api/badges/request',
];

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'dev-api',
    endpoints: DEV_ENDPOINTS,
  });
});

app.get('/api/content/featured', (req, res) => featured(req as any, res as any));
app.get('/api/content/ads', (req, res) => ads(req as any, res as any));
app.get('/api/content/social', (req, res) => social(req as any, res as any));

app.post('/api/name/lookup', (req, res) => nameLookup(req as any, res as any));
app.post('/api/name/register', (req, res) => nameRegister(req as any, res as any));
app.post('/api/vanity/request', (req, res) => vanityRequest(req as any, res as any));
app.post('/api/vanity/status', (req, res) => vanityStatus(req as any, res as any));
app.post('/api/vanity/challenge', (req, res) => vanityChallenge(req as any, res as any));
app.post('/api/vanity/reveal', (req, res) => vanityReveal(req as any, res as any));

app.get('/api/payments/meta', (req, res) => paymentsMeta(req as any, res as any));
app.post('/api/payments/quote', (req, res) => paymentsQuote(req as any, res as any));

app.post('/api/smns/lookup', (req, res) => smnsLookup(req as any, res as any));
app.post('/api/smns/challenge', (req, res) => smnsChallenge(req as any, res as any));
app.post('/api/smns/register', (req, res) => smnsRegister(req as any, res as any));
app.post('/api/smns/reverse', (req, res) => smnsReverse(req as any, res as any));
app.post('/api/smns/set-primary', (req, res) => smnsSetPrimary(req as any, res as any));

app.post('/api/badges/challenge', (req, res) => badgeChallenge(req as any, res as any));
app.post('/api/badges/request', (req, res) => badgeRequest(req as any, res as any));

const port = Number(process.env.PORT ?? 5055);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Dev API server running at http://localhost:${port}`);
});
