import { useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../lib/icons.jsx';

export default function Login({ onSignedIn }) {
  const [adminMode, setAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const { role } = await fn();
      onSignedIn(role);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitAdmin = (e) => {
    e.preventDefault();
    signIn(() => api.loginAdmin(username, password));
  };

  return (
    <div className="login-screen">
      <div className="login-shell">
        <div className="login-logo">
          <img src="/logo_mark.png" alt="YAHALA" />
        </div>

        <div className="login-card">
          <div className="login-head">
            <div className="login-title">Executive Portal</div>
            <div className="login-sub">Royal Platinum Membership Network</div>
          </div>

          {adminMode ? (
            <form className="login-fields" onSubmit={submitAdmin}>
              <div>
                <label className="login-label" htmlFor="login-user">
                  Username
                </label>
                <input
                  id="login-user"
                  className="login-input"
                  value={username}
                  autoComplete="username"
                  placeholder="admin"
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                />
              </div>
              <div>
                <label className="login-label" htmlFor="login-pass">
                  Password
                </label>
                <input
                  id="login-pass"
                  className="login-input"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button className="btn-gold" type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in to Admin'}
              </button>
              <button
                className="btn-back"
                type="button"
                onClick={() => {
                  setAdminMode(false);
                  setError('');
                }}
              >
                ← Back
              </button>
            </form>
          ) : (
            <div className="login-choices">
              <button
                className="btn-enter"
                type="button"
                disabled={busy}
                onClick={() => signIn(api.loginViewer)}
              >
                Enter Executive Dashboard
              </button>
              <div className="login-or">
                <span />
                OR
                <span />
              </div>
              <button
                className="btn-admin-access"
                type="button"
                onClick={() => {
                  setAdminMode(true);
                  setError('');
                }}
              >
                <Icon name="lock" size={16} stroke={1.8} />
                Administrator Access
              </button>
              {error && <div className="login-error">{error}</div>}
            </div>
          )}
        </div>

        <div className="login-foot">YAHALA · Confidential · For Internal Executive Use</div>
      </div>
    </div>
  );
}
