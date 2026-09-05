import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('meld_token') || localStorage.getItem('linkup_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!token && !!user;

  // Restore session on mount if token exists
  const fetchCurrentUser = useCallback(async () => {
    const stored = localStorage.getItem('meld_token') || localStorage.getItem('linkup_token');
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      localStorage.removeItem('meld_token');
      localStorage.removeItem('linkup_token');
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
    localStorage.setItem('meld_token', data.token);
    localStorage.setItem('linkup_token', data.token);
    setToken(data.token);
    // Fetch full user with isProfileComplete from /me
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const login = async ({ email, username, identifier, password }) => {
    const loginId = identifier || email || username;
    const data = await loginUser(loginId, password);
    localStorage.setItem('meld_token', data.token);
    setToken(data.token);
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const logout = () => {
    localStorage.removeItem('meld_token');
    localStorage.removeItem('linkup_token');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, register, login, logout, fetchCurrentUser }}>
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
