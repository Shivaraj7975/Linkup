/**
 * API Service for communicating with MELD Platform Services
 */

const getApiBaseUrl = () => {
  let url = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Get stored JWT token from localStorage
 */
const getToken = () => {
  const token = localStorage.getItem('meld_token');
  if (!token) {
    const legacy = localStorage.getItem('linkup_token');
    if (legacy) {
      localStorage.setItem('meld_token', legacy);
      localStorage.removeItem('linkup_token');
      return legacy;
    }
  }
  return token;
};

/**
 * Helper to build request headers with optional auth token
 */
const authHeaders = () => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Sanitize and encapsulate backend/network errors into friendly, human-centric messages.
 * Never leaks raw network errors, 500 HTML traces, or database errors to the user.
 */
export const sanitizeErrorMessage = (error, defaultFallback = 'Unable to complete this request right now. Please try again.') => {
  if (!error) return defaultFallback;
  const rawMsg = typeof error === 'string' ? error : (error.message || '');
  if (!rawMsg) return defaultFallback;

  const lower = rawMsg.toLowerCase();

  // Network / Connection errors
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused') ||
    lower.includes('connection refused')
  ) {
    return 'Unable to connect right now. Please check your internet connection and try again.';
  }

  // Server 5xx errors or database errors
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('internal server error') ||
    lower.includes('mongoose') ||
    lower.includes('mongo') ||
    lower.includes('database') ||
    lower.includes('sql') ||
    lower.includes('econnreset')
  ) {
    return 'We are experiencing temporary difficulties. Please try again in a moment.';
  }

  // JSON / Syntax parsing errors
  if (
    lower.includes('json') ||
    lower.includes('unexpected token') ||
    lower.includes('syntaxerror')
  ) {
    return 'Something went wrong while processing your request. Please try again.';
  }

  // Clean technical prefixes
  let cleanMsg = rawMsg.replace(/^(Error:\s*|HTTP Error:\s*\d+\s*|API Error:\s*)/i, '').trim();

  return cleanMsg || defaultFallback;
};

/**
 * Universal safe fetch wrapper that performs JSON parsing and error encapsulation
 */
const safeRequest = async (url, options = {}, defaultErrMsg = 'Request failed.') => {
  try {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const serverMsg = data && (data.message || data.error);
      throw new Error(serverMsg || defaultErrMsg);
    }
    return data;
  } catch (err) {
    throw new Error(sanitizeErrorMessage(err, defaultErrMsg));
  }
};

/**
 * Fetch health status GET /api/health
 */
export const getHealthStatus = async () => {
  try {
    const data = await safeRequest(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, 'Service is currently unavailable.');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Service is currently unavailable.',
    };
  }
};

/**
 * GET /api/auth/check-username
 */
export const checkUsernameApi = async (username) => {
  return safeRequest(
    `${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    'Unable to check username availability.'
  );
};

/**
 * POST /api/auth/send-otp
 */
export const sendOtpApi = async (identifier, type = 'PRIMARY') => {
  return safeRequest(
    `${API_BASE_URL}/auth/send-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, type }),
    },
    'Unable to send verification code. Please try again.'
  );
};

/**
 * POST /api/auth/verify-otp
 */
export const verifyOtpApi = async (email, otpCode, type = 'PRIMARY') => {
  return safeRequest(
    `${API_BASE_URL}/auth/verify-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode, type }),
    },
    'Invalid or expired verification code.'
  );
};

/**
 * POST /api/auth/reset-password
 */
export const resetPasswordApi = async (identifier, otpCode, newPassword) => {
  return safeRequest(
    `${API_BASE_URL}/auth/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, otpCode, newPassword }),
    },
    'Unable to reset password. Please try again.'
  );
};

/**
 * POST /api/auth/register
 */
export const registerUser = async ({ name, email, password, primaryOtp, collegeEmail, collegeOtp }) => {
  return safeRequest(
    `${API_BASE_URL}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, primaryOtp, collegeEmail, collegeOtp }),
    },
    'Registration could not be completed. Please try again.'
  );
};

/**
 * POST /api/auth/login
 */
export const loginUser = async (identifier, password) => {
  return safeRequest(
    `${API_BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, password }),
    },
    'Invalid login credentials. Please check and try again.'
  );
};

/**
 * POST /api/auth/login-otp
 */
export const loginWithOtpApi = async (identifier, otpCode) => {
  return safeRequest(
    `${API_BASE_URL}/auth/login-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, otpCode }),
    },
    'Login verification code is invalid or expired.'
  );
};

/**
 * GET /api/auth/me
 */
export const getCurrentUser = async () => {
  return safeRequest(
    `${API_BASE_URL}/auth/me`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load your account session.'
  );
};

/**
 * GET /api/skills
 */
export const getSkills = async () => {
  const data = await safeRequest(
    `${API_BASE_URL}/skills`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    'Unable to load skills list.'
  );
  return data.skills || [];
};

/**
 * GET /api/interests
 */
export const getInterests = async () => {
  const data = await safeRequest(
    `${API_BASE_URL}/interests`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    'Unable to load interests list.'
  );
  return data.interests || [];
};

/**
 * GET /api/profile
 */
export const getProfile = async () => {
  return safeRequest(
    `${API_BASE_URL}/profile`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load your profile details.'
  );
};

/**
 * PUT /api/profile
 */
export const updateProfile = async (profileData) => {
  return safeRequest(
    `${API_BASE_URL}/profile`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(profileData),
    },
    'Unable to save profile changes. Please try again.'
  );
};

/**
 * POST /api/profile/link-college-email
 */
export const linkCollegeEmailApi = async (collegeEmail, collegeOtp) => {
  return safeRequest(
    `${API_BASE_URL}/profile/link-college-email`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ collegeEmail, collegeOtp }),
    },
    'Unable to verify college email address.'
  );
};

/**
 * DELETE /api/profile/unlink-college-email
 */
export const unlinkCollegeEmailApi = async () => {
  return safeRequest(
    `${API_BASE_URL}/profile/unlink-college-email`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to unlink college email address.'
  );
};

/**
 * Search universities/colleges
 */
export const searchUniversities = async (queryStr) => {
  if (!queryStr || queryStr.trim().length < 2) return [];
  try {
    const url = `https://api.ror.org/v2/organizations?query=${encodeURIComponent(queryStr.trim())}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();

    if (!data || !Array.isArray(data.items)) return [];

    return data.items.slice(0, 8).map((item) => {
      const displayNameObj =
        item.names?.find((n) => n.types?.includes('ror_display')) || item.names?.[0];
      const name = displayNameObj ? displayNameObj.value : item.id;

      const loc = item.locations?.[0]?.geonames_details || {};
      const country = loc.country_name || '';
      const state = loc.country_subdivision_name || '';
      const city = loc.name || '';
      const domain =
        item.domains?.[0] ||
        (item.links?.[0]?.value ? item.links[0].value.replace(/^https?:\/\/(www\.)?/, '') : '');

      return {
        id: item.id,
        name,
        country,
        state,
        city,
        domain,
        locationStr: [city, state, country].filter(Boolean).join(', '),
      };
    });
  } catch {
    return [];
  }
};

/* ==========================================================================
   MELD MODULE API ENDPOINTS
   ========================================================================== */

/**
 * POST /api/linkups - Create a new MELD project
 */
export const createLinkup = async (linkupData) => {
  return safeRequest(
    `${API_BASE_URL}/linkups`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(linkupData),
    },
    'Unable to create your MELD project.'
  );
};

/**
 * GET /api/linkups - Discover / Filter Melds
 */
export const getLinkups = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append('category', params.category);
  if (params.skill) queryParams.append('skill', params.skill);
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.college) queryParams.append('college', params.college);
  if (params.availability) queryParams.append('availability', params.availability);
  if (params.creatorId) queryParams.append('creatorId', params.creatorId);
  if (params.memberUserId) queryParams.append('memberUserId', params.memberUserId);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/linkups${queryString ? `?${queryString}` : ''}`;

  return safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load projects.'
  );
};

/**
 * GET /api/linkups/:id - Get single Meld details
 */
export const getLinkupById = async (id) => {
  const data = await safeRequest(
    `${API_BASE_URL}/linkups/${id}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load project details.'
  );
  return data.meld || data.linkup;
};

/**
 * PUT /api/linkups/:id - Update Meld
 */
export const updateLinkup = async (id, linkupData) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${id}`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(linkupData),
    },
    'Unable to save project updates.'
  );
};

/**
 * DELETE /api/linkups/:id - Delete Meld
 */
export const deleteLinkup = async (id) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${id}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to delete project.'
  );
};

/**
 * POST /api/linkups/:linkupId/join - Submit Join Request
 */
export const sendJoinRequest = async (linkupId, message) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${linkupId}/join`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    },
    'Unable to submit join request.'
  );
};

/**
 * GET /api/linkups/:linkupId/requests - View Join Requests
 */
export const getLinkupRequests = async (linkupId) => {
  const data = await safeRequest(
    `${API_BASE_URL}/linkups/${linkupId}/requests`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load join requests.'
  );
  return data.requests || [];
};

/**
 * GET /api/melds/:meldId/messages - View Chat History
 */
export const getMeldChatHistory = async (meldId, beforeTimestamp = null) => {
  let url = `${API_BASE_URL}/melds/${meldId}/messages`;
  if (beforeTimestamp) {
    url += `?before=${encodeURIComponent(beforeTimestamp)}`;
  }
  const data = await safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load chat messages.'
  );
  return data.messages || [];
};

/**
 * POST /api/join-requests/:requestId/accept - Accept Join Request
 */
export const acceptJoinRequest = async (requestId) => {
  return safeRequest(
    `${API_BASE_URL}/join-requests/${requestId}/accept`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Unable to accept applicant.'
  );
};

/**
 * POST /api/join-requests/:requestId/reject - Reject Join Request
 */
export const rejectJoinRequest = async (requestId) => {
  return safeRequest(
    `${API_BASE_URL}/join-requests/${requestId}/reject`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Unable to decline join request.'
  );
};

/**
 * DELETE /api/linkups/:linkupId/members/:userId - Remove Team Member
 */
export const removeTeamMember = async (linkupId, userId) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${linkupId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to remove team member.'
  );
};

/* ==========================================================================
   AI MATCHING ENGINE API ENDPOINTS
   ========================================================================== */

/**
 * GET /api/linkups/:linkupId/filter-options - Fetch Candidate Filter Options
 */
export const getMatchFilterOptions = async (linkupId) => {
  const url = `${API_BASE_URL}/linkups/${linkupId}/filter-options`;
  const data = await safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load candidate filter options.'
  );
  return data.options || { cities: [], colleges: [], branches: [], years: [], skills: [] };
};

/**
 * GET /api/linkups/:linkupId/candidate-count - Fetch Count of Eligible Candidates with Filters
 */
export const getEligibleCandidateCount = async (linkupId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.city) params.append('city', filters.city);
  if (filters.college) params.append('college', filters.college);
  if (filters.branch) params.append('branch', filters.branch);
  if (filters.year) params.append('year', filters.year);
  if (Array.isArray(filters.skills) && filters.skills.length > 0) {
    params.append('skills', filters.skills.join(','));
  }
  if (filters.skillMatchMode) params.append('skillMatchMode', filters.skillMatchMode);

  const queryStr = params.toString();
  const url = `${API_BASE_URL}/linkups/${linkupId}/candidate-count${queryStr ? `?${queryStr}` : ''}`;
  const data = await safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to calculate candidate pool size.'
  );
  return data.count !== undefined ? data.count : 0;
};

/**
 * GET /api/linkups/:linkupId/matches - Fetch Ranked AI Teammate Matches with Filters
 */
export const getLinkupMatches = async (linkupId, refresh = false, filters = {}) => {
  const params = new URLSearchParams();
  if (refresh) params.append('refresh', 'true');
  if (filters.city) params.append('city', filters.city);
  if (filters.college) params.append('college', filters.college);
  if (filters.branch) params.append('branch', filters.branch);
  if (filters.year) params.append('year', filters.year);
  if (Array.isArray(filters.skills) && filters.skills.length > 0) {
    params.append('skills', filters.skills.join(','));
  }
  if (filters.skillMatchMode) params.append('skillMatchMode', filters.skillMatchMode);

  const queryStr = params.toString();
  const url = `${API_BASE_URL}/linkups/${linkupId}/matches${queryStr ? `?${queryStr}` : ''}`;
  return safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to find team recommendations right now.'
  );
};

/**
 * GET /api/users/:userId - Fetch Public Student Profile
 */
export const getPublicUserProfile = async (userId) => {
  return safeRequest(
    `${API_BASE_URL}/users/${userId}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load student profile.'
  );
};

/* ==========================================================================
   INVITATIONS & MEMBERSHIP API ENDPOINTS
   ========================================================================== */

/**
 * POST /api/linkups/:linkupId/invite - Invite a user to a Meld
 */
export const inviteToLinkup = async (linkupId, inviteeId) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${linkupId}/invite`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ inviteeId }),
    },
    'Unable to send invitation.'
  );
};

/**
 * POST /api/linkups/:linkupId/leave - Leave a Meld
 */
export const leaveLinkup = async (linkupId) => {
  return safeRequest(
    `${API_BASE_URL}/linkups/${linkupId}/leave`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Unable to leave project.'
  );
};

/**
 * GET /api/invitations - Get pending invitations
 */
export const getUserInvitations = async () => {
  return safeRequest(
    `${API_BASE_URL}/invitations`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load invitations.'
  );
};

/**
 * POST /api/invitations/:id/respond - Accept or reject invitation
 */
export const respondToInvitation = async (invitationId, action) => {
  return safeRequest(
    `${API_BASE_URL}/invitations/${invitationId}/respond`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action }), // 'ACCEPTED' or 'REJECTED'
    },
    'Unable to respond to invitation.'
  );
};

// MELD Alias Exports for backward/forward compatibility
export const createMeld = createLinkup;
export const getMelds = getLinkups;
export const getMeldById = getLinkupById;
export const updateMeld = updateLinkup;
export const deleteMeld = deleteLinkup;
export const sendMeldJoinRequest = sendJoinRequest;
export const getMeldRequests = getLinkupRequests;
export const removeMeldMember = removeTeamMember;
export const getMeldFilterOptions = getMatchFilterOptions;
export const getMeldCandidateCount = getEligibleCandidateCount;
export const getMeldMatches = getLinkupMatches;
export const inviteToMeld = inviteToLinkup;
export const leaveMeld = leaveLinkup;

/**
 * GET /api/users/search?q=...&meldId=... - Search platform users to invite
 */
export const searchUsersToInvite = async (query = '', meldId = null) => {
  let url = `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`;
  if (meldId) {
    url += `&meldId=${encodeURIComponent(meldId)}`;
  }
  const data = await safeRequest(
    url,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to search candidates.'
  );
  return data.users || [];
};

/**
 * GET /api/user/join-requests - Fetch join requests sent by current user
 */
export const getMyJoinRequests = async () => {
  const data = await safeRequest(
    `${API_BASE_URL}/user/join-requests`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load your join requests.'
  );
  return data.requests || [];
};

/**
 * DELETE /api/join-requests/:requestId - Cancel a pending join request
 */
export const cancelJoinRequest = async (requestId) => {
  return safeRequest(
    `${API_BASE_URL}/join-requests/${requestId}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to cancel join request.'
  );
};

/**
 * GET /api/notifications - Fetch user notifications and unread count
 */
export const fetchNotificationsApi = async () => {
  return safeRequest(
    `${API_BASE_URL}/notifications`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Unable to load notifications.'
  );
};

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
export const markNotificationReadApi = async (id) => {
  return safeRequest(
    `${API_BASE_URL}/notifications/${id}/read`,
    {
      method: 'PUT',
      headers: authHeaders(),
    },
    'Unable to update notification.'
  );
};

/**
 * PUT /api/notifications/read-all - Mark all notifications as read
 */
export const markAllNotificationsReadApi = async () => {
  return safeRequest(
    `${API_BASE_URL}/notifications/read-all`,
    {
      method: 'PUT',
      headers: authHeaders(),
    },
    'Unable to mark all notifications as read.'
  );
};

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
export const deleteNotificationApi = async (id) => {
  return safeRequest(
    `${API_BASE_URL}/notifications/${id}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to delete notification.'
  );
};

/**
 * DELETE /api/notifications/clear-all - Clear all notifications
 */
export const clearAllNotificationsApi = async () => {
  return safeRequest(
    `${API_BASE_URL}/notifications/clear-all`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Unable to clear notifications.'
  );
};
