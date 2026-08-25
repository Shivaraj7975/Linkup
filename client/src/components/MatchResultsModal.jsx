import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLinkupMatches, inviteToLinkup } from '../services/api';
import { PublicProfileModal } from './PublicProfileModal';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  User,
  UserPlus,
  Loader2,
  GraduationCap,
  Award,
  Zap,
  UserX,
  Code2,
  Clock,
  RotateCw,
  Database,
  MailPlus,
} from 'lucide-react';

export const MatchResultsModal = ({ linkup, meld, onClose }) => {
  const navigate = useNavigate();
  const activeMeld = meld || linkup;
  const [matches, setMatches] = useState([]);
  const [generatedBy, setGeneratedBy] = useState('AI');
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [invitingId, setInvitingId] = useState(null); // Track which user is being invited

  const linkupId = activeMeld?.id;
  const isCreator = activeMeld?.isCreator || false;

  const fetchMatches = async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await getLinkupMatches(linkupId, forceRefresh);
      setMatches(data.matches || []);
      setGeneratedBy(data.generatedBy || 'AI');
      setIsCached(data.cached || false);
    } catch (err) {
      console.error('Failed to fetch AI matches:', err);
      setError(err.message || 'Failed to analyze candidate matches.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e, targetId) => {
    e.stopPropagation();
    if (!targetId) return;
    
    setActionSuccess('');
    setActionError('');
    try {
      setInvitingId(targetId);
      await inviteToLinkup(linkup.id, targetId);
      setActionSuccess('Invitation sent successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to send invitation.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setInvitingId(null);
    }
  };

  useEffect(() => {
    if (linkupId) fetchMatches(false);
  }, [linkupId]);

  if (!linkupId) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card edit-profile-modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '780px', maxHeight: '88vh' }}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <div className="modal-title-group">
              <Sparkles size={22} color="#a855f7" />
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0 }}>AI Teammate Matches</h2>
                <span className="api-attribution" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Matching candidates for: <strong>{linkup?.title || 'Linkup Project'}</strong>
                </span>
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn">
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body auth-form" style={{ gap: '1rem' }}>
            {/* Engine Indicator Banner */}
            {!loading && !error && (
              <div className="match-engine-banner">
                <div className="engine-indicator">
                  <Sparkles size={16} color="#a855f7" />
                  <span>AI Teammate Compatibility Matcher</span>
                </div>

                <div className="banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.78rem', gap: '0.3rem', padding: '0.25rem 0.65rem' }}
                    onClick={() => fetchMatches(true)}
                    disabled={loading}
                  >
                    <RotateCw size={13} className={loading ? 'spin' : ''} />
                    <span>Refresh Matches</span>
                  </button>

                  <span className="matches-count-badge">{matches.length} Candidates</span>
                </div>
              </div>
            )}

            {/* ACTION ALERTS */}
            {actionSuccess && (
              <div className="alert alert-success" style={{ margin: '0 2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="alert alert-error" style={{ margin: '0 2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{actionError}</span>
              </div>
            )}

            {/* LOADING STATE */}
            {loading && (
              <div className="ai-loading-container">
                <div className="ai-spinner-wrapper">
                  <Sparkles size={36} className="spin" color="#a855f7" />
                </div>
                <h3>Analyzing potential teammates...</h3>
                <p>Evaluating required skills, domain interests, and availability compatibility via AI Matching Engine.</p>
              </div>
            )}

            {/* ERROR STATE */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && matches.length === 0 && (
              <div className="empty-matches-container">
                <UserX size={44} color="#94a3b8" />
                <h3>No Candidate Matches Found</h3>
                <p>
                  No student candidates matched the required criteria for this Linkup. Try adjusting your required skills or project category to broaden candidate discovery.
                </p>
              </div>
            )}

            {/* RANKED CANDIDATE MATCH CARDS */}
            {!loading && !error && matches.length > 0 && (
              <div className="match-cards-list">
                {matches.map((item, index) => {
                  const pct = item.matchPercentage || 0;
                  let badgeClass = 'low';
                  if (pct >= 80) badgeClass = 'high';
                  else if (pct >= 50) badgeClass = 'medium';

                  return (
                    <div key={item.userId || index} className="candidate-match-card">
                      {/* Card Top Row: Rank, Match % Badge, Verification */}
                      <div className="candidate-card-header">
                        <div className="candidate-rank-group">
                          <span className="rank-badge">#{index + 1}</span>
                          <span className={`match-pct-badge ${badgeClass}`}>
                            <Award size={15} />
                            {pct}% MATCH
                          </span>
                        </div>

                        <span className={`verification-badge ${(item.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                          {item.verificationStatus === 'VERIFIED' ? (
                            <><CheckCircle2 size={13} /> Verified Student</>
                          ) : (
                            <><AlertCircle size={13} /> Unverified Student</>
                          )}
                        </span>
                      </div>

                      {/* Candidate Main Info */}
                      <div className="candidate-main-info">
                        <div className="user-avatar-large" style={{ width: '46px', height: '46px', fontSize: '1.2rem' }}>
                          {item.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>

                        <div className="candidate-details">
                          <h4 className="candidate-name">{item.name}</h4>
                          <p className="candidate-subtitle">
                            <GraduationCap size={14} />
                            <span>{item.degree || 'Student'}</span>
                            {item.college && (
                              <>
                                <span className="dot-divider">•</span>
                                <span>{item.college}</span>
                              </>
                            )}
                            {item.yearOfStudy && (
                              <>
                                <span className="dot-divider">•</span>
                                <span>{item.yearOfStudy}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Match Reasons List (2 to 3 reasons) */}
                      {item.reasons && item.reasons.length > 0 && (
                        <div className="match-reasons-box">
                          <span className="reasons-header-label">Match Analysis:</span>
                          <ul className="reasons-list">
                            {item.reasons.slice(0, 3).map((reason, rIdx) => (
                              <li key={rIdx} className="reason-item">
                                <CheckCircle2 size={14} className="reason-check-icon" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skills Tags */}
                      {item.candidate?.skills && item.candidate.skills.length > 0 && (
                        <div className="candidate-skills-row">
                          <Code2 size={14} color="#a855f7" style={{ marginTop: 3 }} />
                          <div className="pill-tags compact">
                            {item.candidate.skills.slice(0, 5).map((sk, sIdx) => (
                              <span key={sIdx} className="tag-pill active sm">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="candidate-card-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetId = item.userId || item.id || item.candidate?.userId || item.candidate?.id;
                            if (targetId) setSelectedUserId(targetId);
                          }}
                        >
                          <Eye size={14} />
                          <span>View Profile Preview</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetId = item.userId || item.id || item.candidate?.userId || item.candidate?.id;
                            if (targetId) navigate(`/users/${targetId}`);
                          }}
                        >
                          <User size={14} />
                          <span>View Profile</span>
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: 'auto', background: 'rgba(99, 102, 241, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                          onClick={(e) => {
                            const targetId = item.userId || item.id || item.candidate?.userId || item.candidate?.id;
                            handleInvite(e, targetId);
                          }}
                          disabled={invitingId === (item.userId || item.id || item.candidate?.userId || item.candidate?.id)}
                        >
                          {invitingId === (item.userId || item.id || item.candidate?.userId || item.candidate?.id) ? (
                            <Sparkles size={14} className="spin" />
                          ) : (
                            <MailPlus size={14} />
                          )}
                          <span>Invite to MELD</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Public Profile Drawer Modal when clicking View Profile */}
      {selectedUserId && (
        <PublicProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
};
