const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api') + '/admin';

const getHeaders = () => {
  const token = localStorage.getItem('meld_token') || localStorage.getItem('linkup_token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const getAdminStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch admin statistics.');
  }
  return data.stats;
};

export const getAdminUsers = async (search = '') => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/users${query}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch user list.');
  }
  return data.users;
};

export const deleteAdminUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete user.');
  }
  return data;
};

export const updateAdminUserRole = async (userId, role) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update user role.');
  }
  return data;
};

export const updateAdminUserVerification = async (userId, status) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/verify`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update verification status.');
  }
  return data;
};

export const getAdminMelds = async (search = '', status = '') => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${API_BASE_URL}/melds${query}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch MELD projects.');
  }
  return data.melds;
};

export const deleteAdminMeld = async (meldId) => {
  const response = await fetch(`${API_BASE_URL}/melds/${meldId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete MELD project.');
  }
  return data;
};

export const updateAdminMeldStatus = async (meldId, status) => {
  const response = await fetch(`${API_BASE_URL}/melds/${meldId}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update MELD status.');
  }
  return data;
};
