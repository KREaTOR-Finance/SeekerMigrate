import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

type JobStatus = 'queued' | 'running' | 'done' | 'failed';

type Job = {
  id: string;
  createdAt: number;
  updatedAt: number;
  suffix: string;
  requester: string;
  cluster: Cluster;
  status: JobStatus;
  attempts: number;
  address: string | null;
  secretKeyBase58: string | null; // only revealed via /reveal; stored in-memory until revealed
  revealUsed: boolean;
  error: string | null;
};

// 4-char suffix has an expected search size of ~58^4 ≈ 11.3M attempts.
// Default to a value that makes success plausible on a single machine.
const MAX_ATTEMPTS = Math.max(Number(process.env.VANITY_MAX_ATTEMPTS ?? 25000000), 1000);
const PARALLELISM = Math.max(Number(process.env.VANITY_WORKER_PARALLELISM ?? 1), 1);
const PORT = Number(process.env.VANITY_WORKER_PORT ?? 6066);

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

function validateSuffix(suffix: string) {
  if (!suffix) return 'suffix is required';
  if (suffix.length < 4 || suffix.length > 6) return 'suffix must be 4-6 characters';
  if (!BASE58_RE.test(suffix)) return 'suffix must be base58 (no 0,O,I,l)';
  return null;
}

function verifyWalletSignature(args: { owner: string; message: string; signature58: string }) {
  const sig = bs58.decode(args.signature58);
  const pk = bs58.decode(args.owner);
  const msg = new TextEncoder().encode(args.message);
  return nacl.sign.detached.verify(msg, sig, pk);
}

const jobs = new Map<string, Job>();
const queue: string[] = [];
let running = 0;

async function processQueue() {
  if (running >= PARALLELISM) return;
  const nextId = queue.shift();
  if (!nextId) return;

  const job = jobs.get(nextId);
  if (!job) return;

  running++;
  job.status = 'running';
  job.updatedAt = Date.now();

  try {
    const suffix = job.suffix;
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      const kp = Keypair.generate();
      const addr = kp.publicKey.toBase58();
      attempts++;

      if (addr.endsWith(suffix)) {
        job.attempts = attempts;
        job.address = addr;
        job.secretKeyBase58 = bs58.encode(kp.secretKey);
        job.status = 'done';
        job.updatedAt = Date.now();
        return;
      }

      // Save progress occasionally.
      if (attempts % 5000 === 0) {
        job.attempts = attempts;
        job.updatedAt = Date.now();
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    job.attempts = attempts;
    job.status = 'failed';
    job.error = `Max attempts reached (${MAX_ATTEMPTS})`;
    job.updatedAt = Date.now();
  } catch (e) {
    job.status = 'failed';
    job.error = e instanceof Error ? e.message : 'Worker error';
    job.updatedAt = Date.now();
  } finally {
    running--;
    setImmediate(processQueue);
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/request', (req, res) => {
  const suffix = String(req.body?.suffix ?? '').trim();
  const requester = String(req.body?.requester ?? '').trim();
  const cluster = (req.body?.cluster ?? 'mainnet-beta') as Cluster;

  const err = validateSuffix(suffix);
  if (err) return res.status(400).json({ error: err });
  if (!requester) return res.status(400).json({ error: 'requester is required' });

  const id = crypto.randomUUID();
  const now = Date.now();

  const job: Job = {
    id,
    createdAt: now,
    updatedAt: now,
    suffix,
    requester,
    cluster,
    status: 'queued',
    attempts: 0,
    address: null,
    secretKeyBase58: null,
    revealUsed: false,
    error: null,
  };

  jobs.set(id, job);
  queue.push(id);
  setImmediate(processQueue);

  return res.status(200).json({
    requestId: id,
    status: job.status,
    etaSeconds: null,
    attempts: job.attempts,
    address: null,
  });
});

app.post('/status', (req, res) => {
  const requestId = String(req.body?.requestId ?? '').trim();
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });

  const job = jobs.get(requestId);
  if (!job) return res.status(404).json({ error: 'not found' });

  return res.status(200).json({
    requestId,
    status: job.status,
    etaSeconds: null,
    attempts: job.attempts,
    address: job.address,
    updatedAt: new Date(job.updatedAt).toISOString(),
    error: job.error,
  });
});

app.post('/challenge', (req, res) => {
  const requestId = String(req.body?.requestId ?? '').trim();
  const requester = String(req.body?.requester ?? '').trim();
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });
  if (!requester) return res.status(400).json({ error: 'requester is required' });

  const job = jobs.get(requestId);
  if (!job) return res.status(404).json({ error: 'not found' });
  if (job.requester !== requester) return res.status(403).json({ error: 'requester mismatch' });

  const nonce = crypto.randomUUID();
  const issuedAt = new Date().toISOString();

  const message = [
    'VANITY_REVEAL',
    `requestId=${requestId}`,
    `requester=${requester}`,
    job.address ? `address=${job.address}` : null,
    `nonce=${nonce}`,
    `issuedAt=${issuedAt}`,
  ]
    .filter(Boolean)
    .join('\n');

  return res.status(200).json({ ok: true, requestId, requester, message, nonce, issuedAt });
});

app.post('/reveal', (req, res) => {
  const requestId = String(req.body?.requestId ?? '').trim();
  const requester = String(req.body?.requester ?? '').trim();
  const message = String(req.body?.message ?? '');
  const signature58 = String(req.body?.messageSignature ?? '').trim();

  if (!requestId) return res.status(400).json({ error: 'requestId is required' });
  if (!requester) return res.status(400).json({ error: 'requester is required' });
  if (!message || !signature58) return res.status(400).json({ error: 'message and messageSignature are required' });

  const job = jobs.get(requestId);
  if (!job) return res.status(404).json({ error: 'not found' });
  if (job.requester !== requester) return res.status(403).json({ error: 'requester mismatch' });
  if (job.status !== 'done' || !job.secretKeyBase58) return res.status(409).json({ error: 'not ready' });
  if (job.revealUsed) return res.status(410).json({ error: 'secret already revealed' });

  // Require a wallet signature to reveal.
  // Message must include requestId + requester + address.
  if (!message.includes('VANITY_REVEAL') || !message.includes(`requestId=${requestId}`) || !message.includes(`requester=${requester}`)) {
    return res.status(403).json({ error: 'invalid reveal message' });
  }

  try {
    if (!verifyWalletSignature({ owner: requester, message, signature58 })) {
      return res.status(403).json({ error: 'invalid signature' });
    }
  } catch {
    return res.status(400).json({ error: 'unable to verify signature' });
  }

  job.revealUsed = true;
  job.updatedAt = Date.now();

  // Return the secret once.
  return res.status(200).json({
    requestId,
    address: job.address,
    secretKeyBase58: job.secretKeyBase58,
    note: 'Secret revealed once. Store it securely. This service will not return it again.',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'seekermigrate-vanity-worker',
    maxAttempts: MAX_ATTEMPTS,
    parallelism: PARALLELISM,
    jobs: jobs.size,
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Vanity worker running at http://localhost:${PORT}`);
});
