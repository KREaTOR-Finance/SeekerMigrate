import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const shortKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

const Wallet = () => {
  const navigate = useNavigate();
  const { state, connectWallet, disconnectWallet } = useSession();

  const connected = state.wallet.connected && state.wallet.publicKey;
  const statusTone = connected ? 'ok' : 'warn';
  const statusText = connected
    ? `Connected ${shortKey(state.wallet.publicKey as string)}`
    : 'Disconnected';

  const hasPhantom = typeof window !== 'undefined' && (window as any).solana?.isPhantom;

  const connectPhantom = async () => {
    const provider = (window as any).solana;
    if (!provider?.isPhantom) {
      alert('Phantom not detected. Install Phantom or use the demo connect.');
      return;
    }

    const resp = await provider.connect();
    const pk = resp?.publicKey?.toBase58?.() ?? resp?.publicKey?.toString?.();
    if (!pk) {
      alert('Wallet returned no public key');
      return;
    }
    connectWallet(pk);
  };

  const disconnectPhantom = async () => {
    const provider = (window as any).solana;
    try {
      await provider?.disconnect?.();
    } catch {
      // ignore
    }
    disconnectWallet();
  };

  return (
    <div className="screen">
      <div className="disclosure-brand" aria-label="SeekerMigrate">
        <div className="disclosure-kicker">Wallet</div>
        <img src="/wordmark.jpg" alt="SeekerMigrate" />
      </div>

      <section className="panel">
        <h2>Connect your wallet</h2>
        <p>
          Web supports Phantom for development. Production wallet connect is primarily in the Android app via Solana
          Mobile Wallet Adapter.
        </p>
        <ul>
          <li>Identity is next (vanity + name service).</li>
          <li>DevKit unlock is per-wallet ($50) and reusable.</li>
        </ul>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={() => connectWallet()}>
            Connect (Demo)
          </button>
          <button className="btn btn-primary" type="button" onClick={connectPhantom} disabled={!hasPhantom}>
            Connect Phantom
          </button>
          <button className="btn btn-ghost" type="button" onClick={disconnectPhantom}>
            Disconnect
          </button>
          <div className={`status ${statusTone}`} role="status">
            {statusText}
          </div>
          {!hasPhantom ? <div className="hint">Phantom not detected in this browser.</div> : null}
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/app/disclosure')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/app/identity')}>
          Continue to Identity
        </button>
      </div>
    </div>
  );
};

export default Wallet;
