import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bs58 from 'bs58';
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { useSession } from '../session/SessionContext';

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]*$/;

type SmnsLookupResponse = {
  name: string;
  canonicalName: string;
  mirrorName: string;
  owner: string | null;
  available: boolean;
  status: string;
  updatedAt: string | null;
  namespace: 'smns';
};

type SmnsChallengeResponse = {
  ok: true;
  action: string;
  owner: string;
  displayName: string;
  canonicalName: string;
  mirrorName: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

type SmnsRegisterResponse = {
  ok: true;
  product: string;
  name: string;
  canonicalName: string;
  mirrorName: string;
  owner: string;
  treasury: string;
  paymentSignature: string;
  paidLamports: number;
  requiredLamports: number;
  cluster: string;
  rpc: string;
};

type PaymentsMeta = {
  treasuryAddress: string | null;
  merchantAddress: string | null;
  merchantLabel: string;
  skrMint: string;
};

type QuoteResponse = {
  status: string;
  usd: number;
  currency: 'SOL' | 'SKR';
  mint: string;
  priceUsd: number;
  decimals: number;
  tokenAmount: number;
  atomicAmount: number;
  expiresAt: string;
};

type VanityRequestResponse = {
  requestId: string | null;
  suffix: string;
  cluster: string;
  status: string;
  etaSeconds: number | null;
  attempts: number | null;
  address: string | null;
  error?: string;
};

type VanityStatusResponse = {
  requestId: string;
  status: string;
  etaSeconds: number | null;
  attempts: number | null;
  address: string | null;
  updatedAt: string;
  error?: string;
};

type VanityChallengeResponse = {
  ok: true;
  requestId: string;
  requester: string;
  message: string;
  nonce: string;
  issuedAt: string;
};

type VanityRevealResponse = {
  requestId: string;
  address: string;
  secretKeyBase58: string;
  note?: string;
};

async function postJson<T>(url: string, payload: any): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) {
    throw new Error(data?.error ?? `Request failed (${resp.status})`);
  }
  return data as T;
}

const Identity = () => {
  const navigate = useNavigate();
  const { state, setVanitySuffix, connectWallet } = useSession();

  const [cluster, setCluster] = useState<'mainnet-beta' | 'devnet' | 'testnet'>('mainnet-beta');

  // SMNS name service
  const [smnsName, setSmnsName] = useState('');
  const [smnsTld, setSmnsTld] = useState<'sm' | 'skr' | 'seeker' | 'seismic'>('skr');
  const [smnsStatus, setSmnsStatus] = useState('');
  const [smnsResult, setSmnsResult] = useState<SmnsLookupResponse | null>(null);
  const [smnsRegisterStatus, setSmnsRegisterStatus] = useState('');
  const [smnsPaymentSig, setSmnsPaymentSig] = useState<string | null>(null);
  const [smnsRegisterResult, setSmnsRegisterResult] = useState<SmnsRegisterResponse | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<VanityStatusResponse | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealStatus, setRevealStatus] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [ackReveal, setAckReveal] = useState(false);

  const validation = useMemo(() => {
    const value = state.identity.vanitySuffix.trim();
    if (!value) {
      return {
        tone: 'warn',
        message: 'Enter a 4-6 character suffix using Base58 characters.',
      };
    }

    if (!BASE58_REGEX.test(value)) {
      return {
        tone: 'err',
        message: 'Use Base58 characters only (no 0, O, I, l).',
      };
    }

    if (value.length < 4 || value.length > 6) {
      return {
        tone: 'warn',
        message: 'Suffix must be 4-6 characters long.',
      };
    }

    return {
      tone: 'ok',
      message: `Looks good. We will search for a wallet ending in ${value}.`,
    };
  }, [state.identity.vanitySuffix]);

  useEffect(() => {
    let timer: any = null;
    let cancelled = false;

    async function tick() {
      if (!requestId) return;
      try {
        const next = await postJson<VanityStatusResponse>('/api/vanity/status', { requestId });
        if (cancelled) return;
        setStatus(next);
        if (next.status === 'done' || next.status === 'complete' || next.status === 'success') {
          setMessage('Vanity address ready.');
        } else if (next.status === 'failed' || next.status === 'error') {
          setMessage('Vanity generation failed. Try a different suffix.');
        } else {
          setMessage('Generating vanity address...');
        }
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : 'Unable to fetch vanity status');
      }
    }

    if (requestId) {
      tick();
      timer = setInterval(tick, 2500);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [requestId]);

  const ensurePhantom = async () => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) {
      throw new Error('Phantom not detected. Install Phantom.');
    }

    if (!provider?.publicKey) {
      const resp = await provider.connect();
      const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
      if (pk) {
        connectWallet(pk);
      }
    }

    const pk = provider?.publicKey?.toBase58?.() ?? provider?.publicKey?.toString?.();
    if (!pk) throw new Error('Wallet returned no public key');
    if (state.wallet.publicKey && state.wallet.publicKey !== pk) {
      // Keep session state aligned to the actual provider.
      connectWallet(pk);
    }

    return provider;
  };

  const rpcUrl = (clusterInput: 'mainnet-beta' | 'devnet' | 'testnet') =>
    clusterApiUrl(clusterInput as any);

  const handleSmnsLookup = async () => {
    setSmnsStatus('');
    setSmnsResult(null);
    setSmnsRegisterStatus('');
    setSmnsPaymentSig(null);
    setSmnsRegisterResult(null);

    try {
      const label = smnsName.trim();
      if (!label) throw new Error('Enter a name');
      setSmnsStatus('Checking availability...');
      const result = await postJson<SmnsLookupResponse>('/api/smns/lookup', { name: label, tld: smnsTld });
      setSmnsResult(result);
      setSmnsStatus(result.available ? 'Available' : 'Registered');
    } catch (e) {
      setSmnsStatus(e instanceof Error ? e.message : 'Lookup failed');
    }
  };

  const handleSmnsRegister = async () => {
    setSmnsRegisterStatus('');
    setSmnsPaymentSig(null);
    setSmnsRegisterResult(null);

    try {
      if (!smnsResult) throw new Error('Run lookup first');
      if (!smnsResult.available) throw new Error('Name is not available');

      const provider = await ensurePhantom();
      const owner = provider.publicKey.toBase58();

      // 1) Treasury
      setSmnsRegisterStatus('Loading treasury...');
      const metaResp = await fetch('/api/payments/meta');
      const meta = (await metaResp.json()) as PaymentsMeta;
      const treasury = (meta.treasuryAddress ?? meta.merchantAddress ?? '').trim();
      if (!treasury) throw new Error('Treasury is not configured');

      // 2) Quote $25 in SOL
      setSmnsRegisterStatus('Fetching quote...');
      const quote = await postJson<QuoteResponse>('/api/payments/quote', { usd: 25, currency: 'SOL' });
      const lamports = Number(quote.atomicAmount);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error('Invalid quote');

      // 3) Pay treasury
      setSmnsRegisterStatus('Sending payment...');
      const connection = new Connection(rpcUrl(cluster), { commitment: 'confirmed' });
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const tx = new Transaction();
      tx.feePayer = new PublicKey(owner);
      tx.recentBlockhash = blockhash;
      tx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(owner),
          toPubkey: new PublicKey(treasury),
          lamports,
        })
      );

      const sent = await provider.signAndSendTransaction(tx);
      const paymentSignature = sent?.signature ?? sent;
      if (!paymentSignature) throw new Error('No payment signature returned');
      setSmnsPaymentSig(paymentSignature);

      // Wait for confirmation so server-side verification passes.
      await connection.confirmTransaction(paymentSignature, 'confirmed');

      // 4) SMNS challenge
      setSmnsRegisterStatus('Preparing SMNS registration...');
      const challenge = await postJson<SmnsChallengeResponse>('/api/smns/challenge', {
        owner,
        action: 'register',
        name: smnsName.trim(),
        tld: smnsTld,
      });

      // 5) Sign challenge message
      setSmnsRegisterStatus('Signing SMNS message...');
      const messageBytes = new TextEncoder().encode(challenge.message);
      const signed = await provider.signMessage(messageBytes, 'utf8');
      const signatureBytes = signed?.signature ?? signed;
      const messageSignature = bs58.encode(signatureBytes);

      // 6) Register
      setSmnsRegisterStatus('Registering in SMNS...');
      const reg = await postJson<SmnsRegisterResponse>('/api/smns/register', {
        owner,
        name: smnsName.trim(),
        tld: smnsTld,
        cluster,
        nonce: challenge.nonce,
        message: challenge.message,
        messageSignature,
        paymentSignature,
        product: 'smns_name',
      });

      setSmnsRegisterResult(reg);
      setSmnsRegisterStatus('Registered.');
    } catch (e) {
      setSmnsRegisterStatus(e instanceof Error ? e.message : 'Register failed');
    }
  };

  const handleRequest = async () => {
    setMessage('');
    setRevealStatus('');
    setSecret(null);
    setAckReveal(false);
    setStatus(null);
    setLoading(true);

    try {
      if (!state.wallet.publicKey) {
        throw new Error('Connect a wallet first.');
      }
      if (validation.tone !== 'ok') {
        throw new Error(validation.message);
      }

      const resp = await postJson<VanityRequestResponse>('/api/vanity/request', {
        suffix: state.identity.vanitySuffix.trim(),
        requester: state.wallet.publicKey,
        cluster,
      });

      setRequestId(resp.requestId);
      setStatus(
        resp.requestId
          ? {
              requestId: resp.requestId,
              status: resp.status ?? 'queued',
              etaSeconds: resp.etaSeconds ?? null,
              attempts: resp.attempts ?? null,
              address: resp.address ?? null,
              updatedAt: new Date().toISOString(),
            }
          : null
      );
      setMessage(resp.requestId ? 'Request queued. Polling status...' : 'Request submitted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Vanity request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    setRevealStatus('');
    setSecret(null);

    try {
      if (!requestId) throw new Error('No requestId');
      if (!state.wallet.publicKey) throw new Error('Connect a wallet first');
      if (!status?.address) throw new Error('Vanity address not ready');

      if (import.meta.env.MODE === 'production') {
        throw new Error('Secret reveal is disabled on web in production. Use the mobile app.');
      }

      const provider = (window as any).solana;
      if (!provider?.isPhantom) {
        throw new Error('Phantom not detected. Install Phantom or use the mobile app.');
      }

      if (!provider?.publicKey) {
        setRevealStatus('Connecting Phantom...');
        const resp = await provider.connect();
        const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
        if (pk) {
          // Keep session state in sync.
          // (If they connected via Wallet screen, this is already set.)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__sm_pk = pk;
        }
      }

      setRevealStatus('Requesting reveal challenge...');
      const ch = await postJson<VanityChallengeResponse>('/api/vanity/challenge', {
        requestId,
        requester: state.wallet.publicKey,
      });

      setRevealStatus('Signing reveal message...');
      const messageBytes = new TextEncoder().encode(ch.message);
      const signed = await provider.signMessage(messageBytes, 'utf8');
      const signatureBytes = signed?.signature ?? signed;
      const signature58 = bs58.encode(signatureBytes);

      setRevealStatus('Revealing secret (one-time)...');
      const reveal = await postJson<VanityRevealResponse>('/api/vanity/reveal', {
        requestId,
        requester: state.wallet.publicKey,
        message: ch.message,
        messageSignature: signature58,
      });

      setSecret(reveal.secretKeyBase58);
      setRevealStatus('Secret revealed. Save it now.');
    } catch (error) {
      setRevealStatus(error instanceof Error ? error.message : 'Reveal failed');
    }
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="icon-badge" aria-hidden="true">
          <img src="/app-icon.png" alt="" />
        </div>
        <div>
          <h2>Names & Vanity</h2>
          <p className="surface-lead">Register names and generate premium vanity addresses.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-meta">SMNS name ($25)</div>
        <h3>Register a name</h3>
        <p>
          Register <strong>.sm</strong> names (or .skr/.seeker/.seismic which map into canonical <code>*.sm</code>). Payment
          goes to SeekerMigrate treasury.
        </p>
        <form>
          <div className="field-grid">
            <div className="field span-12">
              <label htmlFor="smns-name">Name</label>
              <input
                id="smns-name"
                placeholder="yourname"
                value={smnsName}
                onChange={(e) => setSmnsName(e.target.value)}
                autoCapitalize="none"
              />
              <div className="hint">Minimum 2 characters. Lowercase recommended.</div>
            </div>

            <div className="field span-12">
              <label htmlFor="smns-tld">TLD</label>
              <select id="smns-tld" value={smnsTld} onChange={(e) => setSmnsTld(e.target.value as any)}>
                <option value="sm">.sm</option>
                <option value="skr">.skr</option>
                <option value="seeker">.seeker</option>
                <option value="seismic">.seismic</option>
              </select>
            </div>

            <div className="field span-12">
              <label htmlFor="smns-cluster">Cluster</label>
              <select id="smns-cluster" value={cluster} onChange={(e) => setCluster(e.target.value as any)}>
                <option value="mainnet-beta">mainnet-beta</option>
                <option value="devnet">devnet</option>
                <option value="testnet">testnet</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="button" onClick={handleSmnsLookup}>
              Check availability
            </button>
            {smnsStatus ? (
              <div className={`status ${smnsResult?.available ? 'ok' : 'warn'}`} role="status">
                {smnsStatus}
              </div>
            ) : null}
          </div>

          {smnsResult ? (
            <div className="result" style={{ marginTop: '12px' }}>
              <div className="result-row">
                <div className="metric">
                  <strong>{smnsResult.available ? 'Yes' : 'No'}</strong>available
                </div>
                <div className="metric">
                  <strong>{smnsResult.owner ? smnsResult.owner.slice(0, 4) + '...' + smnsResult.owner.slice(-4) : '—'}</strong>
                  owner
                </div>
              </div>
              <div className="hint">Canonical: {smnsResult.canonicalName}</div>
              <div className="hint">Mirror: {smnsResult.mirrorName}</div>

              {smnsResult.available ? (
                <div className="form-actions" style={{ marginTop: '10px' }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleSmnsRegister}
                    disabled={!state.wallet.connected}
                    title={!state.wallet.connected ? 'Connect Phantom in the Wallet screen first.' : undefined}
                  >
                    Pay & Register
                  </button>

                  {smnsRegisterStatus ? <div className="status" role="status">{smnsRegisterStatus}</div> : null}

                  {smnsPaymentSig ? (
                    <a
                      className="pill"
                      href={`https://explorer.solana.com/tx/${smnsPaymentSig}${cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View payment tx
                    </a>
                  ) : null}

                  {smnsRegisterResult ? (
                    <div className="result" style={{ marginTop: '10px' }}>
                      <div className="panel-meta">Registered</div>
                      <div className="hint">Name: {smnsRegisterResult.name}</div>
                      <div className="hint">Canonical: {smnsRegisterResult.canonicalName}</div>
                      <div className="hint">Mirror: {smnsRegisterResult.mirrorName}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel-meta">Vanity address ($25)</div>
        <h3>Reserve a vanity wallet</h3>
        <p>
          Choose a <strong>suffix</strong> (4-6 letters/numbers). We will generate a wallet that ends with it.
          Four characters is fastest.
        </p>
        <form>
          <div className="field-grid">
            <div className="field span-12">
              <label htmlFor="vanity-suffix">Suffix (4-6 characters)</label>
              <input
                id="vanity-suffix"
                name="suffix"
                placeholder="ABCD"
                minLength={4}
                maxLength={6}
                value={state.identity.vanitySuffix}
                onChange={(event) => {
                  setVanitySuffix(event.target.value);
                }}
              />
              <div className="hint">Tip: 4 characters is fastest. 5-6 characters may take longer.</div>
            </div>

            <div className="field span-12">
              <label htmlFor="vanity-cluster">Cluster</label>
              <select
                id="vanity-cluster"
                value={cluster}
                onChange={(event) => setCluster(event.target.value as any)}
              >
                <option value="mainnet-beta">mainnet-beta</option>
                <option value="devnet">devnet</option>
                <option value="testnet">testnet</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <div className={`status ${validation.tone}`} role="status">
              {validation.message}
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleRequest}
              disabled={loading || validation.tone !== 'ok' || !state.wallet.connected}
            >
              {loading ? 'Requesting…' : 'Request vanity'}
            </button>
            {message ? (
              <div className={`status ${status?.status === 'failed' ? 'err' : 'ok'}`} role="status">
                {message}
              </div>
            ) : null}
          </div>

          {requestId ? (
            <div className="result" style={{ marginTop: '12px' }}>
              <div className="result-row">
                <div className="metric">
                  <strong>{status?.status ?? 'queued'}</strong>status
                </div>
                <div className="metric">
                  <strong>{status?.attempts ?? '—'}</strong>attempts
                </div>
                <div className="metric">
                  <strong>{status?.etaSeconds ?? '—'}</strong>eta (s)
                </div>
              </div>
              <div className="hint">Request ID: {requestId}</div>
              {status?.address ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <a
                    className="pill pill-action"
                    href={`https://explorer.solana.com/address/${status.address}${cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View address
                  </a>

                  <label className="hint" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={ackReveal}
                      onChange={(e) => setAckReveal(e.target.checked)}
                    />
                    I understand: revealing the secret key will show it once. Anyone with it controls the wallet.
                  </label>

                  <button
                    className="pill"
                    type="button"
                    onClick={handleReveal}
                    disabled={import.meta.env.MODE === 'production' || !ackReveal}
                    title={!ackReveal ? 'Check the acknowledgment to enable reveal.' : undefined}
                  >
                    Reveal secret (one-time)
                  </button>
                </div>
              ) : null}

              {revealStatus ? <div className="hint" style={{ marginTop: '10px' }}>{revealStatus}</div> : null}

              {secret ? (
                <div className="result" style={{ marginTop: '10px' }}>
                  <div className="panel-meta">Secret key (base58)</div>
                  <pre>{secret}</pre>
                  <div className="hint">Store this securely. Anyone with this secret controls the wallet.</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/app/wallet')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/app/devkit')}>
          Continue to migration tools
        </button>
      </div>
    </div>
  );
};

export default Identity;
