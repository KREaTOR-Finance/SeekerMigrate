import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './session/SessionContext';
import Disclosure from './screens/Disclosure';
import Wallet from './screens/Wallet';
import Identity from './screens/Identity';
import Devkit from './screens/Devkit';
import Profile from './screens/Profile';
import Landing from './screens/Landing';

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
          <div className="brand-sub">Solana Mobile DevKit</div>
        </div>
      </div>
      <Link className={`pill pill-action ${connected ? 'pill-ok' : ''}`} to="wallet">
        <span className={`pill-dot ${connected ? 'on' : 'off'}`} aria-hidden="true" />
        {label}
      </Link>
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
              <Route path="profile" element={<Profile />} />
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
      {/* Default entry: client-facing app flow */}
      <Route path="/" element={<Navigate to="/app/disclosure" replace />} />

      {/* Keep the old marketing-style page reachable (optional) */}
      <Route path="/about" element={<Landing />} />

      <Route path="/app/*" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/app/disclosure" replace />} />
    </Routes>
  );
};

export default App;
