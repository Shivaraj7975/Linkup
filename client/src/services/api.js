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
