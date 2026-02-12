import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const shortKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;
const PROMO_URL = 'https://seekermigrate.com';

const Wallet = () => {
  const navigate = useNavigate();
  const { state, connectWallet, disconnectWallet } = useSession();

  const connected = state.wallet.connected && state.wallet.publicKey;
  const statusTone = connected ? 'ok' : 'warn';
  const statusText = connected ? `Connected ${shortKey(state.wallet.publicKey as string)}` : 'Not connected';

  const hasPhantom = typeof window !== 'undefined' && (window as any).solana?.isPhantom;
  const hasSolflare = typeof window !== 'undefined' && (window as any).solflare?.isSolflare;

  const connectPhantom = async () => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) return alert('Install Phantom to continue.');
    const resp = await provider.connect();
    const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
    if (!pk) return alert('Wallet returned no public key');
    connectWallet(pk);
  };

  const connectSolflare = async () => {
    const provider = (window as any).solflare;
    if (!provider?.isSolflare) return alert('Install Solflare to continue.');
    const resp = await provider.connect();
    const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
    if (!pk) return alert('Wallet returned no public key');
    connectWallet(pk);
  };

  return (
    <div className="screen">
      <div className="disclosure-brand" aria-label="SeekerMigrate">
        <div className="disclosure-kicker">SeekerMigrate wallet setup</div>
        <img src="/wordmark.png" alt="SeekerMigrate" />
      </div>

      <section className="panel">
        <h2>Connect wallet</h2>
        <p>Connect a supported wallet to continue to identity and migration setup.</p>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={connectPhantom} disabled={!hasPhantom}>Connect Phantom</button>
          <button className="btn btn-primary" type="button" onClick={connectSolflare} disabled={!hasSolflare}>Connect Solflare</button>
          <button className="btn btn-ghost" type="button" onClick={disconnectWallet}>Disconnect</button>
          <div className={`status ${statusTone}`} role="status">{statusText}</div>
        </div>
      </section>

      <section className="panel">
        <h3>Need migration support?</h3>
        <p>Get wallet-native migration guidance and release support from the SeekerMigrate team.</p>
        <a className="btn btn-primary" href={PROMO_URL} target="_blank" rel="noreferrer">Learn More</a>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/app/disclosure')}>Back</button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/app/identity')} disabled={!connected}>Continue to identity</button>
      </div>
    </div>
  );
};

export default Wallet;
