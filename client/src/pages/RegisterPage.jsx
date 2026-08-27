import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendOtpApi } from '../services/api';
import { Link2, Eye, EyeOff, Loader2, Mail, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react';

/**
 * Validate institutional college email domain (.edu, .edu.in, .ac.in, etc.)
 */
const isCollegeEmailValid = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(clean)) return false;

  const domain = clean.split('@')[1] || '';
  const collegeDomainRegex = /\.(edu|edu\.[a-z]{2,3}|ac\.[a-z]{2,3}|ac)$/i;
  const explicitSuffixes = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.edu.au', '.edu.sg', '.edu.ca', '.edu.cn'];

  return collegeDomainRegex.test(domain) || explicitSuffixes.some((suf) => domain.endsWith(suf));
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Step 1: User Info | Step 2: OTP Verification
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    collegeEmail: '',
  });

  const [otps, setOtps] = useState({
    primaryOtp: '',
    collegeOtp: '',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    } else if (isCollegeEmailValid(form.email)) {
      errs.email = 'Primary email cannot be a college email ID. Please use a personal email address (e.g. Gmail, Outlook).';
    }
    if (!form.password || form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (form.collegeEmail && form.collegeEmail.trim()) {
      if (!isCollegeEmailValid(form.collegeEmail)) {
        errs.collegeEmail = 'College email must end with .edu, .edu.in, .ac.in, etc.';
      }
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

  const handleOtpChange = (e) => {
    const { name, value } = e.target;
    setOtps((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  // Trigger sending OTP to Primary Email (& College Email if entered)
  const handleSendOtps = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setSendingOtp(true);
    setApiError('');
    setApiSuccess('');

    try {
      // 1. Send OTP to Primary Email
      await sendOtpApi(form.email.trim(), 'PRIMARY');

      // 2. Send OTP to College Email if provided
      if (form.collegeEmail && form.collegeEmail.trim()) {
        await sendOtpApi(form.collegeEmail.trim(), 'COLLEGE');
      }

      setStep(2);
      setResendCooldown(60);
      setApiSuccess(
        form.collegeEmail && form.collegeEmail.trim()
          ? `Verification OTP codes sent to ${form.email} AND ${form.collegeEmail}.`
          : `Verification OTP code sent to ${form.email}.`
      );
    } catch (err) {
      setApiError(err.message || 'Failed to send OTP codes via Resend email service.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Submit complete registration with verified OTPs
  const handleFinalRegister = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');

    const errs = {};
    if (!otps.primaryOtp || otps.primaryOtp.trim().length !== 6) {
      errs.primaryOtp = 'Enter the 6-digit OTP sent to your primary email.';
    }
    if (form.collegeEmail && form.collegeEmail.trim()) {
      if (!otps.collegeOtp || otps.collegeOtp.trim().length !== 6) {
        errs.collegeOtp = 'Enter the 6-digit OTP sent to your college email.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        primaryOtp: otps.primaryOtp.trim(),
        collegeEmail: form.collegeEmail.trim() || null,
        collegeOtp: otps.collegeOtp ? otps.collegeOtp.trim() : null,
      });

      if (user.isProfileComplete) {
        navigate('/discover', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please check your verification codes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '520px' }}>
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

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            {step === 1
              ? 'Join MELD to gather your crew and build amazing projects.'
              : 'Enter the verification OTP code(s) sent via Resend API to your email.'}
          </p>

          {apiError && <div className="alert alert-error flex-center gap-xs"><AlertCircle size={16} /><span>{apiError}</span></div>}
          {apiSuccess && <div className="alert alert-success flex-center gap-xs"><CheckCircle2 size={16} /><span>{apiSuccess}</span></div>}

          {step === 1 ? (
            /* STEP 1 FORM */
            <form onSubmit={handleSendOtps} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="register-name">Full Name *</label>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Alex Johnson"
                  value={form.name}
                  onChange={handleChange}
                  className={errors.name ? 'input-error' : ''}
                  autoComplete="name"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-email">Personal Email *</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="you@gmail.com"
                  value={form.email}
                  onChange={handleChange}
                  className={errors.email ? 'input-error' : ''}
                  autoComplete="email"
                />
                <span className="field-hint">Used for account login and notifications.</span>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-college-email" className="flex-center-between">
                  <span>College / University Email (Optional)</span>
                  <span className="pill pill-cyan pill-xs flex-center gap-2xs" style={{ fontSize: '0.7rem' }}>
                    <GraduationCap size={12} /> Student Verification
                  </span>
                </label>
                <input
                  id="register-college-email"
                  type="email"
                  name="collegeEmail"
                  placeholder="e.g. alex@stanford.edu or student@rvce.edu.in"
                  value={form.collegeEmail}
                  onChange={handleChange}
                  className={errors.collegeEmail ? 'input-error' : ''}
                  autoComplete="email"
                />
                <span className="field-hint" style={{ color: '#94a3b8' }}>
                  Must end with <strong>.edu</strong>, <strong>.edu.in</strong>, <strong>.ac.in</strong>, etc. A second OTP will be sent to verify your student status.
                </span>
                {errors.collegeEmail && <span className="field-error">{errors.collegeEmail}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-password">Password *</label>
                <div className="input-wrapper">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    className={errors.password ? 'input-error' : ''}
                    autoComplete="new-password"
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-confirm">Confirm Password *</label>
                <div className="input-wrapper">
                  <input
                    id="register-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'input-error' : ''}
                    autoComplete="new-password"
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-full margin-top-sm" disabled={sendingOtp}>
                {sendingOtp ? (
                  <>
                    <Loader2 size={18} className="spin" /> Sending Verification Codes...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Send Verification Codes</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION FORM */
            <form onSubmit={handleFinalRegister} className="auth-form" noValidate>
              <div className="form-group card glass-card p-md margin-bottom-md" style={{ background: 'rgba(15, 22, 41, 0.6)' }}>
                <label htmlFor="primary-otp" className="flex-center-between">
                  <span className="flex-center gap-xs font-semibold">
                    <Mail size={16} className="text-cyan" /> Primary Email OTP
                  </span>
                  <span className="text-xs text-muted">{form.email}</span>
                </label>
                <input
                  id="primary-otp"
                  type="text"
                  name="primaryOtp"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otps.primaryOtp}
                  onChange={handleOtpChange}
                  className={`text-center font-bold tracking-widest ${errors.primaryOtp ? 'input-error' : ''}`}
                  style={{ fontSize: '1.25rem', letterSpacing: '0.35rem' }}
                  autoFocus
                />
                {errors.primaryOtp && <span className="field-error">{errors.primaryOtp}</span>}
              </div>

              {form.collegeEmail && form.collegeEmail.trim() && (
                <div className="form-group card glass-card p-md margin-bottom-md" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <label htmlFor="college-otp" className="flex-center-between">
                    <span className="flex-center gap-xs font-semibold text-primary">
                      <GraduationCap size={16} /> College Email OTP
                    </span>
                    <span className="text-xs text-muted">{form.collegeEmail}</span>
                  </label>
                  <input
                    id="college-otp"
                    type="text"
                    name="collegeOtp"
                    maxLength={6}
                    placeholder="Enter 6-digit College OTP"
                    value={otps.collegeOtp}
                    onChange={handleOtpChange}
                    className={`text-center font-bold tracking-widest ${errors.collegeOtp ? 'input-error' : ''}`}
                    style={{ fontSize: '1.25rem', letterSpacing: '0.35rem' }}
                  />
                  {errors.collegeOtp && <span className="field-error">{errors.collegeOtp}</span>}
                </div>
              )}

              <p className="text-center text-sm text-muted margin-bottom-md" style={{ fontStyle: 'italic' }}>
                Note: Please check your spam or junk folder if you haven't received the OTP after a minute.
              </p>

              <button type="submit" className="btn btn-primary btn-full margin-top-xs" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Creating Account & Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Verify & Create Account</span>
                  </>
                )}
              </button>

              <div className="flex-center-between margin-top-md">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-ghost btn-sm flex-center gap-2xs"
                >
                  <ArrowLeft size={14} /> Back to Edit Details
                </button>

                <button
                  type="button"
                  onClick={handleSendOtps}
                  className="btn btn-ghost btn-sm text-cyan"
                  disabled={sendingOtp || resendCooldown > 0}
                >
                  {sendingOtp ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Codes'}
                </button>
              </div>
            </form>
          )}

          <p className="auth-footer-text">
            Already have an account? <Link to="/login" className="auth-link">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
};
