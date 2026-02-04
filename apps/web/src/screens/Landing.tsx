import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="landing-root">
      <div className="glow" />
      <header className="landing-header">
        <div className="landing-brand">
          <img className="landing-logo" src="/app-icon.png" alt="SeekerMigrate" />
          <div>
            <div className="landing-title">SeekerMigrate</div>
            <div className="landing-sub">Solana Mobile DevKit</div>
          </div>
        </div>
        <nav className="landing-nav">
          <a className="pill" href="#features">Features</a>
          <a className="pill" href="#modules">Modules</a>
          <Link className="pill pill-action" to="/app/disclosure">
            Open app
          </Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>Ship Solana Mobile features faster.</h1>
          <p>
            Production-ready building blocks for wallet auth, name service, payments, and vanity
            workflows — plus a clean demo app in <code>/app</code>.
          </p>
          <div className="landing-cta">
            <Link className="pill pill-action" to="/app/devkit">
              Launch DevKit
            </Link>
            <a className="pill" href="#modules">
              Explore modules
            </a>
          </div>
        </section>

        <section id="features" className="landing-section">
          <h2>What this repo gives you</h2>
          <div className="landing-grid">
            <div className="landing-card">
              <h3>Marketing + dev landing</h3>
              <p>React/Vite site at <code>/</code> with routes and branded assets.</p>
            </div>
            <div className="landing-card">
              <h3>Demo app in <code>/app</code></h3>
              <p>Mobile-style UI flows for onboarding, wallet, identity, and DevKit screens.</p>
            </div>
            <div className="landing-card">
              <h3>Backend endpoints</h3>
              <p>Vercel API routes for name service lookup, vanity requests, and receipts.</p>
            </div>
          </div>
        </section>

        <section id="modules" className="landing-section">
          <h2>Modules</h2>
          <div className="landing-grid">
            <Link className="landing-card link" to="/app/wallet">
              <h3>Wallet</h3>
              <p>Connect + session state wiring for Solana Mobile flows.</p>
            </Link>
            <Link className="landing-card link" to="/app/identity">
              <h3>Identity</h3>
              <p>Profile + session surface for connected accounts.</p>
            </Link>
            <Link className="landing-card link" to="/app/devkit">
              <h3>DevKit</h3>
              <p>Jump-off screen for name service + vanity work.</p>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="muted">Local routes:</span>
        <span>
          <code>/</code> landing · <code>/app</code> demo app
        </span>
      </footer>
    </div>
  );
};

export default Landing;
