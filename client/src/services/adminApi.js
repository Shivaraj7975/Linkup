import { sanitizeErrorMessage, notifySessionExpired } from './api';

const getAdminApiBaseUrl = () => {
  let url = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return `${url}/admin`;
};

const API_BASE_URL = getAdminApiBaseUrl();

const getHeaders = () => {
  const token = localStorage.getItem('meld_token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const safeAdminRequest = async (url, options = {}, defaultErrMsg = 'Admin operation failed.') => {
  try {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) notifySessionExpired(options);
    if (!response.ok || !data?.success) {
      const serverMsg = data && (data.message || data.error);
      throw new Error(serverMsg || defaultErrMsg);
    }
    return data;
  } catch (err) {
    throw new Error(sanitizeErrorMessage(err, defaultErrMsg));
  }
};

export const getAdminStats = async () => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/stats`,
    { headers: getHeaders() },
    'Unable to load administrator metrics.'
  );
  return data.stats;
};

export const getAdminUsers = async (search = '') => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await safeAdminRequest(
    `${API_BASE_URL}/users${query}`,
    { headers: getHeaders() },
    'Unable to load user accounts.'
  );
  return data.users;
};

export const deleteAdminUser = async (userId) => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/users/${userId}`,
    { method: 'DELETE', headers: getHeaders() },
    'Unable to remove user account.'
  );
  return data;
};

export const updateAdminUserRole = async (userId, role) => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/users/${userId}/role`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ role }),
    },
    'Unable to update user privileges.'
  );
  return data;
};

export const updateAdminUserVerification = async (userId, status) => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/users/${userId}/verify`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    },
    'Unable to update user verification status.'
  );
  return data;
};

export const getAdminMelds = async (search = '', status = '') => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';

  const data = await safeAdminRequest(
    `${API_BASE_URL}/melds${query}`,
    { headers: getHeaders() },
    'Unable to load projects.'
  );
  return data.melds;
};

export const deleteAdminMeld = async (meldId) => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/melds/${meldId}`,
    { method: 'DELETE', headers: getHeaders() },
    'Unable to delete project.'
  );
  return data;
};

export const updateAdminMeldStatus = async (meldId, status) => {
  const data = await safeAdminRequest(
    `${API_BASE_URL}/melds/${meldId}/status`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    },
    'Unable to update project status.'
  );
  return data;
};
