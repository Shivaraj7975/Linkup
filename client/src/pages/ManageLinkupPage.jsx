import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getLinkupById, getLinkupRequests, acceptJoinRequest, rejectJoinRequest, removeTeamMember } from '../services/api';
import {
  Users,
  BadgeCheck,
  Check,
  X,
  ArrowLeft,
  MessageSquare,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const ManageLinkupPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [linkup, setLinkup] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Processing state for individual requests
  const [processingId, setProcessingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadLinkupAndRequests();
  }, [id]);

  const loadLinkupAndRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const [linkupData, reqsData] = await Promise.all([getLinkupById(id), getLinkupRequests(id)]);
      setLinkup(linkupData);
      setRequests(reqsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load management dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessingId(requestId);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const res = await acceptJoinRequest(requestId);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Candidate successfully accepted into the team!' });
        const [updatedLinkup, updatedReqs] = await Promise.all([getLinkupById(id), getLinkupRequests(id)]);
        setLinkup(updatedLinkup);
        setRequests(updatedReqs || []);
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Failed to accept candidate.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error accepting join request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const res = await rejectJoinRequest(requestId);
      if (res.success) {
        setFeedbackMsg({ type: 'info', text: 'Join request rejected.' });
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'REJECTED' } : r))
        );
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Failed to reject request.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error rejecting join request.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    setFeedbackMsg({ type: '', text: '' });
    try {
      const res = await removeTeamMember(id, memberUserId);
      if (res.success) {
        setFeedbackMsg({ type: 'info', text: `${memberName} was removed from the team.` });
        const [updatedLinkup, updatedReqs] = await Promise.all([getLinkupById(id), getLinkupRequests(id)]);
        setLinkup(updatedLinkup);
        setRequests(updatedReqs || []);
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Failed to remove team member.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error removing team member.' });
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container page-content text-center p-xl">
          <RefreshCw size={32} className="spin text-accent margin-bottom-md" />
          <h3>Loading Linkup Management Dashboard...</h3>
        </main>
      </div>
    );
  }

  if (error || !linkup) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container page-content">
          <div className="card glass-card text-center p-xl">
            <h3 className="text-danger margin-bottom-sm">Access Denied or Not Found</h3>
            <p className="text-muted margin-bottom-md">{error || 'Linkup not found.'}</p>
            <button onClick={() => navigate('/discover')} className="btn btn-primary btn-sm">
              <ArrowLeft size={16} />
              <span>Back to Discover</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pastRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container page-content">
        <button onClick={() => navigate(`/linkups/${id}`)} className="btn btn-ghost btn-sm margin-bottom-md">
          <ArrowLeft size={16} />
          <span>Back to Linkup Page</span>
        </button>

        {/* DASHBOARD TITLE CARD */}
        <div className="card glass-card margin-bottom-lg">
          <div className="card-top-row">
            <span className="badge badge-category">{linkup.category}</span>
            <span
              className={`badge badge-status ${
                linkup.currentStatus === 'OPEN'
                  ? 'status-open'
                  : linkup.currentStatus === 'FULL'
                  ? 'status-full'
                  : 'status-closed'
              }`}
            >
              {linkup.currentStatus}
            </span>
          </div>

          <h1 className="card-title">Manage Linkup: {linkup.title}</h1>
          <p className="card-subtitle">
            Review applicant join requests, evaluate candidate profiles, and form your team.
          </p>

          <div className="meta-stats-bar margin-top-md">
            <div className="stat-pill">
              <Users size={16} />
              <span>
                Team Capacity: <strong>{linkup.currentMemberCount} / {linkup.maxMembers}</strong>
              </span>
            </div>
            <div className="stat-pill">
              <Clock size={16} />
              <span>
                Pending Requests: <strong>{pendingRequests.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* FEEDBACK TOAST/ALERT */}
        {feedbackMsg.text && (
          <div
            className={`alert margin-bottom-lg ${
              feedbackMsg.type === 'success'
                ? 'alert-success'
                : feedbackMsg.type === 'info'
                ? 'alert-info'
                : 'alert-error'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* SECTION 1: PENDING JOIN REQUESTS */}
        <div className="card glass-card margin-bottom-lg">
          <h2 className="section-title margin-bottom-md flex-center-between">
            <span>Pending Join Requests ({pendingRequests.length})</span>
          </h2>

          {pendingRequests.length === 0 ? (
            <div className="empty-section p-lg text-center">
              <MessageSquare size={32} className="text-muted margin-bottom-xs" />
              <p className="text-muted">No pending join requests at the moment.</p>
            </div>
          ) : (
            <div className="requests-stack">
              {pendingRequests.map((req) => {
                const app = req.applicant || {};
                return (
                  <div key={req.id} className="request-item-card card">
                    <div className="request-card-header">
                      <div className="applicant-profile-snippet">
                        <div className="applicant-avatar">
                          {app.name ? app.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="applicant-details">
                          <div className="applicant-name-row">
                            <h3 className="applicant-name">{app.name}</h3>
                            {app.verificationStatus === 'VERIFIED' && (
                              <BadgeCheck size={16} className="verified-icon" title="Verified Student" />
                            )}
                          </div>
                          <span className="applicant-college">{app.college}</span>
                          {app.degree && (
                            <span className="applicant-sub-text">
                              {app.degree} ({app.yearOfStudy})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="request-actions">
                        <button
                          onClick={() => handleAccept(req.id)}
                          disabled={processingId === req.id || linkup.currentMemberCount >= linkup.maxMembers}
                          className="btn btn-success btn-sm"
                          title="Accept candidate into team"
                        >
                          <Check size={16} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                          className="btn btn-danger btn-ghost btn-sm"
                          title="Reject request"
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Join Message */}
                    {req.message && (
                      <div className="join-message-box">
                        <span className="message-label">Applicant's Message:</span>
                        <p className="message-text">"{req.message}"</p>
                      </div>
                    )}

                    {/* Skills & Availability */}
                    <div className="applicant-extra-grid">
                      {app.skills && app.skills.length > 0 && (
                        <div className="extra-group">
                          <span className="extra-label">Skills:</span>
                          <div className="pills-container">
                            {app.skills.map((sk) => (
                              <span key={sk} className="pill pill-sm">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {app.interests && app.interests.length > 0 && (
                        <div className="extra-group">
                          <span className="extra-label">Interests:</span>
                          <div className="pills-container">
                            {app.interests.map((intr) => (
                              <span key={intr} className="pill pill-sm pill-neutral">
                                {intr}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {app.availability && (
                        <div className="extra-group">
                          <span className="extra-label">Availability:</span>
                          <span className="availability-text">{app.availability}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: CURRENT TEAM MEMBERS */}
        <div className="card glass-card margin-bottom-lg">
          <h2 className="section-title margin-bottom-md">
            Current Team Members ({linkup.members.length} / {linkup.maxMembers})
          </h2>

          <div className="members-manage-grid">
            {linkup.members.map((m) => (
              <div key={m.id || m.userId} className="member-manage-card card flex-center-between">
                <div className="flex-center gap-md">
                  <div className="member-avatar-lg">
                    {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="member-manage-details">
                    <div className="member-name-row">
                      <h4 className="member-name">{m.name}</h4>
                      {m.verificationStatus === 'VERIFIED' && (
                        <BadgeCheck size={16} className="verified-icon" title="Verified Student" />
                      )}
                    </div>
                    <span className="member-college">{m.college}</span>
                    <span className="member-role-badge margin-y-xs">{m.role}</span>

                    {m.skills && m.skills.length > 0 && (
                      <div className="pills-container margin-top-xs">
                        {m.skills.slice(0, 4).map((sk) => (
                          <span key={sk} className="pill pill-xs">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {m.userId !== linkup.creatorId && (
                  <button
                    onClick={() => handleRemoveMember(m.userId, m.name)}
                    className="btn btn-danger btn-ghost btn-sm"
                    title={`Remove ${m.name} from team`}
                  >
                    <Trash2 size={15} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PAST REQUESTS HISTORY (IF ANY) */}
        {pastRequests.length > 0 && (
          <div className="card glass-card">
            <h3 className="section-title margin-bottom-md text-muted">Past Requests History</h3>
            <div className="past-requests-list">
              {pastRequests.map((r) => (
                <div key={r.id} className="past-request-item flex-center-between">
                  <div>
                    <span className="past-applicant-name">{r.applicant?.name || 'Applicant'}</span>
                    <span className="past-college"> ({r.applicant?.college})</span>
                  </div>
                  <span
                    className={`badge ${
                      r.status === 'ACCEPTED' ? 'badge-success' : 'badge-neutral'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
