import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getMatchFilterOptions,
  getEligibleCandidateCount,
  getLinkupMatches,
  inviteToLinkup,
} from '../services/api';
import { PublicProfileModal } from './PublicProfileModal';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  GraduationCap,
  UserX,
  Code2,
  RotateCw,
  MailPlus,
  Briefcase,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  Check,
  Layers,
  AlertTriangle,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-react';

const POOL_THRESHOLDS = {
  ZERO: 0,
  SMALL_WARN_MAX: 2,
  NORMAL_MIN: 3,
};

const DEFAULT_FILTERS = {
  city: '',
  college: '',
  branch: '',
  year: '',
  skills: [],
  skillMatchMode: 'any',
};

export const MatchResultsModal = ({ linkup, meld, onClose }) => {
  const activeMeld = meld || linkup;
  const linkupId = activeMeld?.id;

  // View state: 'INTRO' | 'FILTERS' | 'CONFIRM' | 'RESULTS'
  const [viewMode, setViewMode] = useState('INTRO');

  // Filter states: draft vs applied
  const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
  const [draftFilters, setDraftFilters] = useState({ ...DEFAULT_FILTERS });
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    colleges: [],
    branches: [],
    years: [],
    skills: [],
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  // Candidate pool count state
  const [candidateCount, setCandidateCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);

  // Matchmaking execution state
  const [matches, setMatches] = useState([]);
  const [generatedBy, setGeneratedBy] = useState('AI');
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('RETRIEVING'); // 'RETRIEVING' | 'ANALYZING'
  const [error, setError] = useState('');

  // UI notifications
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  // Load filter options dynamically from backend
  const loadFilterOptions = useCallback(async () => {
    if (!linkupId) return;
    setFilterOptionsLoading(true);
    try {
      const opts = await getMatchFilterOptions(linkupId);
      setFilterOptions({
        cities: opts.cities || [],
        colleges: opts.colleges || [],
        branches: opts.branches || [],
        years: opts.years || [],
        skills: opts.skills || [],
      });
    } catch (err) {
      console.error('Failed to load filter options:', err);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, [linkupId]);

  // Load options initially
  useEffect(() => {
    if (linkupId) {
      loadFilterOptions();
    }
  }, [linkupId, loadFilterOptions]);

  // Helper to check if any filter is active
  const hasActiveFilters = (filters) => {
    return Boolean(
      (filters.city && filters.city.trim()) ||
      (filters.college && filters.college.trim()) ||
      (filters.branch && filters.branch.trim()) ||
      (filters.year && filters.year.trim()) ||
      (Array.isArray(filters.skills) && filters.skills.length > 0)
    );
  };

  // Helper to format active filter summary list
  const getFilterSummaryItems = (filters) => {
    const items = [];
    if (filters.college && filters.college.trim()) items.push(filters.college.trim());
    if (filters.branch && filters.branch.trim()) items.push(filters.branch.trim());
    if (filters.city && filters.city.trim()) items.push(filters.city.trim());
    if (filters.year && filters.year.trim()) items.push(filters.year.trim());
    if (Array.isArray(filters.skills) && filters.skills.length > 0) {
      items.push(`Skills (${filters.skills.length})`);
    }
    return items;
  };

  // Open filter panel
  const handleOpenFilters = () => {
    setDraftFilters({
      city: appliedFilters.city || '',
      college: appliedFilters.college || '',
      branch: appliedFilters.branch || '',
      year: appliedFilters.year || '',
      skills: Array.isArray(appliedFilters.skills) ? [...appliedFilters.skills] : [],
      skillMatchMode: appliedFilters.skillMatchMode || 'any',
    });
    setError('');
    setViewMode('FILTERS');
  };

  // Cancel filter editing and preserve applied state
  const handleCancelFilters = () => {
    setError('');
    if (candidateCount !== null) {
      setViewMode('CONFIRM');
    } else if (matches.length > 0) {
      setViewMode('RESULTS');
    } else {
      setViewMode('INTRO');
    }
  };

  // Toggle skill in draft state
  const handleToggleDraftSkill = (skill) => {
    setDraftFilters((prev) => {
      const currentSkills = Array.isArray(prev.skills) ? prev.skills : [];
      if (currentSkills.includes(skill)) {
        return { ...prev, skills: currentSkills.filter((s) => s !== skill) };
      } else {
        return { ...prev, skills: [...currentSkills, skill] };
      }
    });
  };

  // Clear draft filters to 'Any'
  const handleClearDraftFilters = () => {
    setDraftFilters({ ...DEFAULT_FILTERS });
  };

  // Apply filters: saves state and queries candidate count WITHOUT running AI
  const handleApplyFilters = async () => {
    setError('');
    setCountLoading(true);
    const committedFilters = {
      city: draftFilters.city || '',
      college: draftFilters.college || '',
      branch: draftFilters.branch || '',
      year: draftFilters.year || '',
      skills: Array.isArray(draftFilters.skills) ? [...draftFilters.skills] : [],
      skillMatchMode: draftFilters.skillMatchMode || 'any',
    };

    setAppliedFilters(committedFilters);

    try {
      const count = await getEligibleCandidateCount(linkupId, committedFilters);
      setCandidateCount(count);
      setViewMode('CONFIRM');
    } catch (err) {
      console.error('Failed to get candidate count:', err);
      setError(err.message || 'Failed to calculate candidate pool count.');
    } finally {
      setCountLoading(false);
    }
  };

  // Clear all filters from confirmation view
  const handleClearAllFilters = async () => {
    const emptyFilters = { ...DEFAULT_FILTERS };
    setAppliedFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    setError('');
    setCountLoading(true);

    try {
      const count = await getEligibleCandidateCount(linkupId, emptyFilters);
      setCandidateCount(count);
      setViewMode('CONFIRM');
    } catch (err) {
      console.error('Failed to reset candidate count:', err);
      setError(err.message || 'Failed to update candidate pool count.');
    } finally {
      setCountLoading(false);
    }
  };

  // Execute AI Matchmaking
  const handleRunMatchmaking = async (forceRefresh = false, filtersToUse = appliedFilters) => {
    setLoading(true);
    setError('');
    setLoadingPhase('RETRIEVING');
    setViewMode('RESULTS');

    try {
      const phaseTimer = setTimeout(() => {
        setLoadingPhase('ANALYZING');
      }, 500);

      const data = await getLinkupMatches(linkupId, forceRefresh, filtersToUse);
      clearTimeout(phaseTimer);

      setMatches(data.matches || []);
      setGeneratedBy(data.generatedBy || 'AI');
      setIsCached(data.cached || false);
    } catch (err) {
      console.error('Failed to fetch AI matches:', err);
      setError(err.message || 'Matchmaking couldn’t be completed.');
    } finally {
      setLoading(false);
    }
  };

  // Flow A: Continue with Default
  const handleContinueWithDefault = () => {
    const emptyFilters = { ...DEFAULT_FILTERS };
    setAppliedFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    handleRunMatchmaking(false, emptyFilters);
  };

  // Handle invitation
  const handleInvite = async (e, targetId) => {
    e.stopPropagation();
    if (!targetId) return;

    setActionSuccess('');
    setActionError('');
    try {
      setInvitingId(targetId);
      await inviteToLinkup(linkupId, targetId);
      setActionSuccess('Invitation sent successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to send invitation.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setInvitingId(null);
    }
  };

  if (!linkupId) return null;

  const filterSummaryItems = getFilterSummaryItems(appliedFilters);

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
        <div
          className="modal-card edit-profile-modal match-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header match-modal-header">
            <div className="modal-title-group match-modal-title-group">
              <Sparkles size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h2 style={{ fontSize: '1.15rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Find Your Team
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Team Recommendations for: <strong>{activeMeld?.title || 'MELD Project'}</strong>
                </span>
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body match-modal-body">
            {/* ACTION ALERTS */}
            {actionSuccess && (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <CheckCircle2 size={18} />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <AlertCircle size={18} />
                <span>{actionError}</span>
              </div>
            )}

            {/* ================================================================
                VIEW 1: INTRO (DEFAULT SIMPLE CLEAN STATE)
                ================================================================ */}
            {viewMode === 'INTRO' && !loading && (
              <div className="match-flow-card center-content">
                <div className="match-flow-icon-wrapper">
                  <Sparkles size={30} color="#3b82f6" />
                </div>

                <h3 className="match-flow-title">
                  Find Your Team
                </h3>

                <p className="match-flow-desc">
                  The system will search across eligible MELD users and use AI matchmaking to identify suitable teammates.
                </p>

                <div className="match-flow-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.4rem', fontSize: '0.92rem', gap: '0.45rem' }}
                    onClick={handleContinueWithDefault}
                  >
                    <span>Continue with Default</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.3rem', fontSize: '0.92rem', gap: '0.45rem' }}
                    onClick={handleOpenFilters}
                  >
                    <SlidersHorizontal size={16} />
                    <span>Edit Filters</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================
                VIEW 2: EDIT FILTERS PANEL
                ================================================================ */}
            {viewMode === 'FILTERS' && !loading && (
              <div className="match-flow-card filter-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <h3 className="match-flow-title" style={{ fontSize: '1.15rem', margin: '0 0 0.2rem' }}>
                      Candidate Filters
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Optionally narrow the candidate pool prior to AI matchmaking.
                    </p>
                  </div>
                  {hasActiveFilters(draftFilters) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', flexShrink: 0 }}
                      onClick={handleClearDraftFilters}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="match-filter-grid">
                  {/* City Filter */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <MapPin size={13} color="#3b82f6" />
                      <span>City</span>
                    </label>
                    <select
                      className="input-field"
                      value={draftFilters.city}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, city: e.target.value }))}
                      style={{ fontSize: '0.86rem', padding: '0.5rem 0.75rem', width: '100%' }}
                    >
                      <option value="">Any</option>
                      {filterOptions.cities.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* College Filter */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Building2 size={13} color="#3b82f6" />
                      <span>College</span>
                    </label>
                    <select
                      className="input-field"
                      value={draftFilters.college}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, college: e.target.value }))}
                      style={{ fontSize: '0.86rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Any</option>
                      {filterOptions.colleges.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Branch / Degree Filter */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <GraduationCap size={13} color="#3b82f6" />
                      <span>Branch / Degree</span>
                    </label>
                    <select
                      className="input-field"
                      value={draftFilters.branch}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, branch: e.target.value }))}
                      style={{ fontSize: '0.86rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Any</option>
                      {filterOptions.branches.map((b, idx) => (
                        <option key={idx} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year of Study Filter */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Calendar size={13} color="#3b82f6" />
                      <span>Year</span>
                    </label>
                    <select
                      className="input-field"
                      value={draftFilters.year}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, year: e.target.value }))}
                      style={{ fontSize: '0.86rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Any</option>
                      {filterOptions.years.map((y, idx) => (
                        <option key={idx} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Skills Multi-select Filter */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>
                      <Code2 size={13} color="#3b82f6" />
                      <span>Skills (Candidate has any selected)</span>
                    </label>
                    {draftFilters.skills.length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>
                        {draftFilters.skills.length} selected
                      </span>
                    )}
                  </div>

                  {filterOptions.skills.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No candidate skills available.</p>
                  ) : (
                    <div className="match-skills-filter-container">
                      {filterOptions.skills.map((sk, idx) => {
                        const isSelected = draftFilters.skills.includes(sk);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleDraftSkill(sk)}
                            className={`tag-pill ${isSelected ? 'active' : ''}`}
                            style={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.25rem 0.6rem',
                            }}
                          >
                            {isSelected && <Check size={11} />}
                            <span>{sk}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Filter Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.65rem',
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '1rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleCancelFilters}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.4rem', padding: '0.45rem 1.1rem' }}
                    onClick={handleApplyFilters}
                    disabled={countLoading}
                  >
                    {countLoading ? <Sparkles size={14} className="spin" /> : <Filter size={14} />}
                    <span>Apply Filters</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================
                VIEW 3: CONFIRMATION / APPLIED FILTER STATE (POOL COUNT)
                ================================================================ */}
            {viewMode === 'CONFIRM' && !loading && (
              <div className="match-flow-card center-content">
                {/* Count and Scope Display */}
                {candidateCount === POOL_THRESHOLDS.ZERO ? (
                  /* ZERO CANDIDATES: Block AI execution */
                  <div>
                    <div className="match-flow-icon-wrapper danger">
                      <UserX size={28} color="#f87171" />
                    </div>

                    <h3 className="match-flow-title" style={{ color: '#ef4444' }}>
                      No candidates match your current filters.
                    </h3>

                    <p className="match-flow-desc" style={{ maxWidth: '440px', margin: '0 auto 1.25rem' }}>
                      Try removing one or more filters to expand the candidate pool.
                    </p>
                  </div>
                ) : candidateCount !== null && candidateCount <= POOL_THRESHOLDS.SMALL_WARN_MAX ? (
                  /* 1-2 CANDIDATES: Small pool warning with confirmation option */
                  <div>
                    <div className="match-flow-icon-wrapper warning">
                      <AlertTriangle size={28} color="#f59e0b" />
                    </div>

                    <h3 className="match-flow-title">
                      Only {candidateCount} candidate{candidateCount === 1 ? '' : 's'} match your filters.
                    </h3>

                    <p className="match-flow-desc" style={{ margin: '0 auto 1.25rem' }}>
                      The candidate pool is very small. You can proceed with these candidates or modify your filters.
                    </p>
                  </div>
                ) : (
                  /* 3+ CANDIDATES: Normal Matchmaking Confirmation */
                  <div>
                    <div className="match-flow-icon-wrapper">
                      <Layers size={28} color="#3b82f6" />
                    </div>

                    <h3 className="match-flow-title">
                      {candidateCount} eligible candidate{candidateCount === 1 ? '' : 's'} match your filters
                    </h3>

                    <p className="match-flow-desc" style={{ margin: '0 auto 1.25rem' }}>
                      AI matchmaking will evaluate compatibility among these candidates.
                    </p>
                  </div>
                )}

                {/* Filter Summary Chips */}
                {filterSummaryItems.length > 0 && (
                  <div className="match-summary-chips-box">
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filters:</span>
                    {filterSummaryItems.map((item, idx) => (
                      <span key={idx} className="match-summary-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bottom Action Controls */}
                <div className="match-flow-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem', gap: '0.4rem' }}
                    onClick={handleOpenFilters}
                  >
                    <SlidersHorizontal size={15} />
                    <span>Edit Filters</span>
                  </button>

                  {candidateCount === POOL_THRESHOLDS.ZERO ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1.2rem', fontSize: '0.88rem' }}
                      onClick={handleClearAllFilters}
                    >
                      Clear Filters
                    </button>
                  ) : candidateCount <= POOL_THRESHOLDS.SMALL_WARN_MAX ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1.3rem', fontSize: '0.88rem', gap: '0.4rem' }}
                      onClick={() => handleRunMatchmaking(false)}
                    >
                      <Sparkles size={15} />
                      <span>Continue with {candidateCount} Candidate{candidateCount === 1 ? '' : 's'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem', gap: '0.4rem' }}
                      onClick={() => handleRunMatchmaking(false)}
                    >
                      <Sparkles size={15} />
                      <span>Find My Team</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================
                LOADING STATES (FILTERING VS AI MATCHMAKING)
                ================================================================ */}
            {loading && (
              <div className="ai-loading-container" style={{ padding: '3rem 1.5rem' }}>
                <div className="ai-spinner-wrapper">
                  <Sparkles size={36} className="spin" color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', marginBottom: '0.4rem' }}>
                  {loadingPhase === 'RETRIEVING' ? 'Searching eligible candidates...' : 'Analyzing candidates...'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                  {loadingPhase === 'RETRIEVING'
                    ? 'Applying candidate constraints and retrieving eligible students...'
                    : 'Evaluating skills, role fit, team complement, schedule availability, and project relevance.'}
                </p>
              </div>
            )}

            {/* ================================================================
                ERROR STATE
                ================================================================ */}
            {!loading && error && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.5rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <AlertCircle size={20} />
                  <span style={{ fontWeight: 600 }}>{error}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRunMatchmaking(true)}
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleOpenFilters}
                  >
                    Edit Filters
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================
                VIEW 4: RESULTS VIEW
                ================================================================ */}
            {viewMode === 'RESULTS' && !loading && !error && (
              <>
                {/* Search Context & Engine Indicator Banner */}
                <div className="match-engine-banner">
                  <div className="engine-indicator">
                    <Sparkles size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                    <span className="engine-title-text">Multi-Dimension Compatibility Engine</span>
                    {isCached && (
                      <span className="engine-cached-badge">
                        Cached
                      </span>
                    )}
                  </div>

                  <div className="banner-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', gap: '0.3rem', padding: '0.25rem 0.65rem' }}
                      onClick={handleOpenFilters}
                    >
                      <SlidersHorizontal size={13} />
                      <span>Edit Filters</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', gap: '0.3rem', padding: '0.25rem 0.65rem' }}
                      onClick={() => handleRunMatchmaking(true)}
                      disabled={loading}
                    >
                      <RotateCw size={13} className={loading ? 'spin' : ''} />
                      <span>Refresh</span>
                    </button>

                    <span className="matches-count-badge">
                      {matches.length} Candidates
                    </span>
                  </div>
                </div>

                {/* Filter Context Indicator */}
                {filterSummaryItems.length > 0 && (
                  <div className="match-active-filters-row">
                    <span style={{ fontWeight: 600 }}>Active Filters:</span>
                    {filterSummaryItems.map((item, idx) => (
                      <span key={idx} className="match-filter-summary-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* EMPTY RESULTS STATE */}
                {matches.length === 0 ? (
                  <div className="empty-matches-container">
                    <UserX size={44} color="#94a3b8" />
                    <h3>No Candidate Matches Found</h3>
                    <p>
                      No student candidates matched the required criteria for this MELD. Try adjusting your filters or project requirements.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '0.75rem' }}
                      onClick={handleOpenFilters}
                    >
                      Adjust Filters
                    </button>
                  </div>
                ) : (
                  /* COMPACT 2-COLUMN CANDIDATE MATCH CARDS */
                  <div className="match-cards-list">
                    {matches.map((item, index) => (
                      <div key={item.userId || index} className="candidate-match-card candidate-grid-layout">
                        {/* LEFT COLUMN: Rank, Avatar, and Stacked Name + Details */}
                        <div className="candidate-col-left">
                          <span className="rank-badge">#{index + 1}</span>

                          <div className="candidate-avatar">
                            {item.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>

                          <div className="candidate-info-stack">
                            <h4 className="candidate-name" title={item.name}>
                              {item.name}
                            </h4>

                            <div
                              className="candidate-detail-line candidate-degree-line"
                              title={[item.degree || 'Student', item.yearOfStudy].filter(Boolean).join(' • ')}
                            >
                              <GraduationCap size={12} style={{ flexShrink: 0 }} />
                              <span>
                                {[item.degree || 'Student', item.yearOfStudy].filter(Boolean).join(' • ')}
                              </span>
                            </div>

                            {item.college && (
                              <div
                                className="candidate-detail-line candidate-college-line"
                                title={item.college}
                              >
                                <Building2 size={12} style={{ flexShrink: 0 }} />
                                <span>{item.college}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Badges/Skills on top & Action Buttons Below */}
                        <div className="candidate-col-right">
                          <div className="candidate-badges-skills-row">
                            {item.roleName && (
                              <span className="match-role-badge">
                                <Briefcase size={11} style={{ flexShrink: 0 }} />
                                <span>{item.roleName}</span>
                              </span>
                            )}

                            <span className={`verification-badge ${(item.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                              {item.verificationStatus === 'VERIFIED' ? (
                                <><CheckCircle2 size={11} style={{ flexShrink: 0 }} /> Verified</>
                              ) : (
                                <><AlertCircle size={11} style={{ flexShrink: 0 }} /> Unverified</>
                              )}
                            </span>

                            {item.candidate?.skills && item.candidate.skills.length > 0 && (
                              <div className="candidate-inline-skills">
                                {item.candidate.skills.slice(0, 3).map((sk, sIdx) => (
                                  <span key={sIdx} className="tag-pill sm">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Profile & Invite Buttons in a single row */}
                          <div className="candidate-card-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetId = item.userId || item.id || item.candidate?.userId || item.candidate?.id;
                                if (targetId) setSelectedUserId(targetId);
                              }}
                            >
                              <User size={12} />
                              <span>Profile</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary btn-sm invite-btn"
                              onClick={(e) => {
                                const targetId = item.userId || item.id || item.candidate?.userId || item.candidate?.id;
                                handleInvite(e, targetId);
                              }}
                              disabled={invitingId === (item.userId || item.id || item.candidate?.userId || item.candidate?.id)}
                            >
                              {invitingId === (item.userId || item.id || item.candidate?.userId || item.candidate?.id) ? (
                                <Sparkles size={12} className="spin" />
                              ) : (
                                <MailPlus size={12} />
                              )}
                              <span>Invite</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Public Profile Drawer Modal when clicking Preview */}
      {selectedUserId && (
        <PublicProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>,
    document.body
  );
};
