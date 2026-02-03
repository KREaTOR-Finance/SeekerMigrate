import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PROFILE_PRESETS,
  useSession,
  type ProfilePresetId,
  type SessionState,
} from '../session/SessionContext';

const avatarOptions = [
  { id: 'icon-raven-chain', label: 'Raven (Chain)', ax: 0, ay: 0 },
  { id: 'icon-briefcase-wing', label: 'Briefcase', ax: 1, ay: 0 },
  { id: 'icon-skr', label: '.SKR', ax: 0, ay: 1 },
  { id: 'icon-key', label: 'Key', ax: 1, ay: 1 },
  { id: 'icon-raven-head', label: 'Raven (Head)', ax: 0, ay: 2 },
  { id: 'icon-raven-coin', label: 'Raven (Coin)', ax: 1, ay: 2 },
];

const buildProfileJson = (state: SessionState) => {
  const profile = state.profile;
  const wallet = profile.walletAddress || state.wallet.publicKey || undefined;

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
    icons: {
      avatar: profile.avatarId || undefined,
      banner: undefined,
    },
    updatedAt: profile.updatedAt,
    storage: 'decentralized',
    note: 'Upload this JSON to IPFS/Arweave and reference it from the SeekerMigrate Profile Badge NFT metadata.',
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const {
    state,
    connectWallet,
    disconnectWallet,
    setProfileField,
    setProfileAvatar,
    setProfilePreset,
    applyProfilePreset,
  } = useSession();
  const [profileStatus, setProfileStatus] = useState('');

  const profileJson = useMemo(() => buildProfileJson(state), [state]);
  const profileJsonText = useMemo(() => JSON.stringify(profileJson, null, 2), [profileJson]);

  const walletShort = state.wallet.publicKey
    ? `${state.wallet.publicKey.slice(0, 4)}...${state.wallet.publicKey.slice(-4)}`
    : '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus('Metadata JSON ready (upload placeholder).');
  };

  const handlePresetApply = () => {
    if (!state.profile.presetId) {
      setProfileStatus('Choose a preset first.');
      return;
    }
    applyProfilePreset(state.profile.presetId);
    setProfileStatus('Preset applied.');
  };

  const handleFillDemo = () => {
    if (!state.wallet.connected) {
      connectWallet();
    }
    setProfileField('displayName', 'yourname.skr');
    setProfileField('projectName', 'Your Project');
    setProfileField('website', 'https://example.com');
    setProfileField('email', 'support@example.com');
    setProfileField('x', '@yourhandle');
    setProfileField('telegram', 'https://t.me/yourchannel');
    setProfileField('discord', 'https://discord.gg/yourinvite');
    setProfileField('store', 'https://dappstore.solanamobile.com/');
    applyProfilePreset(state.profile.presetId || 'indie');
    setProfileStatus('Demo profile loaded.');
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h2>Profile</h2>
          <p className="surface-lead">
            Wallet connect / disconnect lives here. You can generate a shared profile dataset and
            later mint it as a Profile NFT.
          </p>
        </div>
      </div>

      <section className="panel">
        <strong>Wallet</strong>
        <span>
          <span>{state.wallet.connected ? 'Connected (demo)' : 'Disconnected'}</span>
          {walletShort ? <span className="muted"> {walletShort}</span> : null}
        </span>
        <div className="form-actions">
          <button className="btn btn-primary btn-inline" type="button" onClick={() => connectWallet()}>
            Connect (Demo)
          </button>
          <button className="btn btn-ghost btn-inline" type="button" onClick={disconnectWallet}>
            Disconnect
          </button>
          <div className={`status ${state.wallet.connected ? 'ok' : 'warn'}`} role="status">
            {state.wallet.connected ? 'Wallet connected.' : 'Wallet disconnected.'}
          </div>
        </div>
        <div className="hint">
          Web preview uses a demo wallet. Real wallet connect (Seed Vault / Phantom) runs in the
          Android app via Solana Mobile Wallet Adapter.
        </div>
      </section>

      <section className="panel">
        <h3>Profile details</h3>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="field span-6">
              <label htmlFor="profile-wallet">Wallet address</label>
              <input
                id="profile-wallet"
                placeholder="Wallet address"
                value={state.profile.walletAddress}
                onChange={(event) => setProfileField('walletAddress', event.target.value)}
              />
            </div>
            <div className="field span-6">
              <label htmlFor="profile-display">Primary display name</label>
              <input
                id="profile-display"
                placeholder="yourname.skr"
                value={state.profile.displayName}
                onChange={(event) => setProfileField('displayName', event.target.value)}
              />
            </div>
            <div className="field span-6">
              <label htmlFor="profile-project">Project / app name</label>
              <input
                id="profile-project"
                placeholder="Your app"
                value={state.profile.projectName}
                onChange={(event) => setProfileField('projectName', event.target.value)}
              />
            </div>
            <div className="field span-6">
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
                placeholder="What does your app do? Who is it for?"
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

          <div className="field" style={{ marginTop: '8px' }}>
            <label>Profile icon (preset)</label>
            <div className="avatar-grid">
              {avatarOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`avatar-option ${
                    state.profile.avatarId === option.id ? 'selected' : ''
                  }`}
                  style={{
                    '--ax': option.ax,
                    '--ay': option.ay,
                  } as CSSProperties}
                  onClick={() => setProfileAvatar(option.id)}
                >
                  <small>{option.label}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field-grid" style={{ marginTop: '10px' }}>
            <div className="field span-12">
              <label htmlFor="profile-preset">Common profile dataset</label>
              <select
                id="profile-preset"
                value={state.profile.presetId}
                onChange={(event) => setProfilePreset(event.target.value as ProfilePresetId)}
              >
                <option value="">Choose a preset</option>
                {Object.entries(PROFILE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Generate metadata JSON
            </button>
            <button className="btn btn-ghost" type="button" onClick={handlePresetApply}>
              Apply preset
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleFillDemo}>
              Fill demo
            </button>
            <div className="status" role="status">
              {profileStatus}
            </div>
          </div>
          <div className="hint">
            This generates the metadata JSON used to mint your Profile NFT. Next step (premium):
            upload to IPFS/Arweave, then mint.
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Preview</h3>
        <div className="result">
          <div className="result-row">
            <div className="metric">
              <strong>{profileJson.displayName || '-'}</strong>name
            </div>
            <div className="metric">
              <strong>{profileJson.projectName || '-'}</strong>project
            </div>
          </div>
          <pre>{profileJsonText}</pre>
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/devkit')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/disclosure')}>
          Start over
        </button>
      </div>
    </div>
  );
};

export default Profile;
