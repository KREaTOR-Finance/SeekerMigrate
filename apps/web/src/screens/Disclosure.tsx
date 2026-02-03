import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const Disclosure = () => {
  const navigate = useNavigate();
  const { acceptDisclosure } = useSession();
  const [declined, setDeclined] = useState(false);

  const handleAccept = () => {
    acceptDisclosure();
    navigate('/wallet');
  };

  return (
    <div className="screen">
      <div className="disclosure-brand" aria-label="SeekerMigrate">
        <div className="disclosure-kicker">Solana Mobile DevKit</div>
        <img src="/wordmark.jpg" alt="SeekerMigrate" />
      </div>

      <section className="hero-card">
        <div className="hero-card-content">
          <h2>Welcome</h2>
          <p>
            SeekerMigrate helps app developers ship to Solana Mobile. You remain in control of
            custody and production decisions.
          </p>
          <ul>
            <li>
              <strong>Custody:</strong> never paste seed phrases or private keys.
            </li>
            <li>
              <strong>Compliance:</strong> you control your rollout and requirements.
            </li>
            <li>
              <strong>Safety:</strong> test on staging before mainnet release.
            </li>
          </ul>
        </div>
      </section>

      {declined ? (
        <div className="status warn" role="status">
          You must accept the disclosure to continue.
        </div>
      ) : null}

      <div className="screen-actions">
        <button className="btn btn-primary" type="button" onClick={handleAccept}>
          Accept and Continue
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setDeclined(true)}>
          Decline
        </button>
      </div>
    </div>
  );
};

export default Disclosure;
