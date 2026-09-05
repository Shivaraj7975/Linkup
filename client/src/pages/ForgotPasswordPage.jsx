import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendOtpApi, resetPasswordApi } from '../services/api';
import { Mail, ArrowLeft, Loader2, ShieldCheck, Lock, User } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  // Step 1: Identifier (Email or Username), Step 2: OTP & New Password
  const [step, setStep] = useState(1);

  const [identifier, setIdentifier] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your email or username.');
      return;
    }

    setSendingOtp(true);
    setError('');
    setSuccess('');

    try {
      const res = await sendOtpApi(cleanIdentifier, 'PASSWORD_RESET');
      const sentToEmail = res.email || cleanIdentifier;
      setResolvedEmail(sentToEmail);
      setStep(2);
      setResendCooldown(60);
      setSuccess(`Password reset code sent to ${sentToEmail}`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(resolvedEmail || identifier.trim(), otpCode.trim(), newPassword);
      setSuccess('Password has been successfully reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.6rem', gap: '0.5rem', width: 'fit-content' }}>
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
          <div className="text-center margin-bottom-xl">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              {step === 1 ? "Enter your email or username to receive a verification code." : "Enter the code and set your new password."}
            </p>
          </div>

          {error && (
            <div className="alert alert-error margin-bottom-md">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success margin-bottom-md" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="identifier">Email or Username</label>
                <div className="input-wrapper">
                  <User size={18} className="input-left-icon" />
                  <input
                    id="identifier"
                    type="text"
                    placeholder="Email or @username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    autoCapitalize="none"
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full margin-top-md" disabled={sendingOtp}>
                {sendingOtp ? (
                  <>
                    <Loader2 size={18} className="spin" /> Sending Code...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Send Reset Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="auth-form" noValidate>
              <div className="form-group card glass-card p-md margin-bottom-md" style={{ background: 'rgba(15, 22, 41, 0.6)' }}>
                <label htmlFor="otpCode" className="flex-center-between">
                  <span className="flex-center gap-xs font-semibold">
                    <Mail size={16} className="text-cyan" /> Email OTP
                  </span>
                  <span className="text-xs text-muted">{resolvedEmail || identifier}</span>
                </label>
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    setError('');
                  }}
                  className="text-center font-bold tracking-widest"
                  style={{ fontSize: '1.25rem', letterSpacing: '0.35rem' }}
                  autoFocus
                />
              </div>

              <p className="text-center text-sm text-muted margin-bottom-md" style={{ fontStyle: 'italic' }}>
                Note: Please check your spam or junk folder if you haven't received the OTP after a minute.
              </p>

              <div className="form-group margin-top-md">
                <label htmlFor="newPassword">New Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-left-icon" />
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-left-icon" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Retype new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full margin-top-md" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Resetting...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              <div className="flex-center-between margin-top-md">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-ghost btn-sm flex-center gap-2xs"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="btn btn-ghost btn-sm text-cyan"
                  disabled={sendingOtp || resendCooldown > 0}
                >
                  {sendingOtp ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-footer-text">
            Remembered your password? <Link to="/login" className="auth-link">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
};
