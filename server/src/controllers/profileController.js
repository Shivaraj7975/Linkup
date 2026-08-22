const {
  getAllSkills,
  getAllInterests,
  getProfileByUserId,
  getPublicStudentProfileByUserId,
  updateStudentProfile,
} = require('../services/profileService');

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

module.exports = {
  getSkills,
  getInterests,
  getProfile,
  updateProfile,
  getPublicUserProfile,
};
