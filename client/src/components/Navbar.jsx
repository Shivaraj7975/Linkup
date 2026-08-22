import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Link2, LayoutDashboard, User, Compass, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="navbar">
      <Link to="/" className="brand-logo">
        <div className="brand-icon">
          <Link2 size={22} />
        </div>
        <span>Linkup</span>
      </Link>

      <nav className="nav-actions">
        <Link
          to="/discover"
          className={`btn btn-ghost btn-sm ${location.pathname === '/discover' ? 'active-nav-link' : ''}`}
        >
          <Compass size={15} />
          <span>Discover</span>
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className={`btn btn-ghost btn-sm ${location.pathname === '/dashboard' ? 'active-nav-link' : ''}`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/create-linkup"
              className={`btn btn-ghost btn-sm ${location.pathname === '/create-linkup' ? 'active-nav-link' : ''}`}
            >
              <PlusCircle size={15} />
              <span>Create Linkup</span>
            </Link>

            <Link
              to="/profile"
              className={`btn btn-ghost btn-sm ${location.pathname === '/profile' ? 'active-nav-link' : ''}`}
            >
              <User size={15} />
              <span>Profile</span>
            </Link>

            <span className="nav-greeting">Hi, {user?.name?.split(' ')[0]}</span>
            
            <button onClick={logout} className="btn btn-ghost btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </>
        )}
      </nav>
    </header>
  );
};
