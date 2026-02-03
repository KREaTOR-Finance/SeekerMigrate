import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../session/SessionContext';

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]*$/;

const Identity = () => {
  const navigate = useNavigate();
  const { state, setVanitySuffix } = useSession();

  const validation = useMemo(() => {
    const value = state.identity.vanitySuffix;
    if (!value) {
      return {
        tone: 'warn',
        message: 'Enter a 4-6 character suffix using Base58 characters.',
      };
    }

    if (!BASE58_REGEX.test(value)) {
      return {
        tone: 'err',
        message: 'Use Base58 characters only (no 0, O, I, l).',
      };
    }

    if (value.length < 4 || value.length > 6) {
      return {
        tone: 'warn',
        message: 'Suffix must be 4-6 characters long.',
      };
    }

    return {
      tone: 'ok',
      message: `Looks good. We will search for a wallet ending in ${value}.`,
    };
  }, [state.identity.vanitySuffix]);

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="icon-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 3.8c3.4 0 6.2 2.8 6.2 6.2 0 2.6-1.6 4.9-3.9 5.8"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M9.7 15.7A6.2 6.2 0 0 1 5.8 10c0-3.4 2.8-6.2 6.2-6.2"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path d="M9.2 12.2h5.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 9.4v5.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7.6 20.2h8.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2>Names & Vanity</h2>
          <p className="surface-lead">Register names and generate premium vanity addresses.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-meta">Vanity address ($25)</div>
        <h3>Reserve a vanity wallet</h3>
        <p>
          Choose a short <strong>suffix</strong> (4-6 letters/numbers). We will generate a
          wallet that ends with it. Four characters is fastest.
        </p>
        <form>
          <div className="field-grid">
            <div className="field span-12">
              <label htmlFor="vanity-suffix">Suffix (4-6 characters)</label>
              <input
                id="vanity-suffix"
                name="suffix"
                placeholder="ABCD"
                minLength={4}
                maxLength={6}
                value={state.identity.vanitySuffix}
                onChange={(event) => {
                  setVanitySuffix(event.target.value);
                }}
              />
              <div className="hint">Tip: 4 characters is fastest. 5-6 characters may take longer.</div>
            </div>
          </div>
          <div className="form-actions">
            <div className={`status ${validation.tone}`} role="status">
              {validation.message}
            </div>
          </div>
        </form>
      </section>

      <div className="screen-actions">
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/wallet')}>
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/devkit')}>
          Continue to DevKit
        </button>
      </div>
    </div>
  );
};

export default Identity;
