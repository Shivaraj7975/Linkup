import React, { useState, useEffect } from 'react';
import {
  getUserInvitations,
  respondToInvitation,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
} from '../services/api';
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Send,
  Compass,
  Clock3,
  Users,
  UserPlus,
  ExternalLink,
  FolderGit2,
  BadgeCheck,
  User,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const InvitationsPage = () => {
  const navigate = useNavigate();
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getUserInvitations();
      const data = res.invitations || { received: [], sent: [] };
      setReceivedInvitations(data.received || []);
      setSentInvitations(data.sent || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
      setError(err.message || 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (item, action) => {
    try {
      setActionError('');
      setActionSuccess('');
      setActionLoading(item.invitation_id);

      if (item.type === 'JOIN_REQUEST') {
        if (action === 'ACCEPTED') {
          await acceptJoinRequest(item.invitation_id);
          setActionSuccess('Candidate accepted into team!');
        } else {
          await rejectJoinRequest(item.invitation_id);
          setActionSuccess('Join request rejected.');
        }
      } else {
        await respondToInvitation(item.invitation_id, action);
        setActionSuccess(`Invitation ${action.toLowerCase()} successfully!`);
      }

      await fetchInvitations();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to process request.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (item) => {
    if (!window.confirm(`Are you sure you want to withdraw this request for "${item.title}"?`)) {
      return;
    }
    try {
      setActionError('');
      setActionSuccess('');
      setActionLoading(item.invitation_id);
      await cancelJoinRequest(item.invitation_id);
      setActionSuccess('Join request withdrawn successfully.');
      await fetchInvitations();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw request.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container dashboard-layout center-content" style={{ minHeight: '60vh' }}>
          <Sparkles size={36} className="spin" color="#3b82f6" />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container dashboard-layout">
        {/* Compact Top Header */}
        <div className="invitations-page-header">
          <div>
            <h1 className="invitations-page-title">Invitations & Requests</h1>
            <p className="invitations-page-subtitle">Manage your incoming team invites and project join requests</p>
          </div>
          <Link to="/discover" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
            <Compass size={14} />
            <span>Discover MELDs</span>
          </Link>
        </div>

        {/* 2 Equal Segmented Tabs with plain round brackets */}
        <div className="segmented-tabs-bar" style={{ maxWidth: '360px', width: 'fit-content' }}>
          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === 'received' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('received')}
          >
            <Mail size={15} />
            <span>Received ({receivedInvitations.length})</span>
          </button>

          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('sent')}
          >
            <Send size={15} />
            <span>Sent ({sentInvitations.length})</span>
          </button>
        </div>

        {/* Global Action Alerts */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {actionError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* TAB 1: RECEIVED INVITATIONS & JOIN REQUESTS */}
        {activeTab === 'received' && (
          receivedInvitations.length === 0 && !error ? (
            <div className="glass-card text-center" style={{ padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Mail size={26} color="#3b82f6" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                No Received Invites or Requests
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                You have no pending invitations or incoming join requests at the moment.
              </p>
              <Link to="/discover" className="btn btn-primary btn-sm" style={{ gap: '0.45rem', display: 'inline-flex' }}>
                <Compass size={14} />
                <span>Discover MELDs</span>
              </Link>
            </div>
          ) : (
            <div className="invitations-grid">
              {receivedInvitations.map((inv) => {
                const isJoinRequest = inv.type === 'JOIN_REQUEST';

                return (
                  <div key={`${inv.type}-${inv.invitation_id}`} className="card glass-card invitation-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="invitation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span className={`badge ${isJoinRequest ? 'badge-accent' : 'badge-primary'}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                            {isJoinRequest ? '📩 Join Request' : '✉️ Team Invite'}
                          </span>
                          <span className="badge badge-category" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                            {inv.category}
                          </span>
                        </div>
                        <div className="applicant-name" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {inv.title}
                        </div>
                        <div className="applicant-college" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <span>{isJoinRequest ? 'Applicant:' : 'Invited by:'}</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{inv.inviter_name}</strong>
                          {inv.inviter_username && (
                            <span style={{ color: 'var(--accent-cyan, #22d3ee)' }}>@{inv.inviter_username}</span>
                          )}
                          {inv.inviter_verification_status === 'VERIFIED' && (
                            <BadgeCheck size={14} className="verified-icon" color="#22d3ee" title="Verified Student" />
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/melds/${inv.linkup_id}`}
                        className="btn btn-ghost btn-xs"
                        style={{ color: 'var(--accent-primary)', gap: '0.25rem', padding: '0.25rem 0.5rem' }}
                        title="View MELD Project"
                      >
                        <ExternalLink size={13} />
                        <span>Meld</span>
                      </Link>
                    </div>

                    {/* Introductory Message if Join Request */}
                    {inv.message && (
                      <div style={{
                        marginTop: '0.85rem',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--accent-primary)',
                        border: '1px solid var(--glass-border)',
                        borderLeftWidth: '3px',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                      }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontStyle: 'normal', marginBottom: '0.2rem', fontWeight: 600 }}>
                          Applicant Message:
                        </div>
                        "{inv.message}"
                      </div>
                    )}

                    {!inv.message && inv.description && (
                      <p className="member-bio" style={{ marginTop: '0.75rem', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {inv.description.length > 100
                          ? inv.description.substring(0, 100) + '...'
                          : inv.description}
                      </p>
                    )}

                    {/* Actions Row */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                      {isJoinRequest && inv.inviter_id && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.45rem 0.65rem', gap: '0.3rem', fontSize: '0.8rem' }}
                          onClick={() => navigate(`/users/${inv.inviter_id}`)}
                          title="View Applicant Profile"
                        >
                          <User size={13} />
                          <span>Profile</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, padding: '0.45rem', gap: '0.35rem' }}
                        onClick={() => handleRespond(inv, 'ACCEPTED')}
                        disabled={actionLoading === inv.invitation_id}
                      >
                        {actionLoading === inv.invitation_id ? (
                          <Sparkles size={14} className="spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1, padding: '0.45rem', gap: '0.35rem', color: '#ef4444' }}
                        onClick={() => handleRespond(inv, 'REJECTED')}
                        disabled={actionLoading === inv.invitation_id}
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TAB 2: SENT INVITATIONS & SENT REQUESTS */}
        {activeTab === 'sent' && (
          <div>
            {/* Section Header Banner */}
            <div
              className="card glass-card sent-invites-hero-card"
              style={{
                marginBottom: '1.25rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Outgoing Invites & Requests
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Track pending invitations you sent to peers and join requests you submitted
                  </p>
                </div>
              </div>

              <Link to="/my-melds" className="btn btn-primary btn-sm" style={{ gap: '0.35rem', padding: '0.45rem 0.9rem' }}>
                <FolderGit2 size={14} />
                <span>My MELDs</span>
              </Link>
            </div>

            {sentInvitations.length === 0 && !error ? (
              <div
                className="glass-card text-center"
                style={{
                  padding: '3.5rem 1.5rem',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                  }}
                >
                  <Send size={26} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No Outgoing Invites or Requests
                </h3>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                    maxWidth: '440px',
                    margin: '0 auto 1.5rem',
                    lineHeight: 1.5,
                  }}
                >
                  You haven't sent any invitations or join requests yet.
                </p>
                <Link to="/discover" className="btn btn-primary btn-sm" style={{ gap: '0.45rem', display: 'inline-flex' }}>
                  <Compass size={15} />
                  <span>Discover MELDs</span>
                </Link>
              </div>
            ) : (
              <div className="members-manage-grid">
                {sentInvitations.map((inv) => {
                  const isJoinRequest = inv.type === 'JOIN_REQUEST';

                  return (
                    <div
                      key={`${inv.type}-${inv.invitation_id}`}
                      className="request-item-card sent-invite-card"
                      style={{
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div
                        className="card-top-row"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            className="applicant-avatar"
                            style={{
                              background: isJoinRequest ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)' : 'var(--accent-primary)',
                              width: '40px',
                              height: '40px',
                              fontSize: '0.95rem',
                            }}
                          >
                            {(inv.invitee_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span className={`badge ${isJoinRequest ? 'badge-accent' : 'badge-primary'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                                {isJoinRequest ? 'Join Request' : 'Invite'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                              {isJoinRequest ? `Sent to ${inv.invitee_name} (Creator)` : `Invited ${inv.invitee_name}`}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {inv.invitee_username ? `@${inv.invitee_username}` : inv.invitee_email || 'Direct'}
                            </div>
                          </div>
                        </div>

                        <span
                          className="badge badge-warning"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <Clock3 size={12} />
                          <span>Pending</span>
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid var(--accent-primary)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.2rem',
                            fontWeight: 600,
                          }}
                        >
                          MELD Project:
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {inv.title || 'MELD Project'}
                        </div>
                      </div>

                      {inv.message && (
                        <div style={{
                          marginTop: '0.65rem',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                        }}>
                          "{inv.message}"
                        </div>
                      )}

                      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isJoinRequest ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', gap: '0.3rem', fontSize: '0.8rem' }}
                            onClick={() => handleWithdraw(inv)}
                            disabled={actionLoading === inv.invitation_id}
                          >
                            <Trash2 size={13} />
                            <span>Withdraw</span>
                          </button>
                        ) : <span />}

                        <Link
                          to={`/melds/${inv.linkup_id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ gap: '0.35rem', color: 'var(--accent-primary, #2563eb)' }}
                        >
                          <ExternalLink size={14} />
                          <span>View MELD</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
