import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getLinkups, getMyJoinRequests, cancelJoinRequest } from '../services/api';
import { MatchResultsModal } from '../components/MatchResultsModal';
import {
  Rocket,
  Users,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  Clock3,
  Layers,
  Settings,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Code2,
  Loader2,
  ExternalLink,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('joined'); // 'joined' | 'created' | 'requests'
  const [createdLinkups, setCreatedLinkups] = useState([]);
  const [joinedLinkups, setJoinedLinkups] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [cancellingRequestId, setCancellingRequestId] = useState(null);
  const [matchingLinkup, setMatchingLinkup] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchMyLinkups();
  }, [user?.id]);

  const fetchMyLinkups = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch created melds, joined melds, and user's sent requests in parallel
      const [createdRes, joinedRes, requestsRes] = await Promise.all([
        getLinkups({ creatorId: user.id }),
        getLinkups({ memberUserId: user.id }),
        getMyJoinRequests(),
      ]);

      setCreatedLinkups(createdRes.linkups || []);
      setJoinedLinkups(joinedRes.linkups || []);
      setSentRequests(requestsRes || []);
    } catch (err) {
      console.error('Failed to load My Melds:', err);
      setError(err.message || 'Failed to fetch your Melds.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async (e, requestId, meldTitle) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to withdraw your join request for "${meldTitle}"?`)) {
      return;
    }
    try {
      setCancellingRequestId(requestId);
      setActionError('');
      setActionSuccess('');
      await cancelJoinRequest(requestId);
      setActionSuccess(`Join request for "${meldTitle}" withdrawn.`);
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw join request.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setCancellingRequestId(null);
    }
  };

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container dashboard-layout">
          {/* Header Banner */}
          <div
            className="dash-card page-header-hero"
            style={{
              marginBottom: '1.75rem',
              padding: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <FolderGit2 size={24} color="#6366f1" />
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  My Melds
                </h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Manage student project melds you have joined as a member or created as a lead.
              </p>
            </div>

            <Link to="/create-meld" className="btn btn-primary btn-md">
              <Plus size={16} />
              <span>Create a Meld</span>
            </Link>
          </div>

          {/* Segmented Options / Tabs */}
          <div className="segmented-tabs-bar">
            <button
              type="button"
              onClick={() => setActiveTab('joined')}
              className={`segmented-tab-btn ${activeTab === 'joined' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Users size={16} />
              <span>Joined Melds</span>
              <span
                className="segmented-tab-badge"
                style={{
                  background: activeTab === 'joined' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {joinedLinkups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('created')}
              className={`segmented-tab-btn ${activeTab === 'created' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Rocket size={16} />
              <span>Created Melds</span>
              <span
                className="segmented-tab-badge"
                style={{
                  background: activeTab === 'created' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {createdLinkups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`segmented-tab-btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Send size={16} />
              <span>Requests Sent</span>
              <span
                className="segmented-tab-badge"
                style={{
                  background: activeTab === 'requests' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {sentRequests.length}
              </span>
            </button>
          </div>

          {actionSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Tab Content */}
          {loading ? (
            <div className="page-loader" style={{ padding: '4rem 0', minHeight: 'auto' }}>
              <Loader2 size={36} className="spin" color="#6366f1" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading your Melds...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error" style={{ margin: '1rem 0' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : activeTab === 'joined' ? (
            /* JOINED LINKUPS TAB */
            <div>
              {joinedLinkups.length === 0 ? (
                <div className="dash-card text-center" style={{ padding: '3.5rem 1.5rem' }}>
                  <Users size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                    No Joined Melds Yet
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    You haven't joined any project teams yet. Discover open student Melds and submit join requests to collaborate!
                  </p>
                  <Link to="/discover" className="btn btn-primary btn-sm">
                    <ArrowRight size={16} />
                    <span>Discover Open Melds</span>
                  </Link>
                </div>
              ) : (
                <div className="linkups-grid">
                  {joinedLinkups.map((l) => (
                    <div key={l.id} className="card glass-card linkup-card interactive-card" onClick={() => navigate(`/melds/${l.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="card-top-row">
                        <span className="badge badge-category">{l.category}</span>
                        <span className={`badge badge-status ${l.current_status?.toLowerCase() === 'open' ? 'status-open' : 'status-full'}`}>
                          {l.current_status || 'OPEN'}
                        </span>
                      </div>

                      <h3 className="linkup-card-title">{l.title}</h3>
                      <p className="linkup-card-desc">
                        {l.description?.length > 110 ? `${l.description.substring(0, 110)}...` : l.description}
                      </p>

                      {l.requiredSkills && l.requiredSkills.length > 0 && (
                        <div className="skills-row margin-bottom-md">
                          {l.requiredSkills.map((sk, idx) => (
                            <span key={idx} className="tag-pill active pill-sm">
                              {typeof sk === 'object' ? sk.name : sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="linkup-card-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.85rem', marginTop: 'auto' }}>
                        <div className="creator-snippet">
                          <div className="creator-avatar">
                            {l.creator_name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="creator-details">
                            <div className="creator-name-row">
                              <span className="creator-name">{l.creator_name || 'Project Lead'}</span>
                            </div>
                            <span className="creator-college">{l.creator_college || 'University'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/melds/${l.id}`); }}
                          className="btn btn-ghost btn-sm"
                          style={{ gap: '0.35rem' }}
                        >
                          <span>View Details</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'created' ? (
            /* CREATED LINKUPS TAB */
            <div>
              {createdLinkups.length === 0 ? (
                <div className="dash-card text-center" style={{ padding: '3.5rem 1.5rem' }}>
                  <Rocket size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                    No Created Melds Yet
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    You haven't posted any project Melds. Post a project request to find AI-matched student teammates!
                  </p>
                  <Link to="/create-meld" className="btn btn-primary btn-sm">
                    <Plus size={16} />
                    <span>Create a Meld</span>
                  </Link>
                </div>
              ) : (
                <div className="linkups-grid">
                  {createdLinkups.map((l) => (
                    <div key={l.id} className="card glass-card linkup-card interactive-card" onClick={() => navigate(`/melds/${l.id}`)} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                      <div className="card-top-row">
                        <span className="badge badge-category">{l.category}</span>
                        <span className={`badge badge-status ${l.current_status?.toLowerCase() === 'open' ? 'status-open' : 'status-full'}`}>
                          {l.current_status || 'OPEN'}
                        </span>
                      </div>

                      <h3 className="linkup-card-title">{l.title}</h3>
                      <p className="linkup-card-desc">
                        {l.description?.length > 110 ? `${l.description.substring(0, 110)}...` : l.description}
                      </p>

                      {l.requiredSkills && l.requiredSkills.length > 0 && (
                        <div className="skills-row margin-bottom-md">
                          {l.requiredSkills.map((sk, idx) => (
                            <span key={idx} className="tag-pill active pill-sm">
                              {typeof sk === 'object' ? sk.name : sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Created Linkup Action Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          marginTop: 'auto',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                          onClick={(e) => { e.stopPropagation(); setMatchingLinkup({ ...l, isCreator: true }); }}
                        >
                          <Sparkles size={15} />
                          <span>Find My Team</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '0.35rem' }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/melds/${l.id}/edit`); }}
                          >
                            <Pencil size={14} />
                            <span>Edit Details</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '0.35rem' }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/melds/${l.id}/manage`); }}
                          >
                            <Settings size={14} />
                            <span>Manage</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SENT JOIN REQUESTS TAB */
            <div>
              {sentRequests.length === 0 ? (
                <div className="dash-card text-center" style={{ padding: '3.5rem 1.5rem' }}>
                  <Send size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                    No Join Requests Sent
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    You haven't requested to join any student projects. Browse Discover and apply to join teams that need your skills!
                  </p>
                  <Link to="/discover" className="btn btn-primary btn-sm">
                    <Sparkles size={16} />
                    <span>Discover Melds</span>
                  </Link>
                </div>
              ) : (
                <div className="linkups-grid">
                  {sentRequests.map((req) => {
                    const meld = req.meld || {};
                    const isPending = req.status === 'PENDING';
                    const isAccepted = req.status === 'ACCEPTED';
                    const isRejected = req.status === 'REJECTED';

                    return (
                      <div
                        key={req.id}
                        className="card glass-card linkup-card interactive-card"
                        onClick={() => navigate(`/melds/${req.meldId}`)}
                        style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                      >
                        <div className="card-top-row">
                          <span className="badge badge-category">{meld.category || 'General'}</span>
                          {isPending && (
                            <span className="badge badge-warning" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock3 size={12} /> Pending Approval
                            </span>
                          )}
                          {isAccepted && (
                            <span className="badge badge-success" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={12} /> Accepted
                            </span>
                          )}
                          {isRejected && (
                            <span className="badge badge-error" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <XCircle size={12} /> Declined
                            </span>
                          )}
                        </div>

                        <h3 className="linkup-card-title">{meld.title}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Creator: <strong style={{ color: '#fff' }}>{meld.creator?.name}</strong>
                          {meld.creator?.username && (
                            <span style={{ color: 'var(--accent-cyan, #22d3ee)', marginLeft: '0.25rem' }}>
                              @{meld.creator.username}
                            </span>
                          )}
                          {meld.creator?.college && ` • ${meld.creator.college}`}
                        </div>

                        <p className="linkup-card-desc">
                          {meld.description?.length > 110 ? `${meld.description.substring(0, 110)}...` : meld.description}
                        </p>

                        {req.message && (
                          <div style={{
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid #6366f1',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            margin: '0.5rem 0',
                          }}>
                            "{req.message}"
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginTop: 'auto',
                            paddingTop: '0.85rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '0.35rem' }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/melds/${req.meldId}`); }}
                          >
                            <ExternalLink size={14} />
                            <span>View MELD</span>
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', gap: '0.35rem' }}
                              onClick={(e) => handleWithdrawRequest(e, req.id, meld.title || 'MELD')}
                              disabled={cancellingRequestId === req.id}
                            >
                              <Trash2 size={14} />
                              <span>{cancellingRequestId === req.id ? '...' : 'Withdraw'}</span>
                            </button>
                          )}

                          {isAccepted && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ gap: '0.35rem' }}
                              onClick={(e) => { e.stopPropagation(); navigate(`/melds/${req.meldId}`); }}
                            >
                              <Users size={14} />
                              <span>Team Chat</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        {matchingLinkup && (
          <MatchResultsModal
            linkup={matchingLinkup}
            onClose={() => setMatchingLinkup(null)}
          />
        )}
      </main>
    </div>
  );
};
