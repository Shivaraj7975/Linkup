import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getLinkups } from '../services/api';
import { MatchResultsModal } from '../components/MatchResultsModal';
import {
  Rocket,
  Users,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  Settings,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Code2,
  Loader2,
  ExternalLink,
  Pencil,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('joined'); // 'joined' | 'created'
  const [createdLinkups, setCreatedLinkups] = useState([]);
  const [joinedLinkups, setJoinedLinkups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchingLinkup, setMatchingLinkup] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchMyLinkups();
  }, [user?.id]);

  const fetchMyLinkups = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both created and joined linkups in parallel
      const [createdRes, joinedRes] = await Promise.all([
        getLinkups({ creatorId: user.id }),
        getLinkups({ memberUserId: user.id }),
      ]);

      setCreatedLinkups(createdRes.linkups || []);
      setJoinedLinkups(joinedRes.linkups || []);
    } catch (err) {
      console.error('Failed to load My Linkups:', err);
      setError(err.message || 'Failed to fetch your Linkups.');
    } finally {
      setLoading(false);
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
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '2rem',
              background: 'rgba(15, 22, 41, 0.6)',
              padding: '0.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              width: 'fit-content',
              maxWidth: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('joined')}
              className={`btn btn-sm ${activeTab === 'joined' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1.25rem',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <Users size={16} />
              <span>Joined Melds</span>
              <span
                style={{
                  background: activeTab === 'joined' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {joinedLinkups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('created')}
              className={`btn btn-sm ${activeTab === 'created' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1.25rem',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <Rocket size={16} />
              <span>Created Melds</span>
              <span
                style={{
                  background: activeTab === 'created' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {createdLinkups.length}
              </span>
            </button>
          </div>

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
          ) : (
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
