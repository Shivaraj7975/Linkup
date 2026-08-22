import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getLinkupById, sendJoinRequest, deleteLinkup } from '../services/api';
import {
  Users,
  BadgeCheck,
  Clock,
  Calendar,
  Layers,
  ArrowLeft,
  UserPlus,
  Settings,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

export const LinkupDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Data & Loading State
  const [linkup, setLinkup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Join Request Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinError, setJoinError] = useState('');

  // Delete State
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLinkupDetails();
  }, [id, isAuthenticated]);

  const fetchLinkupDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLinkupById(id);
      if (data) {
        setLinkup(data);
      } else {
        setError('Linkup project not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load Linkup details.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    setSubmittingJoin(true);

    try {
      const res = await sendJoinRequest(id, joinMessage);
      if (res.success) {
        setJoinSuccess('Join request submitted successfully!');
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinSuccess('');
          setJoinMessage('');
          fetchLinkupDetails();
        }, 1200);
      } else {
        setJoinError(res.message || 'Failed to submit join request.');
      }
    } catch (err) {
      setJoinError(err.message || 'An error occurred while sending join request.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleDeleteLinkup = async () => {
    if (!window.confirm('Are you sure you want to delete this Linkup? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteLinkup(id);
      navigate('/discover');
    } catch (err) {
      alert(err.message || 'Failed to delete Linkup.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container page-content text-center p-xl">
          <div className="loading-spinner margin-bottom-md">Loading project details...</div>
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
            <h2 className="text-danger margin-bottom-sm">Error</h2>
            <p className="text-muted margin-bottom-md">{error || 'Linkup not found'}</p>
            <button onClick={() => navigate('/discover')} className="btn btn-primary btn-sm">
              <ArrowLeft size={16} />
              <span>Back to Discover</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  const {
    title,
    description,
    category,
    maxMembers,
    currentStatus,
    commitmentLevel,
    projectDuration,
    requiredSkills = [],
    creator,
    members = [],
    currentMemberCount,
    isCreator,
    isMember,
    userJoinRequestStatus,
  } = linkup;

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container page-content">
        <button onClick={() => navigate('/discover')} className="btn btn-ghost btn-sm margin-bottom-md">
          <ArrowLeft size={16} />
          <span>Back to Discover</span>
        </button>

        <div className="grid-details-layout">
          {/* LEFT COLUMN: PROJECT DETAILS */}
          <div className="details-main">
            <div className="card glass-card margin-bottom-lg">
              {/* Header Row */}
              <div className="card-top-row margin-bottom-sm">
                <span className="badge badge-category">{category}</span>
                <span
                  className={`badge badge-status ${
                    currentStatus === 'OPEN'
                      ? 'status-open'
                      : currentStatus === 'FULL'
                      ? 'status-full'
                      : 'status-closed'
                  }`}
                >
                  {currentStatus}
                </span>
              </div>

              <h1 className="details-title">{title}</h1>

              {/* Meta Stats Row */}
              <div className="details-meta-row margin-bottom-lg">
                <div className="meta-item">
                  <Users size={16} className="text-accent" />
                  <span>
                    <strong>{currentMemberCount}</strong> / {maxMembers} Members
                  </span>
                </div>
                <div className="meta-item">
                  <UserPlus size={16} className="text-accent" />
                  <span>
                    <strong>{Math.max(0, maxMembers - currentMemberCount)}</strong> Open {Math.max(0, maxMembers - currentMemberCount) === 1 ? 'Position' : 'Positions'}
                  </span>
                </div>
                <div className="meta-item">
                  <Clock size={16} className="text-accent" />
                  <span>{commitmentLevel}</span>
                </div>
                <div className="meta-item">
                  <Calendar size={16} className="text-accent" />
                  <span>{projectDuration}</span>
                </div>
              </div>

              {/* Description */}
              <div className="section-block">
                <h3 className="block-title">Project Information</h3>
                <p className="description-text">{description}</p>
              </div>

              {/* Required Roles & Skills */}
              <div className="section-block">
                <h3 className="block-title">Required Roles & Skills</h3>
                {requiredSkills.length > 0 ? (
                  <div className="pills-container">
                    {requiredSkills.map((sk) => (
                      <span key={sk.id || sk.name} className="pill pill-primary">
                        {sk.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted">No specific roles/skills listed.</span>
                )}
              </div>

              {/* ACTION CONTAINER */}
              <div className="details-action-bar margin-top-lg">
                {isCreator ? (
                  <div className="flex-gap-md flex-wrap">
                    <Link to={`/linkups/${id}/manage`} className="btn btn-primary">
                      <Settings size={18} />
                      <span>Manage Join Requests</span>
                    </Link>
                    <button
                      onClick={handleDeleteLinkup}
                      disabled={deleting}
                      className="btn btn-danger btn-ghost"
                    >
                      <Trash2 size={18} />
                      <span>Delete Linkup</span>
                    </button>
                  </div>
                ) : isMember ? (
                  <div className="badge-banner banner-success">
                    <CheckCircle2 size={20} />
                    <span>You are a member of this team!</span>
                  </div>
                ) : userJoinRequestStatus === 'PENDING' ? (
                  <div className="badge-banner banner-info">
                    <Clock3 size={20} />
                    <span>Your join request is PENDING creator approval.</span>
                  </div>
                ) : userJoinRequestStatus === 'REJECTED' ? (
                  <div className="badge-banner banner-warning">
                    <AlertCircle size={20} />
                    <span>Your join request was previously declined by the creator.</span>
                  </div>
                ) : !isAuthenticated ? (
                  <Link to="/login" className="btn btn-primary">
                    <UserPlus size={18} />
                    <span>Log in to Request to Join</span>
                  </Link>
                ) : currentStatus !== 'OPEN' ? (
                  <div className="badge-banner banner-neutral">
                    <AlertCircle size={20} />
                    <span>This Linkup is currently {currentStatus}. Applications are closed.</span>
                  </div>
                ) : (
                  <button onClick={() => setShowJoinModal(true)} className="btn btn-primary btn-lg">
                    <UserPlus size={20} />
                    <span>Request to Join Team</span>
                  </button>
                )}
              </div>
            </div>

            {/* TEAM MEMBERS SECTION */}
            <div className="card glass-card">
              <h3 className="block-title margin-bottom-md">
                Team Members ({members.length} / {maxMembers})
              </h3>
              <div className="members-grid">
                {members.map((m) => (
                  <div key={m.id || m.userId} className="member-card">
                    <div className="member-avatar">
                      {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div className="member-info">
                      <div className="member-name-row">
                        <span className="member-name">{m.name}</span>
                        {m.verificationStatus === 'VERIFIED' && (
                          <BadgeCheck size={14} className="verified-icon" title="Verified Student" />
                        )}
                      </div>
                      <span className="member-college">{m.college}</span>
                      <span className="member-role-badge">{m.role}</span>
                      {m.skills && m.skills.length > 0 && (
                        <div className="member-skills-list">
                          {m.skills.slice(0, 3).map((sk) => (
                            <span key={sk} className="pill pill-xs">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CREATOR PROFILE SIDEBAR */}
          <div className="details-sidebar">
            <div className="card glass-card creator-card">
              <div className="creator-card-header">
                <span className="card-badge">Project Creator</span>
                <div className="creator-large-avatar">
                  {creator.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <h3 className="creator-full-name flex-center gap-xs">
                  <span>{creator.name}</span>
                  {creator.verificationStatus === 'VERIFIED' && (
                    <BadgeCheck size={18} className="verified-icon" title="Verified Student" />
                  )}
                </h3>
                <span className="creator-college-text">{creator.college}</span>
                {creator.degree && (
                  <span className="creator-degree-text">
                    {creator.degree} ({creator.yearOfStudy})
                  </span>
                )}
              </div>

              {creator.bio && (
                <div className="sidebar-block">
                  <h4 className="sidebar-heading">About Creator</h4>
                  <p className="creator-bio">{creator.bio}</p>
                </div>
              )}

              {creator.skills && creator.skills.length > 0 && (
                <div className="sidebar-block">
                  <h4 className="sidebar-heading">Creator Skills</h4>
                  <div className="pills-container">
                    {creator.skills.slice(0, 6).map((sk) => (
                      <span key={sk} className="pill pill-sm">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* JOIN REQUEST MODAL */}
      {showJoinModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card card">
            <div className="modal-header">
              <h2 className="modal-title">Request to Join Linkup</h2>
              <button onClick={() => setShowJoinModal(false)} className="btn-close">
                &times;
              </button>
            </div>

            {joinSuccess ? (
              <div className="alert alert-success margin-y-md">
                <CheckCircle2 size={20} />
                <span>{joinSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="form-stack margin-top-md">
                {joinError && (
                  <div className="alert alert-error">
                    <AlertCircle size={18} />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="joinMessage" className="form-label">
                    Introductory Message to Creator
                  </label>
                  <p className="form-help-text">
                    Tell the creator why you'd like to join, your background, and what skills you bring.
                  </p>
                  <textarea
                    id="joinMessage"
                    className="textarea"
                    rows={4}
                    placeholder="Hi! I'm really excited about this project. I have experience with React and UI design..."
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-actions margin-top-md">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="btn btn-ghost"
                    disabled={submittingJoin}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingJoin}>
                    {submittingJoin ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Join Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
