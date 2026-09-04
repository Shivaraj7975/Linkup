import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getLinkupById, sendJoinRequest, deleteLinkup, leaveLinkup } from '../services/api';
import { MatchResultsModal } from '../components/MatchResultsModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MeldChat } from '../components/MeldChat';
import { ShareMeldModal } from '../components/ShareMeldModal';
import { InviteFriendsModal } from '../components/InviteFriendsModal';
import {
  Users,
  User,
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
  Sparkles,
  Pencil,
  Lock,
  Share2,
} from 'lucide-react';

export const MeldDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  const handleDeleteLinkup = () => {
    setShowDeleteConfirm(true);
  };

  const executeDeleteLinkup = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    setActionError('');
    try {
      await deleteLinkup(id);
      navigate('/discover');
    } catch (err) {
      setActionError(err.message || 'Failed to delete Meld.');
      setTimeout(() => setActionError(''), 4000);
      setDeleting(false);
    }
  };

  const handleLeaveLinkup = async () => {
    if (!window.confirm("Are you sure you want to leave this MELD?")) return;
    try {
      setLeaving(true);
      setActionError('');
      await leaveLinkup(id);
      setActionSuccess('You have left the MELD.');
      await fetchLinkupDetails(); // refresh details
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to leave MELD.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setLeaving(false);
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
            <p className="text-muted margin-bottom-md">{error || 'Meld not found'}</p>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={() => navigate('/discover')} className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} />
            <span>Back to Discover</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowShareModal(true)}
              style={{ gap: '0.4rem' }}
              title="Share MELD link"
            >
              <Share2 size={16} />
              <span>Share Link</span>
            </button>
            {(isCreator || isMember) && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowInviteModal(true)}
                style={{ gap: '0.4rem' }}
                title="Invite friends to this MELD"
              >
                <UserPlus size={16} />
                <span>Invite Friends</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs margin-bottom-lg" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn btn-ghost ${activeTab === 'overview' ? 'text-accent' : ''}`}
            style={{ borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : 'none', borderRadius: '0' }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          
          <button
            className={`btn btn-ghost ${activeTab === 'chat' ? 'text-accent' : ''}`}
            style={{ borderBottom: activeTab === 'chat' ? '2px solid var(--accent-primary)' : 'none', borderRadius: '0' }}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} style={{ marginRight: '0.4rem' }} />
            Text
          </button>
        </div>

        {activeTab === 'chat' ? (
          <div className="chat-container">
            {isCreator || isMember ? (
              <MeldChat meldId={id} currentUser={user} />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '650px',
                backgroundColor: 'var(--bg-card, rgba(30, 41, 59, 0.5))',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-card, rgba(30, 41, 59, 0.5))'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} style={{ color: 'var(--accent-primary, #3b82f6)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Team Discussion</h3>
                  </div>
                  <span className="badge badge-status status-closed" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                    <Lock size={12} /> Members Only
                  </span>
                </div>

                {/* Empty Chat Screen with Callout */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.06) 0%, transparent 70%)'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary, #60a5fa)',
                    marginBottom: '1.25rem',
                    boxShadow: '0 0 24px rgba(59, 130, 246, 0.15)'
                  }}>
                    <Lock size={28} />
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    Team Text is Reserved for MELD Members
                  </h3>
                  <p style={{ maxWidth: '460px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                    You are not yet a member of this MELD. Join this team to participate in discussions, collaborate with teammates, and send messages.
                  </p>

                  {/* Actions to join MELD */}
                  {userJoinRequestStatus === 'PENDING' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="badge-banner banner-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-full)' }}>
                        <Clock3 size={18} />
                        <span>Your request to join this MELD is pending creator approval.</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={16} />
                        <span>Share MELD with Friends</span>
                      </button>
                    </div>
                  ) : userJoinRequestStatus === 'REJECTED' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="badge-banner banner-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-full)' }}>
                        <AlertCircle size={18} />
                        <span>Your join request was previously declined by the creator.</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={16} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  ) : !isAuthenticated ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Link to="/login" className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}>
                        <UserPlus size={18} />
                        <span>Log in to Join MELD</span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={16} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  ) : currentStatus !== 'OPEN' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="badge-banner banner-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-full)' }}>
                        <AlertCircle size={18} />
                        <span>This MELD is currently {currentStatus}. Applications are closed.</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={16} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={() => setShowJoinModal(true)}
                        style={{ gap: '0.5rem', padding: '0.75rem 1.75rem', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)' }}
                      >
                        <UserPlus size={18} />
                        <span>Join MELD to Involve in Text</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-lg"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={18} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Disabled Message Bar at Bottom */}
                <div style={{
                  borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  backgroundColor: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
                }}>
                  <div style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    color: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    borderBottom: '1px solid rgba(245, 158, 11, 0.15)'
                  }}>
                    <Lock size={13} />
                    <span>Message bar is disabled. You must join this MELD to participate in the text chat.</span>
                  </div>

                  <div style={{
                    padding: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Join this MELD to involve in the text chat..."
                      disabled={true}
                      style={{
                        flex: 1,
                        borderRadius: 'var(--radius-full)',
                        cursor: 'not-allowed',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--text-muted)'
                      }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      disabled={true}
                      style={{
                        borderRadius: 'var(--radius-full)',
                        padding: '0.5rem 1rem',
                        cursor: 'not-allowed',
                        opacity: 0.5
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
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

              {/* ACTION ALERTS */}
              {actionSuccess && (
                <div className="alert alert-success" style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="alert alert-error" style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />
                  <span>{actionError}</span>
                </div>
              )}

              {/* ACTION CONTAINER */}
              <div className="details-action-bar margin-top-lg">
                {isCreator ? (
                  <div className="flex-gap-md flex-wrap" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowMatchModal(true)}
                    >
                      <Sparkles size={18} />
                      <span>Find My Team</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowInviteModal(true)}
                      style={{ gap: '0.4rem' }}
                    >
                      <UserPlus size={18} />
                      <span>Invite Friends</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowShareModal(true)}
                      style={{ gap: '0.4rem' }}
                    >
                      <Share2 size={18} />
                      <span>Share MELD</span>
                    </button>
                    <Link to={`/melds/${id}/edit`} className="btn btn-secondary" style={{ gap: '0.4rem' }}>
                      <Pencil size={18} />
                      <span>Edit Meld Details</span>
                    </Link>
                    <Link to={`/melds/${id}/manage`} className="btn btn-ghost">
                      <Settings size={18} />
                      <span>Manage Join Requests</span>
                    </Link>
                    <button
                      onClick={handleDeleteLinkup}
                      disabled={deleting}
                      className="btn btn-danger btn-ghost"
                    >
                      <Trash2 size={18} />
                      <span>Delete MELD</span>
                    </button>
                  </div>
                ) : isMember ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div className="badge-banner banner-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <CheckCircle2 size={20} />
                        <span>You are a member of this team!</span>
                      </div>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={handleLeaveLinkup}
                        disabled={leaving}
                      >
                        <span>{leaving ? 'Leaving...' : 'Leave MELD'}</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowInviteModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <UserPlus size={16} />
                        <span>Invite Friends</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={16} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  </div>
                ) : userJoinRequestStatus === 'PENDING' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div className="badge-banner banner-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock3 size={20} />
                      <span>Your join request is PENDING creator approval.</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={18} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  </div>
                ) : userJoinRequestStatus === 'REJECTED' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div className="badge-banner banner-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={20} />
                      <span>Your join request was previously declined by the creator.</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={18} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  </div>
                ) : !isAuthenticated ? (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/login" className="btn btn-primary">
                      <UserPlus size={18} />
                      <span>Log in to Request to Join</span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowShareModal(true)}
                      style={{ gap: '0.4rem' }}
                    >
                      <Share2 size={18} />
                      <span>Share MELD</span>
                    </button>
                  </div>
                ) : currentStatus !== 'OPEN' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div className="badge-banner banner-neutral" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={20} />
                      <span>This Linkup is currently {currentStatus}. Applications are closed.</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowShareModal(true)}
                        style={{ gap: '0.4rem' }}
                      >
                        <Share2 size={18} />
                        <span>Share MELD</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => setShowJoinModal(true)} className="btn btn-primary btn-lg">
                      <UserPlus size={20} />
                      <span>Request to Join Team</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-lg"
                      onClick={() => setShowShareModal(true)}
                      style={{ gap: '0.4rem' }}
                    >
                      <Share2 size={18} />
                      <span>Share MELD</span>
                    </button>
                  </div>
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
                  <div
                    key={m.id || m.userId}
                    className="member-card interactive-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/users/${m.userId || m.id}`)}
                    title={`Click to view ${m.name}'s profile`}
                  >
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
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginTop: '0.4rem', gap: '0.25rem', width: 'fit-content' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/users/${m.userId || m.id}`);
                        }}
                      >
                        <User size={12} />
                        <span>View Profile</span>
                      </button>
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
                <div
                  className="creator-large-avatar"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/users/${creator?.userId || creator?.id || linkup?.creatorId}`)}
                  title={`Click to view ${creator?.name}'s profile`}
                >
                  {creator?.name ? creator.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <h3
                  className="creator-full-name flex-center gap-xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/users/${creator?.userId || creator?.id || linkup?.creatorId}`)}
                >
                  <span>{creator?.name}</span>
                  {creator?.verificationStatus === 'VERIFIED' && (
                    <BadgeCheck size={18} className="verified-icon" title="Verified Student" />
                  )}
                </h3>
                <span className="creator-college-text">{creator?.college}</span>
                {creator?.degree && (
                  <span className="creator-degree-text">
                    {creator.degree} ({creator.yearOfStudy})
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.82rem', gap: '0.35rem' }}
                  onClick={() => navigate(`/users/${creator?.userId || creator?.id || linkup?.creatorId}`)}
                >
                  <User size={14} />
                  <span>View Creator Profile</span>
                </button>
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
        )}
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

      {showMatchModal && (
        <MatchResultsModal
          linkup={{ ...linkup, isCreator }}
          onClose={() => setShowMatchModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Meld"
        message="Are you sure you want to delete this Meld? This action cannot be undone."
        confirmText="Delete Meld"
        onConfirm={executeDeleteLinkup}
        onCancel={() => setShowDeleteConfirm(false)}
        isDangerous={true}
      />

      {showShareModal && (
        <ShareMeldModal
          meld={linkup}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showInviteModal && (
        <InviteFriendsModal
          meld={linkup}
          onClose={() => setShowInviteModal(false)}
          onInvitationSent={(invitedUser) => {
            setActionSuccess(`Invitation sent to ${invitedUser.name}!`);
          }}
        />
      )}
    </div>
  );
};
