import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './session/SessionContext';
import Disclosure from './screens/Disclosure';
import Wallet from './screens/Wallet';
import Identity from './screens/Identity';
import Devkit from './screens/Devkit';

const shortKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

const AppHeader = () => {
  const { state } = useSession();
  const connected = state.wallet.connected && state.wallet.publicKey;
  const label = connected
    ? `Connected · ${shortKey(state.wallet.publicKey as string)}`
    : 'Connect wallet';

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-label="SeekerMigrate">
          <img src="/app-icon.png" alt="SeekerMigrate" />
        </div>
        <div className="brand-copy">
          <div className="brand-title">SeekerMigrate</div>
          <div className="brand-sub">Web preview</div>
        </div>
      </div>

      <div className="app-header-actions">
        <a
          className="pill pill-action pill-icon-only"
          href="https://dappstore.solanamobile.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Open Solana Mobile dApp Store"
          title="Open dApp Store"
        >
          <img className="pill-icon" src="/solana-mobile.png" alt="" />
        </a>

        <Link className={`pill pill-action ${connected ? 'pill-ok' : ''}`} to="wallet">
          <span className={`pill-dot ${connected ? 'on' : 'off'}`} aria-hidden="true" />
          {label}
        </Link>
      </div>
    </header>
  );
};

const AppShell = () => {
  return (
    <div className="app-root">
      <div className="glow" />
      <div className="app-shell">
        <div className="phone">
          <div className="phone-top" aria-hidden="true" />
          <AppHeader />
          <div className="phone-body">
            <Routes>
              <Route path="/" element={<Navigate to="disclosure" replace />} />
              <Route path="disclosure" element={<Disclosure />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="identity" element={<Identity />} />
              <Route path="devkit" element={<Devkit />} />
              <Route path="*" element={<Navigate to="disclosure" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/disclosure" replace />} />
      <Route path="/app/*" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/app/disclosure" replace />} />
    </Routes>
  );
};

export default App;
