import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtpApi } from '../services/api';
import { Eye, EyeOff, Loader2, ArrowLeft, KeyRound, Lock, Mail, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithOtp } = useAuth();

  // Mode: 'DEFAULT' (single input + two buttons), 'PASSWORD' (password input revealed), 'OTP' (OTP code input revealed)
  const [authMode, setAuthMode] = useState('DEFAULT');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: '' }));
    if (apiError) setApiError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
    if (apiError) setApiError('');
  };

  const handleOtpChange = (e) => {
    setOtpCode(e.target.value);
    if (errors.otpCode) setErrors((prev) => ({ ...prev, otpCode: '' }));
    if (apiError) setApiError('');
  };

  // 1. Password Login Action
  const handlePasswordModeSelect = () => {
    if (!identifier.trim()) {
      setErrors({ identifier: 'Please enter your username or email first.' });
      return;
    }
    setErrors({});
    setApiError('');
    setAuthMode('PASSWORD');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrors({ identifier: 'Please enter your email or username.' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Password is required.' });
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const user = await login({
        identifier: cleanId,
        password,
      });

      if (user.isProfileComplete) {
        navigate('/discover', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP Login Action
  const handleSendLoginOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrors({ identifier: 'Please enter your username or email first.' });
      return;
    }

    setSendingOtp(true);
    setApiError('');
    setApiSuccess('');

    try {
      const res = await sendOtpApi(cleanId, 'LOGIN');
      const targetEmail = res.email || cleanId;
      setResolvedEmail(targetEmail);
      setAuthMode('OTP');
      setResendCooldown(60);
      setApiSuccess(`One-time login code sent to ${targetEmail}.`);
    } catch (err) {
      setApiError(err.message || 'Failed to send login code. Please check your username/email.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrors({ otpCode: 'Please enter the 6-digit verification code.' });
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const user = await loginWithOtp({
        identifier: cleanId,
        otpCode: cleanOtp,
      });

      if (user.isProfileComplete) {
        navigate('/discover', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '460px' }}>
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
          <p className="auth-subtitle">
            {authMode === 'OTP'
              ? 'Enter the 6-digit one-time code sent to your email.'
              : 'Log in to MELD and gather your crew.'}
          </p>

          {apiError && (
            <div className="alert alert-error flex-center gap-xs margin-bottom-md">
              <AlertCircle size={16} />
              <span>{apiError}</span>
            </div>
          )}

          {apiSuccess && (
            <div className="alert alert-success flex-center gap-xs margin-bottom-md">
              <CheckCircle2 size={16} />
              <span>{apiSuccess}</span>
            </div>
          )}

          {/* MODE 1: DEFAULT (Single input box + 2 action buttons) */}
          {authMode === 'DEFAULT' && (
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="login-identifier">Username or Email / Gmail</label>
                <input
                  id="login-identifier"
                  type="text"
                  name="identifier"
                  placeholder="e.g. alex@gmail.com or @alex"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  className={errors.identifier ? 'input-error' : ''}
                  autoCapitalize="none"
                  autoComplete="username"
                  autoFocus
                />
                {errors.identifier && <span className="field-error">{errors.identifier}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handlePasswordModeSelect}
                  className="btn btn-primary btn-full flex-center gap-xs"
                  style={{ padding: '0.85rem' }}
                >
                  <Lock size={17} />
                  <span>Login with Password</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendLoginOtp}
                  disabled={sendingOtp}
                  className="btn btn-secondary btn-full flex-center gap-xs"
                  style={{
                    padding: '0.85rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    color: '#a5b4fc',
                  }}
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 size={17} className="spin" />
                      <span>Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      <span>Login with OTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: PASSWORD LOGIN FORM */}
          {authMode === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="login-identifier-pwd">Username or Email / Gmail</label>
                <input
                  id="login-identifier-pwd"
                  type="text"
                  name="identifier"
                  placeholder="e.g. alex@gmail.com or @alex"
                  value={identifier}
                  onChange={handleIdentifierChange}
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
                    value={password}
                    onChange={handlePasswordChange}
                    className={errors.password ? 'input-error' : ''}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full margin-top-sm" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Logging in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="flex-center-between margin-top-md">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('DEFAULT');
                    setApiError('');
                  }}
                  className="btn btn-ghost btn-sm flex-center gap-2xs"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <button
                  type="button"
                  onClick={handleSendLoginOtp}
                  disabled={sendingOtp}
                  className="btn btn-ghost btn-sm text-cyan flex-center gap-2xs"
                >
                  <KeyRound size={14} /> Use OTP Instead
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: OTP LOGIN FORM */}
          {authMode === 'OTP' && (
            <form onSubmit={handleOtpSubmit} className="auth-form" noValidate>
              <div
                className="form-group card glass-card p-md margin-bottom-md"
                style={{ background: 'rgba(15, 22, 41, 0.6)' }}
              >
                <label htmlFor="login-otp" className="flex-center-between">
                  <span className="flex-center gap-xs font-semibold">
                    <Mail size={16} className="text-cyan" /> Email Login OTP
                  </span>
                  <span className="text-xs text-muted">{resolvedEmail || identifier}</span>
                </label>
                <input
                  id="login-otp"
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={handleOtpChange}
                  className={`text-center font-bold tracking-widest ${errors.otpCode ? 'input-error' : ''}`}
                  style={{ fontSize: '1.25rem', letterSpacing: '0.35rem' }}
                  autoFocus
                />
                {errors.otpCode && <span className="field-error">{errors.otpCode}</span>}
              </div>

              <p className="text-center text-sm text-muted margin-bottom-md" style={{ fontStyle: 'italic' }}>
                Note: Check your spam or junk folder if the email does not arrive promptly.
              </p>

              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Verifying OTP...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Verify & Log In</span>
                  </>
                )}
              </button>

              <div className="flex-center-between margin-top-md">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('DEFAULT');
                    setApiError('');
                    setApiSuccess('');
                  }}
                  className="btn btn-ghost btn-sm flex-center gap-2xs"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <button
                  type="button"
                  onClick={handleSendLoginOtp}
                  className="btn btn-ghost btn-sm text-cyan"
                  disabled={sendingOtp || resendCooldown > 0}
                >
                  {sendingOtp ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-footer-text">
            Don&apos;t have an account? <Link to="/register" className="auth-link">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
};
