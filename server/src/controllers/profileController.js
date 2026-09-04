const {
  getAllSkills,
  getAllInterests,
  getProfileByUserId,
  getPublicStudentProfileByUserId,
  updateStudentProfile,
  linkCollegeEmail,
  unlinkCollegeEmail,
  searchUsersForInvite,
} = require('../services/profileService');
const { isCollegeEmail, verifyOtpInDb } = require('../services/emailService');

/**
 * GET /api/skills
 */
const getSkills = async (req, res, next) => {
  try {
    const skills = await getAllSkills();
    return res.status(200).json({
      success: true,
      skills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interests
 */
const getInterests = async (req, res, next) => {
  try {
    const interests = await getAllInterests();
    return res.status(200).json({
      success: true,
      interests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getProfileByUserId(userId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updatedData = await updateStudentProfile(userId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      ...updatedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:userId
 * Public endpoint to retrieve sanitized student profile data for Linkup discovery, AI matching & teams
 */
const getPublicUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const publicProfile = await getPublicStudentProfileByUserId(userId);

    if (!publicProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    return res.status(200).json(publicProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile/link-college-email
 */
const linkCollegeEmailController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { collegeEmail, collegeOtp } = req.body;

    if (!collegeEmail || !isCollegeEmail(collegeEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid institutional college email ending with .edu, .edu.in, .ac.in, etc.',
      });
    }

    if (!collegeOtp) {
      return res.status(400).json({
        success: false,
        message: '6-digit OTP verification code is required.',
      });
    }

    const isValid = await verifyOtpInDb(collegeEmail, collegeOtp, 'COLLEGE');
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code for college email.',
      });
    }

    await linkCollegeEmail(userId, collegeEmail);

    return res.status(200).json({
      success: true,
      message: 'College email linked and student status verified successfully!',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profile/unlink-college-email
 */
const unlinkCollegeEmailController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await unlinkCollegeEmail(userId);

    return res.status(200).json({
      success: true,
      message: 'College email unlinked successfully. Account status set to Unverified Student.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/search?q=...&meldId=...
 */
const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const meldId = req.query.meldId || null;
    const currentUserId = req.user.id;

    const users = await searchUsersForInvite(q, currentUserId, meldId);
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkills,
  getInterests,
  getProfile,
  updateProfile,
  getPublicUserProfile,
  linkCollegeEmailController,
  unlinkCollegeEmailController,
  searchUsers,
};
