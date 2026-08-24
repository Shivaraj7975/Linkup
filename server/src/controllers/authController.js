const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUserWithVerification,
  findUserByEmail,
  isProfileComplete,
} = require('../services/authService');
const {
  isCollegeEmail,
  generateOtpCode,
  saveOtpToDb,
  verifyOtpInDb,
  sendOtpEmail,
} = require('../services/emailService');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate JWT Token helper
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'linkup_jwt_super_secret_key_2026_dev';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn }
  );
};

/**
 * POST /api/auth/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email, type = 'PRIMARY' } = req.body;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check primary email is not a college email
    if (type === 'PRIMARY') {
      if (isCollegeEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Primary email cannot be a college email ID. Please use a personal email address (e.g. Gmail, Outlook).',
        });
      }
    }

    // Check college domain if type is COLLEGE
    if (type === 'COLLEGE') {
      if (!isCollegeEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid institutional college email address ending with .edu, .edu.in, .ac.in, etc.',
        });
      }
    }

    const otpCode = generateOtpCode();
    await saveOtpToDb(cleanEmail, otpCode, type);

    try {
      await sendOtpEmail({ toEmail: cleanEmail, otpCode, type });
    } catch (emailErr) {
      console.warn(`⚠️ Email delivery notice for ${cleanEmail}:`, emailErr.message);
    }

    return res.json({
      success: true,
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
    const { email, otpCode, type = 'PRIMARY' } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required.',
      });
    }

    const isValid = await verifyOtpInDb(email, otpCode, type);
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
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, primaryOtp, collegeEmail, collegeOtp } = req.body;

    // 1. Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.',
      });
    }

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
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

    // 2. Check if user already exists
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // 3. Verify Primary OTP if provided
    if (primaryOtp) {
      const isPrimaryValid = await verifyOtpInDb(cleanEmail, primaryOtp, 'PRIMARY');
      if (!isPrimaryValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code for primary email.',
        });
      }
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

      if (collegeOtp) {
        const isCollegeValid = await verifyOtpInDb(cleanCollegeEmail, collegeOtp, 'COLLEGE');
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
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Find user by email
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate token
    const token = generateToken(user);

    // 5. Return safe user data & token
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
        email: req.user.email,
        isProfileComplete: profileComplete,
        createdAt: req.user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  sendOtp,
  verifyOtp,
};
