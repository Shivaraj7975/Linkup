import React, { useState, useEffect } from 'react';
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
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchNotificationsApi } from '../services/api';
import { getSocket } from '../services/socket';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      fetchNotificationsApi()
        .then((data) => {
          if (isMounted) setUnreadCount(data.unreadCount || 0);
        })
        .catch((err) => console.warn('Failed to load notification badge count:', err.message));

      // Listen for live socket notification events
      const socket = getSocket();
      if (socket) {
        const handleNotifCreated = () => {
          if (isMounted) {
            setUnreadCount((prev) => prev + 1);
          }
        };
        socket.on('notification_created', handleNotifCreated);
        return () => {
          isMounted = false;
          socket.off('notification_created', handleNotifCreated);
        };
      }
    } else {
      setUnreadCount(0);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  const navItems = [
    { label: 'Discover', shortLabel: 'Discover', path: '/discover', icon: Compass },
    { label: 'My Melds', shortLabel: 'My Melds', path: '/my-melds', icon: FolderGit2 },
    { label: 'Create Meld', shortLabel: 'Create', path: '/create-meld', icon: PlusCircle },
    { label: 'Invitations', shortLabel: 'Invitations', path: '/invitations', icon: Mail },
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
                  onClick={toggleTheme}
                  className="btn btn-ghost btn-sm theme-toggle-btn"
                  title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                  aria-label="Toggle theme"
                  style={{ padding: '0.45rem 0.65rem' }}
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
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

                    <Link
                      to="/notifications"
                      className={`btn btn-ghost btn-sm ${location.pathname === '/notifications' ? 'active-nav-link' : ''}`}
                      style={{ position: 'relative' }}
                      title="Notifications"
                    >
                      <Bell size={15} />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '50%',
                            padding: '0.12rem 0.35rem',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            lineHeight: 1,
                            boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                          }}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
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

                    {/* Theme Switch Option before Profile */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="btn btn-ghost btn-sm theme-toggle-btn"
                      title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                      aria-label="Toggle theme"
                      style={{ padding: '0.45rem 0.65rem' }}
                    >
                      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>

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
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="btn btn-ghost btn-sm theme-toggle-btn"
                      title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                      aria-label="Toggle theme"
                      style={{ padding: '0.45rem 0.65rem' }}
                    >
                      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                    <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                    <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Mobile Top Actions (Theme Toggle & Profile or Login) */}
          <div className="mobile-top-actions">
            {/* Mobile Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost mobile-nav-btn theme-toggle-btn"
              title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {isProfileIncomplete ? (
              <button
                type="button"
                onClick={logout}
                className="btn btn-ghost mobile-nav-btn"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/notifications"
                  className={`btn btn-ghost mobile-nav-btn ${location.pathname === '/notifications' ? 'active-nav-link' : ''}`}
                  style={{ position: 'relative' }}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
                      }}
                    />
                  )}
                </Link>

                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="btn btn-ghost mobile-nav-btn"
                    style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                  >
                    <ShieldAlert size={16} color="#f43f5e" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className={`btn btn-ghost mobile-nav-btn ${location.pathname === '/profile' ? 'active-nav-link' : ''}`}
                >
                  <User size={18} />
                </Link>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary mobile-nav-btn">
                <LogIn size={16} />
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
