import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { registerUser, loginUser, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('linkup_token'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Restore session on mount if token exists
  const fetchCurrentUser = useCallback(async () => {
    const stored = localStorage.getItem('linkup_token');
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
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

  const register = async ({ name, email, password }) => {
    const data = await registerUser(name, email, password);
    localStorage.setItem('linkup_token', data.token);
    setToken(data.token);
    // Fetch full user with isProfileComplete from /me
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const login = async ({ email, password }) => {
    const data = await loginUser(email, password);
    localStorage.setItem('linkup_token', data.token);
    setToken(data.token);
    const meData = await getCurrentUser();
    setUser(meData.user);
    return meData.user;
  };

  const logout = () => {
    localStorage.removeItem('linkup_token');
    setToken(null);
    setUser(null);
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
