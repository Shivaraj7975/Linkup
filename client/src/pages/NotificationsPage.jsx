import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  PartyPopper,
  Trash2,
  CheckCheck,
  ArrowLeft,
  Clock,
  Sparkles,
  Inbox,
  AlertCircle,
  ExternalLink,
  Mail,
} from 'lucide-react';
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
} from '../services/api';

import { getSocket } from '../services/socket';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'UPDATES' | 'MESSAGES'
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadNotifications = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      setError('');
      const data = await fetchNotificationsApi();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);

    const socket = getSocket();
    if (socket) {
      const handleLiveNotification = () => {
        loadNotifications(false);
      };
      socket.on('notification_created', handleLiveNotification);
      return () => {
        socket.off('notification_created', handleLiveNotification);
      };
    }
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setProcessing(true);
      await markAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteNotificationApi(id);
      const targetNotif = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (targetNotif && !targetNotif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      setProcessing(true);
      await clearAllNotificationsApi();
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Helper for relative time
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter notifications according to activeTab (server database already guarantees deduplication)
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.is_read;
    if (activeTab === 'UPDATES') {
      return (
        n.type === 'REQUEST_ACCEPTED' ||
        n.type === 'INVITATION_ACCEPTED' ||
        n.type === 'NEW_JOIN_REQUEST' ||
        n.type === 'NEW_INVITATION'
      );
    }
    if (activeTab === 'MESSAGES') return n.type === 'NEW_CHAT_MESSAGE';
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'REQUEST_ACCEPTED':
      case 'INVITATION_ACCEPTED':
        return <PartyPopper size={20} style={{ color: '#34d399' }} />;
      case 'NEW_JOIN_REQUEST':
      case 'NEW_INVITATION':
        return <Mail size={20} style={{ color: '#38bdf8' }} />;
      case 'NEW_CHAT_MESSAGE':
        return <MessageSquare size={20} style={{ color: '#60a5fa' }} />;
      default:
        return <Bell size={20} style={{ color: '#a78bfa' }} />;
    }
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container page-content">
        <div style={{ marginBottom: '1.25rem' }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ gap: '0.4rem' }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        <div className="card glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          {/* PAGE HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                <Bell size={26} className="text-accent" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="pill pill-primary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.65rem' }}>
                    {unreadCount} New
                  </span>
                )}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem', margin: 0 }}>
                Stay updated on accepted team applications, accepted invites, and new message alerts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleMarkAllAsRead}
                  disabled={processing}
                  style={{ gap: '0.4rem' }}
                >
                  <CheckCheck size={16} />
                  <span>Mark All as Read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444', gap: '0.4rem' }}
                  onClick={() => setShowClearConfirm(true)}
                  disabled={processing}
                >
                  <Trash2 size={16} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="segmented-tabs-bar margin-bottom-md" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('ALL')}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'UNREAD' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('UNREAD')}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'UPDATES' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('UPDATES')}
            >
              Team Updates
            </button>

            <button
              type="button"
              className={`btn btn-ghost btn-sm ${activeTab === 'MESSAGES' ? 'text-accent' : ''}`}
              style={{ borderBottom: activeTab === 'MESSAGES' ? '2px solid var(--accent-primary)' : 'none', borderRadius: '0' }}
              onClick={() => setActiveTab('MESSAGES')}
            >
              Messages
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="alert alert-error margin-bottom-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* NOTIFICATION LIST */}
          {loading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkles size={28} className="spin text-accent margin-bottom-xs" style={{ display: 'block', margin: '0 auto 0.75rem' }} />
              <span>Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-lg)' }}>
              <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                {activeTab === 'UNREAD'
                  ? 'No unread notifications'
                  : activeTab === 'UPDATES'
                  ? 'No team update notifications'
                  : activeTab === 'MESSAGES'
                  ? 'No new message notifications'
                  : 'You have no notifications yet'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                You will receive alerts here when your join request or invitation is accepted, or when new team messages arrive.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="interactive-card"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.15rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    background: notif.is_read ? 'rgba(30, 41, 59, 0.4)' : 'rgba(59, 130, 246, 0.08)',
                    border: notif.is_read ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(59, 130, 246, 0.25)',
                    cursor: notif.link ? 'pointer' : 'default',
                    transition: 'var(--transition-smooth)',
                    position: 'relative',
                  }}
                  onClick={() => handleNotifClick(notif)}
                >
                  {/* ICON AVATAR */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: notif.type === 'NEW_CHAT_MESSAGE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.1rem',
                    }}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* NOTIFICATION CONTENT */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: notif.is_read ? '#cbd5e1' : '#fff' }}>
                        {notif.title}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        <span>View Details</span>
                        <ExternalLink size={12} />
                      </div>
                    )}
                  </div>

                  {/* UNREAD DOT & ACTIONS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center' }}>
                    {!notif.is_read && (
                      <span
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'inline-block',
                          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.3rem 0.45rem', opacity: 0.6 }}
                      title="Delete notification"
                      onClick={(e) => handleDeleteNotif(notif.id, e)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear All Notifications"
        message="Are you sure you want to clear all your notifications? This action cannot be undone."
        confirmText="Clear All"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
};

export default NotificationsPage;
