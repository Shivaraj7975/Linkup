const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUserWithVerification,
  findUserByEmail,
  findUserByIdentifier,
  isProfileComplete,
  updateUserPassword,
  validateUsername,
  isUsernameAvailable,
} = require('../services/authService');
const {
  isCollegeEmail,
  generateOtpCode,
  saveOtpToDb,
  verifyOtpInDb,
  sendOtpEmail,
  normalizePurpose,
} = require('../services/emailService');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate JWT Token helper
 */
const generateToken = (user) => {
  const secret = process.env.NODE_ENV === 'production'
    ? process.env.JWT_SECRET
    : (process.env.JWT_SECRET || 'linkup_jwt_super_secret_key_2026_dev');

  if (!secret) {
    throw new Error('JWT_SECRET is required in production');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username || null },
    secret,
    { expiresIn }
  );
};

/**
 * POST /api/auth/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email, identifier, type = 'REGISTRATION' } = req.body;
    const target = (identifier || email || '').trim();

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required.',
      });
    }

    const purpose = normalizePurpose(type);
    let cleanEmail = target.toLowerCase();

    // If password reset, resolve user by email or username
    if (purpose === 'PASSWORD_RESET') {
      const user = await findUserByIdentifier(target);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email or username.',
        });
      }
      cleanEmail = user.email.toLowerCase();
    } else {
      // For registration or college verification, standard email regex is required
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'A valid email address is required.',
        });
      }
    }

    // Primary email cannot be a college email
    if (purpose === 'REGISTRATION') {
      if (isCollegeEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Primary email cannot be a college email ID. Please use a personal email address (e.g. Gmail, Outlook).',
        });
      }
    }

    // College email must be valid educational domain
    if (purpose === 'COLLEGE_VERIFICATION') {
      if (!isCollegeEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid institutional college email address ending with .edu, .edu.in, .ac.in, etc.',
        });
      }
    }

    // Generate and save OTP
    const otpCode = generateOtpCode();
    await saveOtpToDb(cleanEmail, otpCode, purpose);

    // Send email
    try {
      await sendOtpEmail({ toEmail: cleanEmail, otpCode, type: purpose });
    } catch (emailErr) {
      console.error(`❌ Email delivery failure for ${cleanEmail}:`, emailErr.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({
          success: false,
          message: 'Failed to send OTP verification email. Please check your email address and try again.',
        });
      }
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: `OTP verification code sent to ${cleanEmail}.`,
      devOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otpCode, type = 'REGISTRATION' } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(otpCode).trim();
    const purpose = normalizePurpose(type);

    const isValid = await verifyOtpInDb(cleanEmail, cleanCode, purpose);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP verification code.',
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register (Mandatory Primary OTP Verification)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, primaryOtp, collegeEmail, collegeOtp } = req.body;

    // 1. Validate basic inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.',
      });
    }

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid personal email address is required.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (isCollegeEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Primary email cannot be a college email ID. Please use a personal email address (e.g. Gmail, Outlook).',
      });
    }

    // 2. Mandatory Primary Email OTP Verification
    if (!primaryOtp || typeof primaryOtp !== 'string' || primaryOtp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Personal email verification OTP code (6 digits) is required for registration.',
      });
    }

    const isPrimaryValid = await verifyOtpInDb(cleanEmail, primaryOtp.trim(), 'REGISTRATION');
    if (!isPrimaryValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code for personal email.',
      });
    }

    // 3. Check if user already exists
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // 4. Validate and verify College Email & College OTP if provided
    let cleanCollegeEmail = null;
    let isCollegeVerified = false;

    if (collegeEmail && collegeEmail.trim()) {
      cleanCollegeEmail = collegeEmail.trim().toLowerCase();

      if (!isCollegeEmail(cleanCollegeEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid institutional college email address ending with .edu, .edu.in, .ac.in, etc.',
        });
      }

      if (collegeOtp && collegeOtp.trim().length === 6) {
        const isCollegeValid = await verifyOtpInDb(cleanCollegeEmail, collegeOtp.trim(), 'COLLEGE_VERIFICATION');
        if (!isCollegeValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired OTP code for college email.',
          });
        }
        isCollegeVerified = true;
      }
    }

    // 5. Hash password securely
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Create user and student_verifications record
    const newUser = await createUserWithVerification({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      collegeEmail: cleanCollegeEmail,
      isCollegeVerified,
    });

    // 7. Generate JWT token
    const token = generateToken(newUser);

    // 8. Return response
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        collegeEmail: cleanCollegeEmail,
        isCollegeVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, username, identifier, password } = req.body;
    const loginIdentifier = (identifier || email || username || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username and password are required.',
      });
    }

    const user = await findUserByIdentifier(loginIdentifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || null,
        email: user.email,
        role: user.role || 'USER',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profileComplete = await isProfileComplete(userId);

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username || null,
        email: req.user.email,
        role: req.user.role || 'USER',
        isProfileComplete: profileComplete,
        createdAt: req.user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/check-username?username=xyz
 */
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'Please enter a username.',
      });
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.status(200).json({
        success: true,
        available: false,
        message: validation.message,
      });
    }

    const isAvail = await isUsernameAvailable(validation.cleanUsername, req.user?.id);
    return res.status(200).json({
      success: true,
      available: isAvail,
      cleanUsername: validation.cleanUsername,
      message: isAvail ? 'Username is available!' : 'Username is already taken.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, identifier, otpCode, newPassword } = req.body;
    const targetIdentifier = (identifier || email || '').trim();

    if (!targetIdentifier || !otpCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email or username, OTP code, and new password are required.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await findUserByIdentifier(targetIdentifier);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email or username.',
      });
    }

    const cleanEmail = user.email.toLowerCase();
    const cleanCode = String(otpCode).trim();

    // Verify OTP explicitly against canonical PASSWORD_RESET purpose
    const isValid = await verifyOtpInDb(cleanEmail, cleanCode, 'PASSWORD_RESET');
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset OTP code.',
      });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await updateUserPassword(cleanEmail, passwordHash);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  checkUsername,
  sendOtp,
  verifyOtp,
  resetPassword,
};
