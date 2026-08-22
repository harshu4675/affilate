import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../state/AdminAuthProvider.jsx';
import { TalishhLogo } from '../../components/store/TalishhLogo.jsx';
import { Icon } from '../../components/icons/Icons.jsx';

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err && err.message) || 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <TalishhLogo size="lg" />
        <h1 className="admin-login-title">Admin sign in</h1>
        <p className="admin-login-sub">Manage the Talishh product catalog.</p>

        {error && (
          <div className="admin-login-error" role="alert">
            <Icon name="alertCircle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <label className="admin-field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <span className="admin-password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name="eye" size={15} />
            </button>
          </span>
        </label>

        <button type="submit" className="admin-primary-btn admin-login-submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        <a className="admin-login-back" href="#/">
          Back to storefront
        </a>
      </form>
    </div>
  );
}
