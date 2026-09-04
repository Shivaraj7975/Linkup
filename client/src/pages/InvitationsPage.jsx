import React, { useState, useEffect } from 'react';
import {
  getUserInvitations,
  respondToInvitation,
  getMyJoinRequests,
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
  Trash2,
  HelpCircle,
  Check,
  FolderGit2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const InvitationsPage = () => {
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [mySentRequests, setMySentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'my-requests' | 'sent'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [invitationsRes, requestsRes] = await Promise.all([
        getUserInvitations(),
        getMyJoinRequests(),
      ]);

      const invData = invitationsRes.invitations || { received: [], sent: [] };
      setReceivedInvitations(invData.received || []);
      setSentInvitations(invData.sent || []);
      setMySentRequests(requestsRes || []);
    } catch (err) {
      console.error('Failed to load invitations and requests:', err);
      setError(err.message || 'Failed to load invitations and requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitationId, action) => {
    try {
      setActionError('');
      setActionSuccess('');
      setActionLoading(invitationId);
      await respondToInvitation(invitationId, action);
      setActionSuccess(`Invitation ${action.toLowerCase()} successfully!`);
      await fetchAllData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to process invitation.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawRequest = async (requestId, meldTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw your join request for "${meldTitle}"?`)) {
      return;
    }

    try {
      setCancellingId(requestId);
      setActionError('');
      setActionSuccess('');
      await cancelJoinRequest(requestId);
      setActionSuccess(`Join request for "${meldTitle}" withdrawn.`);
      setMySentRequests((prev) => prev.filter((r) => r.id !== requestId));
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw join request.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        <Navbar />
        <main className="container dashboard-layout center-content" style={{ minHeight: '60vh' }}>
          <Sparkles size={36} className="spin" color="#6366f1" />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container dashboard-layout">
        {/* Compact Top Header */}
        <div className="invitations-page-header">
          <div>
            <h1 className="invitations-page-title">Requests & Invites</h1>
            <p className="invitations-page-subtitle">Track your invitations, applications, and team requests</p>
          </div>
          <Link to="/discover" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
            <Compass size={14} />
            <span>Discover MELDs</span>
          </Link>
        </div>

        {/* 3-Column Equal Segmented Tab Bar */}
        <div className="segmented-tabs-bar three-tabs">
          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === 'received' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('received')}
            title="Invitations sent to you"
          >
            <Mail size={15} />
            <span className="tab-label-full">Received</span>
            <span className="tab-label-short">Received</span>
            <span
              className="segmented-tab-badge"
              style={{
                background: activeTab === 'received' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {receivedInvitations.length}
            </span>
          </button>

          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === 'my-requests' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('my-requests')}
            title="Requests you sent to join MELDs"
          >
            <Send size={15} />
            <span className="tab-label-full">My Requests</span>
            <span className="tab-label-short">Requests</span>
            <span
              className="segmented-tab-badge"
              style={{
                background: activeTab === 'my-requests' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {mySentRequests.length}
            </span>
          </button>

          <button
            type="button"
            className={`segmented-tab-btn tab-third-section ${activeTab === 'sent' ? 'btn-primary active-third' : 'btn-ghost'}`}
            onClick={() => setActiveTab('sent')}
            title="Invitations you sent to teammates"
          >
            <UserPlus size={15} />
            <span className="tab-label-full">Sent Invites</span>
            <span className="tab-label-short">Invites</span>
            <span
              className="segmented-tab-badge badge-third-highlight"
              style={{
                background: activeTab === 'sent' ? 'rgba(255,255,255,0.28)' : undefined,
              }}
            >
              {sentInvitations.length}
            </span>
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

        {/* TAB 1: RECEIVED INVITATIONS */}
        {activeTab === 'received' && (
          receivedInvitations.length === 0 && !error ? (
            <div className="glass-card text-center" style={{ padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(99, 102, 241, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }}>
                <Mail size={26} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                No Received Invitations
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                You haven't received any team invitations recently. Browse project melds and discover teams to join!
              </p>
              <Link to="/discover" className="btn btn-primary btn-md" style={{ gap: '0.45rem', display: 'inline-flex' }}>
                <Compass size={16} />
                <span>Discover MELDs</span>
              </Link>
            </div>
          ) : (
            <div className="members-manage-grid">
              {receivedInvitations.map((inv) => (
                <div key={inv.invitation_id} className="request-item-card">
                  <div className="card-top-row">
                    <div>
                      <div className="applicant-name">{inv.title}</div>
                      <div className="applicant-college">Invited by: {inv.inviter_name}</div>
                    </div>
                    <div className="badge-primary">{inv.category}</div>
                  </div>
                  <p className="member-bio" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                    {inv.description && inv.description.length > 100
                      ? inv.description.substring(0, 100) + '...'
                      : inv.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem' }}
                      onClick={() => handleRespond(inv.invitation_id, 'ACCEPTED')}
                      disabled={actionLoading === inv.invitation_id}
                    >
                      {actionLoading === inv.invitation_id ? (
                        <Sparkles size={16} className="spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ flex: 1, padding: '0.5rem' }}
                      onClick={() => handleRespond(inv.invitation_id, 'REJECTED')}
                      disabled={actionLoading === inv.invitation_id}
                    >
                      <XCircle size={16} />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 2: REQUESTS SENT TO MELDS (MY APPLICATIONS) */}
        {activeTab === 'my-requests' && (
          mySentRequests.length === 0 && !error ? (
            <div className="glass-card text-center" style={{ padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(6, 182, 212, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)' }}>
                <Send size={26} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                No Join Requests Sent
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                You haven't requested to join any MELDs yet. Browse student projects and send an application to collaborate!
              </p>
              <Link to="/discover" className="btn btn-primary btn-md" style={{ gap: '0.45rem', display: 'inline-flex' }}>
                <Compass size={16} />
                <span>Browse Projects</span>
              </Link>
            </div>
          ) : (
            <div className="members-manage-grid">
              {mySentRequests.map((req) => {
                const meld = req.meld || {};
                const isPending = req.status === 'PENDING';
                const isAccepted = req.status === 'ACCEPTED';
                const isRejected = req.status === 'REJECTED';

                return (
                  <div key={req.id} className="request-item-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Row: Title, Category, and Status */}
                      <div className="card-top-row">
                        <div>
                          <Link
                            to={`/melds/${req.meldId}`}
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              display: 'inline-block',
                              marginBottom: '0.2rem',
                            }}
                          >
                            {meld.title || 'MELD Project'}
                          </Link>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Led by <span style={{ color: '#fff', fontWeight: 600 }}>{meld.creator?.name || 'Creator'}</span>
                            {meld.creator?.username && (
                              <span style={{ color: 'var(--accent-cyan, #22d3ee)', marginLeft: '0.3rem' }}>
                                @{meld.creator.username}
                              </span>
                            )}
                            {meld.creator?.college && ` • ${meld.creator.college}`}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending && (
                            <span
                              className="badge badge-warning"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              <Clock3 size={13} />
                              Pending Approval
                            </span>
                          )}
                          {isAccepted && (
                            <span
                              className="badge badge-success"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Accepted
                            </span>
                          )}
                          {isRejected && (
                            <span
                              className="badge badge-error"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              <XCircle size={13} />
                              Declined
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meld Meta */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-category" style={{ fontSize: '0.72rem' }}>
                          {meld.category || 'General'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Team Size: {meld.currentMemberCount || 0}/{meld.maxMembers || 0}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • Applied: {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Applicant Message */}
                      {req.message && (
                        <div
                          style={{
                            marginTop: '0.9rem',
                            padding: '0.65rem 0.85rem',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid #6366f1',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                          }}
                        >
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem', alignItems: 'center' }}>
                      <Link
                        to={`/melds/${req.meldId}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, gap: '0.35rem', justifyContent: 'center' }}
                      >
                        <ExternalLink size={14} />
                        <span>View MELD</span>
                      </Link>

                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444', gap: '0.35rem' }}
                          onClick={() => handleWithdrawRequest(req.id, meld.title || 'MELD')}
                          disabled={cancellingId === req.id}
                          title="Cancel your pending application"
                        >
                          <Trash2 size={14} />
                          <span>{cancellingId === req.id ? 'Withdrawing...' : 'Withdraw'}</span>
                        </button>
                      )}

                      {isAccepted && (
                        <Link
                          to={`/melds/${req.meldId}`}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '0.35rem' }}
                        >
                          <Users size={14} />
                          <span>Team Chat</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TAB 3: INVITATIONS SENT TO FRIENDS / TEAMMATES */}
        {activeTab === 'sent' && (
          <div>
            {/* Eye-catching Section Header Banner */}
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
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.55) 0%, rgba(15, 23, 42, 0.75) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Teammate Invitations Sent
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    Track pending invitations you sent to peers to join your MELDs
                  </p>
                </div>
              </div>

              <Link to="/my-melds" className="btn btn-primary btn-sm" style={{ gap: '0.35rem', padding: '0.45rem 0.9rem' }}>
                <FolderGit2 size={14} />
                <span>Invite from My MELDs</span>
              </Link>
            </div>

            {sentInvitations.length === 0 && !error ? (
              <div
                className="glass-card text-center"
                style={{
                  padding: '3.5rem 1.5rem',
                  border: '1px dashed rgba(139, 92, 246, 0.35)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.25))',
                    border: '1px solid rgba(167, 139, 250, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    boxShadow: '0 0 24px rgba(99, 102, 241, 0.25)',
                  }}
                >
                  <UserPlus size={28} color="#c4b5fd" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No Teammate Invites Sent
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
                  You haven't sent any direct invitations yet. Open any MELD you created or manage, click "Invite Friends", and invite students to your team!
                </p>
                <Link to="/my-melds" className="btn btn-primary btn-md" style={{ gap: '0.45rem', display: 'inline-flex' }}>
                  <FolderGit2 size={16} />
                  <span>Go to My MELDs</span>
                </Link>
              </div>
            ) : (
              <div className="members-manage-grid">
                {sentInvitations.map((inv) => (
                  <div
                    key={inv.invitation_id}
                    className="request-item-card sent-invite-card"
                    style={{
                      border: '1px solid rgba(139, 92, 246, 0.28)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      background: 'rgba(15, 22, 41, 0.65)',
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
                            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            width: '42px',
                            height: '42px',
                            fontSize: '1rem',
                          }}
                        >
                          {(inv.invitee_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {inv.invitee_name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {inv.invitee_email || 'Direct Invite'}
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
                        <span>Awaiting Response</span>
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid #8b5cf6',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '0.2rem',
                        }}
                      >
                        Invited to MELD:
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f1f5f9' }}>
                        {inv.title || 'MELD Project'}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/melds/${inv.linkup_id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ gap: '0.35rem', color: '#c4b5fd' }}
                      >
                        <ExternalLink size={14} />
                        <span>View MELD</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
