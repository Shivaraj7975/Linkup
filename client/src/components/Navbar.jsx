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
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Discover', shortLabel: 'Discover', path: '/discover', icon: Compass },
    { label: 'My Melds', shortLabel: 'My Melds', path: '/my-melds', icon: FolderGit2 },
    { label: 'Create Meld', shortLabel: 'Create', path: '/create-meld', icon: PlusCircle },
    { label: 'Invitations & Requests', shortLabel: 'Requests', path: '/invitations', icon: Mail },
    { label: 'Profile', shortLabel: 'Profile', path: '/profile', icon: User },
  ];

  const isProfileIncomplete = isAuthenticated && user?.isProfileComplete === false;

  return (
    <>
      {/* Top Header Navbar */}
      <header className="navbar-container">
        <div className="navbar">
          {/* Brand Logo */}
          <Link to={isProfileIncomplete ? "/onboarding" : "/"} className="brand-logo">
            <div className="brand-icon" style={{ overflow: 'hidden', padding: 0 }}>
              <img
                src="/meld-logo.png"
                alt="MELD Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <span>MELD</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-actions desktop-nav">
            {isProfileIncomplete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="badge badge-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                  Account Setup Required
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-ghost btn-sm"
                  style={{ gap: '0.4rem' }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
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
                      to="/create-meld"
                      className={`btn btn-ghost btn-sm ${location.pathname === '/create-meld' ? 'active-nav-link' : ''}`}
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

                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        className={`btn btn-sm ${location.pathname === '/admin' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)', gap: '0.35rem' }}
                      >
                        <ShieldAlert size={15} color="#f43f5e" />
                        <span>Admin</span>
                      </Link>
                    )}

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
              </>
            )}
          </nav>

          {/* Mobile Top Actions (Profile or Login) */}
          <div className="mobile-top-actions">
            {isProfileIncomplete ? (
              <button
                type="button"
                onClick={logout}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            ) : isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)', gap: '0.3rem' }}
                  >
                    <ShieldAlert size={14} color="#f43f5e" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className={`btn btn-ghost btn-sm ${location.pathname === '/profile' ? 'active-nav-link' : ''}`}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', gap: '0.4rem' }}
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                <LogIn size={14} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Hidden during incomplete onboarding) */}
      {!isProfileIncomplete && (
        <nav className="mobile-bottom-nav">
          {navItems.filter((item) => item.path !== '/profile').map((item) => {
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
                <span className="nav-label">{item.shortLabel || item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
};
