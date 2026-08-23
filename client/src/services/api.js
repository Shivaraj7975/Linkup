/**
 * API Service for communicating with Linkup Express Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get stored JWT token from localStorage
 */
const getToken = () => localStorage.getItem('linkup_token');

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
      error: error.message || 'Failed to connect to Linkup backend API',
    };
  }
};

/**
 * POST /api/auth/register
 */
export const registerUser = async (name, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
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
export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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
  if (!response.ok) throw new Error(data.message || 'Failed to fetch Linkup details.');
  return data.linkup;
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

