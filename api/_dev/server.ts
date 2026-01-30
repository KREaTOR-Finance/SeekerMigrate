import 'dotenv/config';
import express from 'express';
import featured from '../content/featured';
import ads from '../content/ads';
import social from '../content/social';

const app = express();

app.get('/api/content/featured', (req, res) => featured(req as any, res as any));
app.get('/api/content/ads', (req, res) => ads(req as any, res as any));
app.get('/api/content/social', (req, res) => social(req as any, res as any));

const port = Number(process.env.PORT ?? 5055);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Dev API server running at http://localhost:${port}`);
});
