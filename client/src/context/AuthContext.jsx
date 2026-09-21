import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, loginWithOtpApi, getCurrentUser } from '../services/api';

const CANONICAL_TOKEN_KEY = 'meld_token';
const LEGACY_TOKEN_KEY = 'linkup_token';

/**
 * Safely retrieves canonical token and cleans up legacy duplicate keys
 */
const getStoredToken = () => {
  let token = localStorage.getItem(CANONICAL_TOKEN_KEY);
  if (!token) {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      token = legacy;
      localStorage.setItem(CANONICAL_TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  } else if (localStorage.getItem(LEGACY_TOKEN_KEY)) {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return token;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!token && !!user;

  // Restore session on mount if token exists
  const fetchCurrentUser = useCallback(async () => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      localStorage.removeItem(CANONICAL_TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const register = async (registerData) => {
    const data = await registerUser(registerData);
    localStorage.setItem(CANONICAL_TOKEN_KEY, data.token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(data.token);
    // Fetch full user with isProfileComplete from /me
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const login = async ({ email, username, identifier, password }) => {
    const loginId = identifier || email || username;
    const data = await loginUser(loginId, password);
    localStorage.setItem(CANONICAL_TOKEN_KEY, data.token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(data.token);
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const loginWithOtp = async ({ email, username, identifier, otpCode }) => {
    const loginId = identifier || email || username;
    const data = await loginWithOtpApi(loginId, otpCode);
    localStorage.setItem(CANONICAL_TOKEN_KEY, data.token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(data.token);
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const logout = () => {
    localStorage.removeItem(CANONICAL_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, register, login, loginWithOtp, logout, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
