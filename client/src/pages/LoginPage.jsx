import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Link2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.identifier || !form.identifier.trim()) {
      errs.identifier = 'Please enter your email or username.';
    }
    if (!form.password) {
      errs.password = 'Password is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');

    try {
      const user = await login({
        identifier: form.identifier.trim(),
        password: form.password,
      });

      if (user.isProfileComplete) {
        navigate('/discover', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="auth-page">
        <div className="auth-card">
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <Link to="/" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.6rem', gap: '0.5rem', width: 'fit-content' }}>
              <ArrowLeft size={16} /> Back
            </Link>
          </div>
          <Link to="/" className="auth-brand">
            <div className="brand-icon" style={{ overflow: 'hidden', padding: 0 }}>
              <img
                src="/meld-logo.png"
                alt="MELD Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <span>MELD</span>
          </Link>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to MELD and gather your crew.</p>

          {apiError && <div className="alert alert-error">{apiError}</div>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-identifier">Email or Username</label>
              <input
                id="login-identifier"
                type="text"
                name="identifier"
                placeholder="Email or @username"
                value={form.identifier}
                onChange={handleChange}
                className={errors.identifier ? 'input-error' : ''}
                autoCapitalize="none"
                autoComplete="username"
              />
              {errors.identifier && <span className="field-error">{errors.identifier}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className={errors.password ? 'input-error' : ''}
                  autoComplete="current-password"
                />
                <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Logging in...</> : 'Log In'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don&apos;t have an account? <Link to="/register" className="auth-link">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
};
