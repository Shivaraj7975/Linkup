const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool, query } = require('../config/db');

/**
 * Standard Canonical OTP Purposes:
 * - REGISTRATION
 * - COLLEGE_VERIFICATION
 * - PASSWORD_RESET
 * - LOGIN
 */
const CANONICAL_PURPOSES = {
  PRIMARY: 'REGISTRATION',
  REGISTRATION: 'REGISTRATION',
  COLLEGE: 'COLLEGE_VERIFICATION',
  COLLEGE_VERIFICATION: 'COLLEGE_VERIFICATION',
  RESET_PASSWORD: 'PASSWORD_RESET',
  PASSWORD_RESET: 'PASSWORD_RESET',
  LOGIN: 'LOGIN',
  LOGIN_OTP: 'LOGIN',
};

const normalizePurpose = (type) => {
  if (!type) return 'REGISTRATION';
  const clean = String(type).trim().toUpperCase();
  return CANONICAL_PURPOSES[clean] || clean;
};

/**
 * True only for OTP types that map to a canonical purpose (unknown types used to be
 * stored and emailed as-is, skipping every per-purpose check in send-otp).
 */
const isKnownPurpose = (type) => {
  if (!type) return true; // defaults to REGISTRATION
  return Object.prototype.hasOwnProperty.call(CANONICAL_PURPOSES, String(type).trim().toUpperCase());
};

/**
 * Mask email address for privacy in server logs (e.g. u***r@example.com)
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim().toLowerCase();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 0) return '***';
  const username = clean.substring(0, atIndex);
  const domain = clean.substring(atIndex + 1);
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  return `${username[0]}***${username[username.length - 1]}@${domain}`;
};

/**
 * Validate if an email address is a valid institutional college email.
 * Checks for suffixes like .edu, .edu.in, .ac.in, .ac.uk, .edu.au, .edu.sg, etc.
 */
/**
 * Strict single-address email check.
 * The previous loose pattern accepted separators such as ',' and ';', so a value like
 * "me@gmail.com,iit.ac.in" passed the college-domain check while the mailer delivered
 * the OTP only to me@gmail.com (student-verification bypass).
 */
const STRICT_EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

const isValidEmailAddress = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  return clean.length <= 254 && STRICT_EMAIL_REGEX.test(clean);
};

const isCollegeEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();

  if (!isValidEmailAddress(clean)) return false;

  const domain = clean.split('@')[1] || '';

  const collegeDomainRegex = /\.(edu|edu\.[a-z]{2,3}|ac\.[a-z]{2,3}|ac)$/i;
  const explicitSuffixes = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.edu.au', '.edu.sg', '.edu.ca', '.edu.cn'];

  return collegeDomainRegex.test(domain) || explicitSuffixes.some((suf) => domain.endsWith(suf));
};

/**
 * Generate cryptographically secure 6-digit numeric OTP code
 */
const generateOtpCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Compute cryptographic HMAC-SHA256 hash of an OTP code peppered with server secret
 */
const hashOtp = (code, email, purpose) => {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!pepper) {
    throw new Error('FATAL SECURITY ERROR: OTP_PEPPER / JWT_SECRET environment variable is required for cryptographic OTP hashing.');
  }
  return crypto.createHmac('sha256', pepper)
    .update(`${String(code).trim()}:${email.trim().toLowerCase()}:${purpose}`)
    .digest('hex');
};

/**
 * Save generated OTP to PostgreSQL DB with 10-minute expiry
 * Stores cryptographically hashed OTP code, invalidates older unverified OTPs
 * for the same email + purpose, and opportunistically cleans up expired records.
 */
const saveOtpToDb = async (email, otpCode, rawPurpose) => {
  const cleanEmail = email.trim().toLowerCase();
  const purpose = normalizePurpose(rawPurpose);
  const hashedOtp = hashOtp(otpCode, cleanEmail, purpose);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Invalidate any older active OTPs for the same email + purpose
    await client.query(
      `UPDATE otp_verifications 
       SET expires_at = CURRENT_TIMESTAMP 
       WHERE LOWER(email) = LOWER($1) 
         AND purpose = $2 
         AND is_verified = FALSE 
         AND expires_at > CURRENT_TIMESTAMP`,
      [cleanEmail, purpose]
    );

    // 2. Insert the new valid hashed OTP with attempts = 0
    await client.query(
      `INSERT INTO otp_verifications (email, otp_code, purpose, expires_at, attempts)
       VALUES ($1, $2, $3, $4, 0)`,
      [cleanEmail, hashedOtp, purpose, expiresAt]
    );

    // 3. Opportunistic cleanup: remove records expired > 1 day ago
    await client.query(
      `DELETE FROM otp_verifications WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Atomically verify and consume OTP code against DB records
 * - Checks hashed OTP value using constant-time comparison
 * - Tracks verification attempts (max 5 attempts before automatic revocation)
 * - Uses UPDATE ... FOR UPDATE to prevent race conditions & double-consumption
 */
const verifyOtpInDb = async (email, otpCode, rawPurpose) => {
  if (!email || !otpCode) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(otpCode).trim();
  const purpose = normalizePurpose(rawPurpose);
  const expectedHash = hashOtp(cleanCode, cleanEmail, purpose);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Select latest active unverified OTP for this email and purpose FOR UPDATE
    const selectRes = await client.query(
      `SELECT id, otp_code, COALESCE(attempts, 0) as attempts, expires_at 
       FROM otp_verifications 
       WHERE LOWER(email) = LOWER($1) 
         AND purpose = $2 
         AND is_verified = FALSE 
         AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC 
       LIMIT 1 
       FOR UPDATE`,
      [cleanEmail, purpose]
    );

    if (selectRes.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }

    const record = selectRes.rows[0];
    const newAttempts = record.attempts + 1;

    // Check brute-force limit (max 5 verification attempts per OTP)
    if (newAttempts > 5) {
      await client.query(
        `UPDATE otp_verifications SET expires_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [record.id]
      );
      await client.query('COMMIT');
      return false;
    }

    // Compare hashed OTP using timing-safe comparison (strictly reject unhashed/plaintext records)
    let isMatch = false;
    if (typeof record.otp_code === 'string' && record.otp_code.length === 64) {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(record.otp_code),
        Buffer.from(expectedHash)
      );
    }

    if (isMatch) {
      await client.query(
        `UPDATE otp_verifications SET is_verified = TRUE WHERE id = $1`,
        [record.id]
      );
      await client.query('COMMIT');
      return true;
    } else {
      await client.query(
        `UPDATE otp_verifications SET attempts = $1 WHERE id = $2`,
        [newAttempts, record.id]
      );
      await client.query('COMMIT');
      return false;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Send OTP via Brevo SMTP Relay / REST API
 */
const sendOtpEmail = async ({ toEmail, otpCode, type = 'REGISTRATION' }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const smtpLogin = process.env.BREVO_SMTP_LOGIN || 'your_brevo_smtp_login@example.com';
  const smtpHost = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const smtpPort = parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
  const senderEmail = process.env.SENDER_EMAIL || 'your_sender_email@example.com';
  const senderName = process.env.SENDER_NAME || 'MELD Platform';
  // Bound every provider call: an unresponsive mail provider must not hang the
  // OTP request (and its rate-limited client) indefinitely.
  const emailTimeoutMs = parseInt(process.env.EMAIL_TIMEOUT_MS, 10) || 10000;

  const cleanToEmail = toEmail.trim().toLowerCase();
  // HTML-escaped copy for the email body (the address is user-supplied)
  const htmlToEmail = cleanToEmail.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const canonicalPurpose = normalizePurpose(type);
  const isCollege = canonicalPurpose === 'COLLEGE_VERIFICATION';
  const isPasswordReset = canonicalPurpose === 'PASSWORD_RESET';
  const isLogin = canonicalPurpose === 'LOGIN';

  const subject = isCollege
    ? `🎓 MELD College Email Verification Code for ${cleanToEmail}`
    : isPasswordReset
    ? `🔑 MELD Password Reset Code for ${cleanToEmail}`
    : isLogin
    ? `🔐 MELD One-Time Login Code for ${cleanToEmail}`
    : `🔒 MELD Account Verification Code for ${cleanToEmail}`;

  const badgeText = isCollege
    ? 'COLLEGE EMAIL VERIFICATION'
    : isPasswordReset
    ? 'PASSWORD RESET'
    : isLogin
    ? 'ONE-TIME LOGIN OTP'
    : 'PERSONAL EMAIL VERIFICATION';

  const headingText = isCollege
    ? 'Verify Your College Email'
    : isPasswordReset
    ? 'Password Reset Request'
    : isLogin
    ? 'Log In to Your MELD Account'
    : 'Verify Your Personal Account Email';

  const htmlContent = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #080c18; color: #f1f5f9; padding: 30px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 24px;">MELD</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Student Teammate Matching Platform</p>
      </div>

      <div style="background-color: #0f1629; padding: 20px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); text-align: center;">
        <div style="display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.15); border-radius: 20px; color: #818cf8; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
          ${badgeText}
        </div>
        <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">
          ${headingText}
        </h2>
        <div style="background: rgba(255, 255, 255, 0.05); padding: 8px 14px; border-radius: 6px; margin: 12px 0; font-size: 13px; color: #cbd5e1;">
          Verification Target: <strong style="color: #60a5fa;">${htmlToEmail}</strong>
        </div>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 8px;">
          Use the 6-digit verification code below for <strong style="color: #f1f5f9;">${htmlToEmail}</strong>:
        </p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22d3ee; margin: 20px 0; background: rgba(34, 211, 238, 0.1); padding: 12px; border-radius: 6px;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
          This code is valid for 10 minutes. If you did not request this OTP for ${htmlToEmail}, please ignore this email.
        </p>
      </div>
    </div>
  `;

  // Safe logs with masked email
  const maskedTarget = maskEmail(cleanToEmail);
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n📧 [DEV OTP EMAIL] To: ${cleanToEmail} | Purpose: ${canonicalPurpose} | Code: ${otpCode}`);
  } else {
    console.log(`📧 [SENDING OTP EMAIL] To: ${maskedTarget} | Purpose: ${canonicalPurpose}`);
  }

  let lastError = null;

  // 1. If key is an SMTP key (starts with xsmtpsib-), use Brevo SMTP relay via Nodemailer
  if (apiKey && apiKey.startsWith('xsmtpsib-')) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        connectionTimeout: emailTimeoutMs,
        greetingTimeout: emailTimeoutMs,
        socketTimeout: emailTimeoutMs,
        // Refuse to send credentials/OTPs if the server does not offer STARTTLS (prevents TLS stripping)
        requireTLS: true,
        auth: {
          user: smtpLogin,
          pass: apiKey,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: cleanToEmail,
        subject,
        html: htmlContent,
      });

      return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
      lastError = smtpErr.message;
      console.error('❌ Brevo SMTP Relay Error:', smtpErr.message);
    }
  }

  // 2. Try Brevo REST API (for xkeysib- keys)
  if (apiKey && apiKey.startsWith('xkeysib-')) {
    try {
      const apiRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: cleanToEmail }],
          subject,
          htmlContent,
        }),
        signal: AbortSignal.timeout(emailTimeoutMs),
      });

      const data = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(data.message || 'Brevo REST API call failed.');
      }

      return { success: true, messageId: data.messageId || 'OK' };
    } catch (apiErr) {
      lastError = apiErr.message;
      console.error('❌ Brevo REST API Error:', apiErr.message);
    }
  }

  // In production, failure to send email must NOT silently succeed
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Failed to deliver OTP email: ${lastError || 'Email service unconfigured'}`);
  }

  // Development Fallback
  return { success: true, mode: 'DEV_LOG', otpCode };
};

module.exports = {
  CANONICAL_PURPOSES,
  normalizePurpose,
  maskEmail,
  isCollegeEmail,
  isValidEmailAddress,
  isKnownPurpose,
  generateOtpCode,
  hashOtp,
  saveOtpToDb,
  verifyOtpInDb,
  sendOtpEmail,
};
