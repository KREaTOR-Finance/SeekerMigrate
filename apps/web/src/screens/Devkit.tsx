import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const Devkit = () => {
  const navigate = useNavigate();
  const { state, markDevkitRun } = useSession();

  const lastRun = state.devkit.lastRunAt ? new Date(state.devkit.lastRunAt).toLocaleString() : 'Not run yet';

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="icon-badge" aria-hidden="true">
          <img src="/icon-devkit-toolbox.jpg" alt="" />
        </div>
        <div>
          <h2>Migration tools (internal)</h2>
          <p className="surface-lead">Web client is test-only. Release surface is the mobile app.</p>
        </div>
      </div>

      <section className="panel">
        <h3>Run your local report</h3>
        <p>
          Use the local report during emulator/dev validation. Ship and submit from the mobile flow.
        </p>
        <div className="locked-note">
          <strong>Strategy:</strong> Solana Mobile dApp Store first. Web is intentionally reduced.
        </div>
      </section>

      <section className="panel card-art">
        <div className="panel-meta">Local run</div>
        <h3>Run migration locally</h3>
        <p>Keep source local and generate migration report locally.</p>
        <div className="code-pill">seekermigrate report --path ./your-app</div>
        <div className="form-actions">
          <button className="btn btn-primary" type="button" onClick={markDevkitRun}>Run migration locally</button>
          <div className="status" role="status">Last run: {lastRun}</div>
        </div>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/app/identity')}>Back</button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/app/disclosure')}>Done</button>
      </div>
    </div>
  );
};

export default Devkit;
