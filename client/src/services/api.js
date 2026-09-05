/**
 * API Service for communicating with Linkup Express Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get stored JWT token from localStorage
 */
const getToken = () => localStorage.getItem('meld_token') || localStorage.getItem('linkup_token');

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
 * Fetch backend health status GET /api/health
 */
export const getHealthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API Error fetching /api/health:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to MELD backend API',
    };
  }
};

/**
 * GET /api/auth/check-username
 */
export const checkUsernameApi = async (username) => {
  const response = await fetch(`${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to check username availability.');
  }
  return data;
};

/**
 * POST /api/auth/send-otp
 */
export const sendOtpApi = async (identifier, type = 'PRIMARY') => {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, email: identifier, type }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send OTP verification code.');
  }
  return data;
};

/**
 * POST /api/auth/verify-otp
 */
export const verifyOtpApi = async (email, otpCode, type = 'PRIMARY') => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otpCode, type }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Invalid or expired OTP code.');
  }
  return data;
};

/**
 * POST /api/auth/reset-password
 */
export const resetPasswordApi = async (identifier, otpCode, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, email: identifier, otpCode, newPassword }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
  return data;
};

/**
 * POST /api/auth/register
 */
export const registerUser = async ({ name, email, password, primaryOtp, collegeEmail, collegeOtp }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, primaryOtp, collegeEmail, collegeOtp }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed.');
  }

  return data;
};

/**
 * POST /api/auth/login
 */
export const loginUser = async (identifier, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, email: identifier, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed.');
  }

  return data;
};

/**
 * GET /api/auth/me
 */
export const getCurrentUser = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch user.');
  }

  return data;
};

/**
 * GET /api/skills
 */
export const getSkills = async () => {
  const response = await fetch(`${API_BASE_URL}/skills`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to load skills.');
  return data.skills || [];
};

/**
 * GET /api/interests
 */
export const getInterests = async () => {
  const response = await fetch(`${API_BASE_URL}/interests`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to load interests.');
  return data.interests || [];
};

/**
 * GET /api/profile
 */
export const getProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch profile.');
  return data;
};

/**
 * PUT /api/profile
 */
export const updateProfile = async (profileData) => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to save profile.');
  return data;
};

/**
 * POST /api/profile/link-college-email
 */
export const linkCollegeEmailApi = async (collegeEmail, collegeOtp) => {
  const response = await fetch(`${API_BASE_URL}/profile/link-college-email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ collegeEmail, collegeOtp }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to link college email.');
  return data;
};

/**
 * DELETE /api/profile/unlink-college-email
 */
export const unlinkCollegeEmailApi = async () => {
  const response = await fetch(`${API_BASE_URL}/profile/unlink-college-email`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to unlink college email.');
  return data;
};

/**
 * Search universities/colleges via ROR v2 Organizations API
 * GET https://api.ror.org/v2/organizations?query={name}
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
  } catch (error) {
    console.error('ROR v2 Organizations API search error:', error);
    return [];
  }
};

/* ==========================================================================
   LINKUP MODULE API ENDPOINTS (PERSON 2)
   ========================================================================== */

/**
 * POST /api/linkups - Create a new Linkup project request
 */
export const createLinkup = async (linkupData) => {
  const response = await fetch(`${API_BASE_URL}/linkups`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(linkupData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create Linkup.');
  return data;
};

/**
 * GET /api/linkups - Discover / Filter Linkups
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

  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch Linkups.');
  return data;
};

/**
 * GET /api/linkups/:id - Get single Linkup details
 */
export const getLinkupById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch Meld details.');
  return data.meld || data.linkup;
};

/**
 * PUT /api/linkups/:id - Update Linkup (Creator ONLY)
 */
export const updateLinkup = async (id, linkupData) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(linkupData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update Linkup.');
  return data;
};

/**
 * DELETE /api/linkups/:id - Delete Linkup (Creator ONLY)
 */
export const deleteLinkup = async (id) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to delete Linkup.');
  return data;
};

/**
 * POST /api/linkups/:linkupId/join - Submit Join Request
 */
export const sendJoinRequest = async (linkupId, message) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${linkupId}/join`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to submit join request.');
  return data;
};

/**
 * GET /api/linkups/:linkupId/requests - View Join Requests (Creator ONLY)
 */
export const getLinkupRequests = async (linkupId) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${linkupId}/requests`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch join requests.');
  return data.requests || [];
};

/**
 * GET /api/linkups/:linkupId/requests - View Join Requests (Creator ONLY)
 */
export const getMeldChatHistory = async (meldId, beforeTimestamp = null) => {
  let url = `${API_BASE_URL}/melds/${meldId}/messages`;
  if (beforeTimestamp) {
    url += `?before=${encodeURIComponent(beforeTimestamp)}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch chat history.');
  return data.messages || [];
};

/**
 * POST /api/join-requests/:requestId/accept - Accept Join Request (Creator ONLY)
 */
export const acceptJoinRequest = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/join-requests/${requestId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to accept candidate.');
  return data;
};

/**
 * POST /api/join-requests/:requestId/reject - Reject Join Request (Creator ONLY)
 */
export const rejectJoinRequest = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/join-requests/${requestId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to reject join request.');
  return data;
};

/**
 * DELETE /api/linkups/:linkupId/members/:userId - Remove Team Member (Creator ONLY)
 */
export const removeTeamMember = async (linkupId, userId) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${linkupId}/members/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to remove team member.');
  return data;
};

/* ==========================================================================
   AI MATCHING ENGINE API ENDPOINTS (PERSON 3)
   ========================================================================== */

/**
 * GET /api/linkups/:linkupId/matches - Fetch Ranked AI Teammate Matches
 */
export const getLinkupMatches = async (linkupId, refresh = false) => {
  const url = `${API_BASE_URL}/linkups/${linkupId}/matches${refresh ? '?refresh=true' : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch AI matches.');
  return data;
};

/**
 * GET /api/users/:userId - Fetch Public Student Profile
 */
export const getPublicUserProfile = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch student profile.');
  return data;
};

/* ==========================================================================
   INVITATIONS & LEAVING API ENDPOINTS
   ========================================================================== */

/**
 * POST /api/linkups/:linkupId/invite - Invite a user to a Linkup
 */
export const inviteToLinkup = async (linkupId, inviteeId) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${linkupId}/invite`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ inviteeId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to send invitation.');
  return data;
};

/**
 * POST /api/linkups/:linkupId/leave - Leave a Linkup
 */
export const leaveLinkup = async (linkupId) => {
  const response = await fetch(`${API_BASE_URL}/linkups/${linkupId}/leave`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to leave Linkup.');
  return data;
};

/**
 * GET /api/invitations - Get pending invitations
 */
export const getUserInvitations = async () => {
  const response = await fetch(`${API_BASE_URL}/invitations`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch invitations.');
  return data;
};

/**
 * POST /api/invitations/:id/respond - Accept or reject invitation
 */
export const respondToInvitation = async (invitationId, action) => {
  const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/respond`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action }), // 'ACCEPTED' or 'REJECTED'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to respond to invitation.');
  return data;
};

// MELD Alias Exports for seamless backward/forward compatibility
export const createMeld = createLinkup;
export const getMelds = getLinkups;
export const getMeldById = getLinkupById;
export const updateMeld = updateLinkup;
export const deleteMeld = deleteLinkup;
export const sendMeldJoinRequest = sendJoinRequest;
export const getMeldRequests = getLinkupRequests;
export const removeMeldMember = removeTeamMember;
export const getMeldMatches = getLinkupMatches;
export const inviteToMeld = inviteToLinkup;
export const leaveMeld = leaveLinkup;

/**
 * GET /api/users/search?q=...&meldId=... - Search platform users/friends to invite
 */
export const searchUsersToInvite = async (query = '', meldId = null) => {
  let url = `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`;
  if (meldId) {
    url += `&meldId=${encodeURIComponent(meldId)}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to search users.');
  return data.users || [];
};

/**
 * GET /api/user/join-requests - Fetch join requests sent by current user
 */
export const getMyJoinRequests = async () => {
  const response = await fetch(`${API_BASE_URL}/user/join-requests`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch your join requests.');
  return data.requests || [];
};

/**
 * DELETE /api/join-requests/:requestId - Cancel a pending join request sent by user
 */
export const cancelJoinRequest = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/join-requests/${requestId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to cancel join request.');
  return data;
};

/**
 * GET /api/notifications - Fetch user notifications and unread count
 */
export const fetchNotificationsApi = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch notifications.');
  return data;
};

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
export const markNotificationReadApi = async (id) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to mark notification as read.');
  return data;
};

/**
 * PUT /api/notifications/read-all - Mark all notifications as read
 */
export const markAllNotificationsReadApi = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to mark all notifications as read.');
  return data;
};

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
export const deleteNotificationApi = async (id) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to delete notification.');
  return data;
};

/**
 * DELETE /api/notifications/clear-all - Clear all notifications
 */
export const clearAllNotificationsApi = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to clear notifications.');
  return data;
};
