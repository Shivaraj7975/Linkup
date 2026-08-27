import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', width: '100vw', background: 'var(--bg-body)' }}>
        <Loader2 size={36} className="spin" color="var(--accent-primary)" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/discover" replace />;
  }

  return children ? children : <Outlet />;
};
