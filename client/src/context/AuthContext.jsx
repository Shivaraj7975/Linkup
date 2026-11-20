import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, loginWithOtpApi, getCurrentUser, SESSION_EXPIRED_EVENT } from '../services/api';
import { disconnectSocket } from '../services/socket';

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

  const clearSession = useCallback(() => {
    localStorage.removeItem(CANONICAL_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

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
    } catch (err) {
      // Only discard the token when the server actually rejected it. A network
      // failure or 5xx during restore must not silently log the user out.
      if (err && (err.status === 401 || err.status === 403)) {
        clearSession();
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Any authenticated request answered with 401 (expired/invalidated JWT)
  // ends the session instead of leaving the UI "logged in" with a dead token.
  useEffect(() => {
    const handleExpired = () => {
      if (!localStorage.getItem(CANONICAL_TOKEN_KEY)) return;
      clearSession();
      navigate('/login', { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [clearSession, navigate]);

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
    clearSession();
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
