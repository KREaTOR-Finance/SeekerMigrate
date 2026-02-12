import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const PROMO_URL = 'https://seekermigrate.com';

const Disclosure = () => {
  const navigate = useNavigate();
  const { acceptDisclosure } = useSession();
  const [declined, setDeclined] = useState(false);

  const handleAccept = () => {
    acceptDisclosure();
    navigate('/app/wallet');
  };

  return (
    <div className="screen">
      <div className="disclosure-brand" aria-label="SeekerMigrate">
        <div className="disclosure-kicker">SeekerMigrate onboarding</div>
        <img src="/wordmark.png" alt="SeekerMigrate" />
      </div>

      <section className="hero-card">
        <div className="hero-card-content">
          <h2>Before you continue</h2>
          <p>
            You stay in control of your wallet, keys, and release decisions while using SeekerMigrate services.
          </p>
          <ul>
            <li><strong>Never</strong> share seed phrases or private keys.</li>
            <li>Validate changes in staging before any production release.</li>
            <li>Use supported wallet providers for identity and payment actions.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <h3>Explore SeekerMigrate services</h3>
        <p>Review migration packages, identity options, and launch support.</p>
        <a className="btn btn-primary" href={PROMO_URL} target="_blank" rel="noreferrer">Learn More</a>
      </section>

      {declined ? <div className="status warn" role="status">You must accept to continue.</div> : null}

      <div className="screen-actions">
        <button className="btn btn-primary" type="button" onClick={handleAccept}>Accept and continue</button>
        <button className="btn btn-ghost" type="button" onClick={() => setDeclined(true)}>Decline</button>
      </div>
    </div>
  );
};

export default Disclosure;
