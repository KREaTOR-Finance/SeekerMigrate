import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const shortKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

const Wallet = () => {
  const navigate = useNavigate();
  const { state, connectWallet, disconnectWallet } = useSession();

  const connected = state.wallet.connected && state.wallet.publicKey;
  const statusTone = connected ? 'ok' : 'warn';
  const statusText = connected
    ? `Connected (demo) ${shortKey(state.wallet.publicKey as string)}`
    : 'Disconnected';

  return (
    <div className="screen">
      <div className="disclosure-brand" aria-label="SeekerMigrate">
        <div className="disclosure-kicker">Wallet</div>
        <img src="/wordmark.jpg" alt="SeekerMigrate" />
      </div>

      <section className="panel">
        <h2>Connect your wallet</h2>
        <p>
          This is a <strong>dummy connect</strong> for the web preview. Real wallet connect
          (Seed Vault / Phantom) runs in the Android app via Solana Mobile Wallet Adapter.
        </p>
        <ul>
          <li>Identity is next (vanity + name service).</li>
          <li>DevKit unlock is per-wallet ($50) and reusable.</li>
        </ul>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={() => connectWallet()}>
            Connect (Demo)
          </button>
          <button className="btn btn-ghost" type="button" onClick={disconnectWallet}>
            Disconnect
          </button>
          <div className={`status ${statusTone}`} role="status">
            {statusText}
          </div>
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/disclosure')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/identity')}>
          Continue to Identity
        </button>
      </div>
    </div>
  );
};

export default Wallet;
