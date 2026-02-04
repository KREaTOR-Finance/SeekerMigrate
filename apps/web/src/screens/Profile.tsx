import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import bs58 from 'bs58';
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { useSession, type SessionState } from '../session/SessionContext';

const buildProfileJson = (state: SessionState) => {
  const profile = state.profile;
  const wallet = state.wallet.publicKey || profile.walletAddress || undefined;

  return {
    schema: 'seekermigrate.profile.v1',
    wallet,
    displayName: profile.displayName || undefined,
    projectName: profile.projectName || undefined,
    tagline: profile.tagline || undefined,
    description: profile.description || undefined,
    links: {
      website: profile.website || undefined,
      email: profile.email || undefined,
      x: profile.x || undefined,
      telegram: profile.telegram || undefined,
      discord: profile.discord || undefined,
      seekerStore: profile.store || undefined,
    },
    updatedAt: profile.updatedAt,
    note:
      'This is your app-side profile tied to your connected wallet. Profile Badge NFTs are an optional paid service (on-chain business card), not required.',
  };
};

type BadgeChallengeResponse = {
  ok: true;
  owner: string;
  profileHash: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

type BadgeRequestResponse = {
  ok: true;
  requestId: string;
  status: string;
};

type PaymentsMeta = {
  treasuryAddress: string | null;
  merchantAddress: string | null;
};

type QuoteResponse = {
  atomicAmount: number;
};

async function postJson<T>(url: string, payload: any): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : {};
  if (!resp.ok) throw new Error(data?.error ?? `Request failed (${resp.status})`);
  return data as T;
}

// (hashing handled server-side in /api/badges/challenge)

const Profile = () => {
  const navigate = useNavigate();
  const { state, setProfileField, connectWallet } = useSession();
  const [status, setStatus] = useState('');
  const [badgeStatus, setBadgeStatus] = useState('');
  const [badgeAck, setBadgeAck] = useState(false);
  const [badgeRequestId, setBadgeRequestId] = useState<string | null>(null);

  const profileJson = useMemo(() => buildProfileJson(state), [state]);
  const profileJsonText = useMemo(() => JSON.stringify(profileJson, null, 2), [profileJson]);

  const ensurePhantom = async () => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) throw new Error('Phantom not detected.');

    if (!provider?.publicKey) {
      const resp = await provider.connect();
      const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
      if (pk) connectWallet(pk);
    }

    const pk = provider?.publicKey?.toBase58?.() ?? provider?.publicKey?.toString?.();
    if (!pk) throw new Error('Wallet returned no public key');
    return provider;
  };

  const handleBadgeRequest = async () => {
    setBadgeStatus('');
    setBadgeRequestId(null);

    try {
      if (import.meta.env.MODE === 'production') {
        throw new Error('Badge request UI is available on web for development only.');
      }
      if (!badgeAck) throw new Error('Confirm you understand this is an on-chain badge service.');

      const provider = await ensurePhantom();
      const owner = provider.publicKey.toBase58();

      // Treasury + quote
      setBadgeStatus('Loading treasury...');
      const meta = await (await fetch('/api/payments/meta')).json() as PaymentsMeta;
      const treasury = (meta.treasuryAddress ?? meta.merchantAddress ?? '').trim();
      if (!treasury) throw new Error('Treasury not configured');

      setBadgeStatus('Fetching quote...');
      const quote = await postJson<QuoteResponse>('/api/payments/quote', { usd: 25, currency: 'SOL' });
      const lamports = Number(quote.atomicAmount);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error('Invalid quote');

      // Pay
      setBadgeStatus('Sending payment...');
      const connection = new Connection(clusterApiUrl('mainnet-beta'), { commitment: 'confirmed' });
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
      await connection.confirmTransaction(paymentSignature, 'confirmed');

      // Challenge
      setBadgeStatus('Preparing badge request...');
      const ch = await postJson<BadgeChallengeResponse>('/api/badges/challenge', { owner, profileJson });

      setBadgeStatus('Signing message...');
      const msgBytes = new TextEncoder().encode(ch.message);
      const signed = await provider.signMessage(msgBytes, 'utf8');
      const signatureBytes = signed?.signature ?? signed;
      const messageSignature = bs58.encode(signatureBytes);

      setBadgeStatus('Submitting badge request...');
      const resp = await postJson<BadgeRequestResponse>('/api/badges/request', {
        owner,
        cluster: 'mainnet-beta',
        nonce: ch.nonce,
        message: ch.message,
        messageSignature,
        paymentSignature,
        profileJson,
      });

      setBadgeRequestId(resp.requestId);
      setBadgeStatus('Badge request submitted.');
    } catch (e) {
      setBadgeStatus(e instanceof Error ? e.message : 'Badge request failed');
    }
  };

  const walletShort = state.wallet.publicKey
    ? `${state.wallet.publicKey.slice(0, 4)}...${state.wallet.publicKey.slice(-4)}`
    : '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Saved locally.');
  };

  const handleFillDemo = () => {
    setProfileField('displayName', 'yourname.sm');
    setProfileField('projectName', 'Your Project');
    setProfileField('tagline', 'Shipping on Seeker.');
    setProfileField('website', 'https://example.com');
    setProfileField('email', 'support@example.com');
    setProfileField('x', '@yourhandle');
    setProfileField('telegram', 'https://t.me/yourchannel');
    setProfileField('discord', 'https://discord.gg/yourinvite');
    setProfileField('store', 'https://dappstore.solanamobile.com/');
    setStatus('Demo profile loaded.');
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h2>Profile</h2>
          <p className="surface-lead">
            Wallet-based, app-side profile. (Optional add-on: mint a Profile Badge as a service.)
          </p>
        </div>
      </div>

      <section className="panel">
        <strong>Wallet</strong>
        <span>
          <span>{state.wallet.connected ? 'Connected' : 'Disconnected'}</span>
          {walletShort ? <span className="muted"> {walletShort}</span> : null}
        </span>
        <div className="hint">
          Connect with Phantom on the Wallet screen. This profile attaches to the currently connected wallet.
        </div>
      </section>

      <section className="panel">
        <h3>Profile details</h3>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="field span-12">
              <label htmlFor="profile-display">Display name</label>
              <input
                id="profile-display"
                placeholder="yourname.sm"
                value={state.profile.displayName}
                onChange={(event) => setProfileField('displayName', event.target.value)}
              />
              <div className="hint">This is app-side display metadata (not your SMNS name record).</div>
            </div>

            <div className="field span-12">
              <label htmlFor="profile-project">Project / app name</label>
              <input
                id="profile-project"
                placeholder="Your app"
                value={state.profile.projectName}
                onChange={(event) => setProfileField('projectName', event.target.value)}
              />
            </div>

            <div className="field span-12">
              <label htmlFor="profile-tagline">Tagline</label>
              <input
                id="profile-tagline"
                placeholder="One-line description"
                value={state.profile.tagline}
                onChange={(event) => setProfileField('tagline', event.target.value)}
              />
            </div>

            <div className="field span-12">
              <label htmlFor="profile-desc">Description</label>
              <textarea
                id="profile-desc"
                placeholder="What do you do?"
                value={state.profile.description}
                onChange={(event) => setProfileField('description', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-website">Website</label>
              <input
                id="profile-website"
                placeholder="https://"
                value={state.profile.website}
                onChange={(event) => setProfileField('website', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-email">Contact email</label>
              <input
                id="profile-email"
                placeholder="support@"
                value={state.profile.email}
                onChange={(event) => setProfileField('email', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-x">X (Twitter)</label>
              <input
                id="profile-x"
                placeholder="@handle"
                value={state.profile.x}
                onChange={(event) => setProfileField('x', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-telegram">Telegram</label>
              <input
                id="profile-telegram"
                placeholder="t.me/"
                value={state.profile.telegram}
                onChange={(event) => setProfileField('telegram', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-discord">Discord</label>
              <input
                id="profile-discord"
                placeholder="invite link"
                value={state.profile.discord}
                onChange={(event) => setProfileField('discord', event.target.value)}
              />
            </div>

            <div className="field span-6">
              <label htmlFor="profile-store">Seeker / dApp Store URL</label>
              <input
                id="profile-store"
                placeholder="https://"
                value={state.profile.store}
                onChange={(event) => setProfileField('store', event.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save profile
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleFillDemo}>
              Fill demo
            </button>
            <div className="status" role="status">
              {status}
            </div>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Profile Badge (service)</h3>
        <p>
          Optional add-on: mint a Profile Badge (on-chain business card) as a service. Your app-side profile remains
          wallet-based and works without minting.
        </p>
        <div className="form-actions">
          <label className="hint" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" checked={badgeAck} onChange={(e) => setBadgeAck(e.target.checked)} />
            I understand this will create an on-chain badge request and requires payment.
          </label>
          <button className="btn btn-primary" type="button" onClick={handleBadgeRequest} disabled={!badgeAck}>
            Pay & request badge ($25)
          </button>
          {badgeStatus ? <div className="status" role="status">{badgeStatus}</div> : null}
          {badgeRequestId ? <div className="hint">Request ID: {badgeRequestId}</div> : null}
        </div>
      </section>

      <section className="panel">
        <h3>Preview JSON</h3>
        <div className="result">
          <pre>{profileJsonText}</pre>
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/app/devkit')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/app/disclosure')}>
          Start over
        </button>
      </div>
    </div>
  );
};

export default Profile;
