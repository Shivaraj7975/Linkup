const { Resend } = require('resend');
const { query } = require('../config/db');

// Initialize Resend Client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('re_xxxxxxxxx')) {
    console.warn('⚠️ RESEND_API_KEY is missing or using placeholder in .env');
  }
  return new Resend(apiKey || 're_xxxxxxxxx');
};

/**
 * Validate if an email address is a valid institutional college email.
 * Checks for suffixes like .edu, .edu.in, .ac.in, .ac.uk, .edu.au, .edu.sg, etc.
 */
const isCollegeEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  
  // Standard email format check
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(clean)) return false;

  const domain = clean.split('@')[1] || '';
  
  // Pattern matching for educational & academic domains
  const collegeDomainRegex = /\.(edu|edu\.[a-z]{2,3}|ac\.[a-z]{2,3}|ac)$/i;
  
  // Common explicit suffixes for quick lookup
  const explicitSuffixes = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.edu.au', '.edu.sg', '.edu.ca', '.edu.cn'];
  
  return collegeDomainRegex.test(domain) || explicitSuffixes.some((suf) => domain.endsWith(suf));
};

/**
 * Generate 6-digit numeric OTP code
 */
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Save generated OTP to PostgreSQL DB with 10-minute expiry
 */
const saveOtpToDb = async (email, otpCode, purpose) => {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await query(
    `INSERT INTO otp_verifications (email, otp_code, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [cleanEmail, otpCode, purpose, expiresAt]
  );
};

/**
 * Verify OTP code against DB records
 */
const verifyOtpInDb = async (email, otpCode, purpose) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = otpCode.trim();

  const res = await query(
    `SELECT id FROM otp_verifications
     WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND expires_at > NOW() AND is_verified = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [cleanEmail, cleanCode, purpose]
  );

  if (res.rows.length === 0) {
    return false;
  }

  // Mark as verified
  await query(
    `UPDATE otp_verifications SET is_verified = TRUE WHERE id = $1`,
    [res.rows[0].id]
  );

  return true;
};

/**
 * Send OTP via Resend API
 */
const sendOtpEmail = async ({ toEmail, otpCode, type = 'PRIMARY' }) => {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const isCollege = type === 'COLLEGE';
  const subject = isCollege
    ? '🎓 Linkup College Email Verification Code'
    : '🔒 Linkup Account Verification Code';

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #080c18; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 24px;">Linkup</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Student Teammate Matching Platform</p>
      </div>

      <div style="background-color: #0f1629; padding: 20px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); text-align: center;">
        <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">
          ${isCollege ? 'Verify Your College Email' : 'Verify Your Linkup Account'}
        </h2>
        <p style="color: #94a3b8; font-size: 14px;">
          Use the 6-digit code below to complete your ${isCollege ? 'student verification' : 'account setup'}:
        </p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22d3ee; margin: 20px 0; background: rgba(34, 211, 238, 0.1); padding: 12px; border-radius: 6px;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
          This code is valid for 10 minutes. Please do not share it with anyone.
        </p>
      </div>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail.trim().toLowerCase(),
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    throw new Error(error.message || 'Failed to send OTP email via Resend.');
  }
};

module.exports = {
  isCollegeEmail,
  generateOtpCode,
  saveOtpToDb,
  verifyOtpInDb,
  sendOtpEmail,
};
