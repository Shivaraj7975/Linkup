import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Link2,
  FolderGit2,
  User,
  Compass,
  PlusCircle,
  LogOut,
  LogIn,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'My Melds', path: '/my-melds', icon: FolderGit2 },
    { label: 'Create Meld', path: '/create-linkup', icon: PlusCircle },
    { label: 'Invitations', path: '/invitations', icon: Mail },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Top Header Navbar */}
      <header className="navbar-container">
        <div className="navbar">
          {/* Brand Logo */}
          <Link to="/" className="brand-logo">
            <div className="brand-icon">
              <Link2 size={22} />
            </div>
            <span>MELD</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-actions desktop-nav">
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
                  to="/my-melds"
                  className={`btn btn-ghost btn-sm ${location.pathname === '/my-melds' ? 'active-nav-link' : ''}`}
                >
                  <FolderGit2 size={15} />
                  <span>My Melds</span>
                </Link>

                <Link
                  to="/create-linkup"
                  className={`btn btn-ghost btn-sm ${location.pathname === '/create-linkup' ? 'active-nav-link' : ''}`}
                >
                  <PlusCircle size={15} />
                  <span>Create Meld</span>
                </Link>

                <Link
                  to="/invitations"
                  className={`btn btn-ghost btn-sm ${location.pathname === '/invitations' ? 'active-nav-link' : ''}`}
                >
                  <Mail size={15} />
                  <span>Invitations</span>
                </Link>

                <Link
                  to="/profile"
                  className={`btn btn-ghost btn-sm ${location.pathname === '/profile' ? 'active-nav-link' : ''}`}
                >
                  <User size={15} />
                  <span>Profile</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </>
            )}
          </nav>

          {/* Mobile Top Actions (Profile or Login) */}
          <div className="mobile-top-actions">
            {isAuthenticated ? (
              <Link
                to="/profile"
                className={`btn btn-ghost btn-sm ${location.pathname === '/profile' ? 'active-nav-link' : ''}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', gap: '0.4rem' }}
              >
                <User size={16} />
                <span>Profile</span>
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                <LogIn size={14} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon-wrapper">
                <Icon size={20} />
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
