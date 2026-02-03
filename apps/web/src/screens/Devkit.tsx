import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const Devkit = () => {
  const navigate = useNavigate();
  const { state, markDevkitRun } = useSession();

  const lastRun = state.devkit.lastRunAt
    ? new Date(state.devkit.lastRunAt).toLocaleString()
    : 'Not run yet';

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="icon-badge" aria-hidden="true">
          <img src="/icon-devkit-toolbox.jpg" alt="" />
        </div>
        <div>
          <h2>DevKit</h2>
          <p className="surface-lead">Submit code, migrate, and receive deliverables.</p>
        </div>
      </div>

      <section className="panel">
        <h3>DevKit - submit your code</h3>
        <p>
          Upload your project files, then click <strong>Migrate my app</strong>. We return a
          migration report and the DevKit deliverables. The report is free. DevKit unlock is
          <strong> $50 per wallet</strong> and can be reused for future runs.
        </p>
        <div className="locked-note">
          <strong>Unlock model:</strong> DevKit is tied to a wallet. Once unlocked, the same
          wallet can run DevKit again and again.
        </div>
      </section>

      <section className="panel card-art">
        <div className="panel-meta">Local run</div>
        <h3>Run the migration locally</h3>
        <p>
          Local runs keep your source on device. Use the CLI to generate a migration report, then
          return here to review the deliverables.
        </p>
        <div className="code-pill">seekermigrate report --path ./your-app</div>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={markDevkitRun}>
            Run migration locally
          </button>
          <div className="status" role="status">
            Last run: {lastRun}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>What you get</h3>
        <p>A single place to migrate your app, claim identity, and ship to Solana Mobile.</p>
        <div className="result">
          <div className="result-row">
            <div className="metric">
              <strong>Free</strong>Migration report
            </div>
            <div className="metric">
              <strong>$50</strong>DevKit unlock
            </div>
          </div>
          <div className="result-row">
            <div className="metric">
              <strong>$25</strong>Name service
            </div>
            <div className="metric">
              <strong>$25</strong>Vanity wallet
            </div>
          </div>
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/identity')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/profile')}>
          Continue to Profile
        </button>
      </div>
    </div>
  );
};

export default Devkit;
