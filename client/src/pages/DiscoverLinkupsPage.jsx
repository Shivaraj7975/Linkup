import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getLinkups, getSkills } from '../services/api';
import {
  Search,
  Filter,
  Users,
  BadgeCheck,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Web Development',
  'Mobile App Development',
  'AI / Machine Learning',
  'Data Science & Analytics',
  'Cybersecurity',
  'Blockchain & Web3',
  'UI/UX & Product Design',
  'Embedded Systems & IoT',
  'Game Development',
  'Research & Academic',
  'Other',
];

const STATUS_OPTIONS = [
  { label: 'Open (Recruiting)', value: 'OPEN' },
  { label: 'Full', value: 'FULL' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'All Statuses', value: '' },
];

export const DiscoverLinkupsPage = () => {
  const navigate = useNavigate();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('OPEN');
  const [skillFilter, setSkillFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Data & UI State
  const [linkups, setLinkups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allSkills, setAllSkills] = useState([]);

  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = Boolean(
    skillFilter.trim() ||
    selectedCategory !== 'All Categories' ||
    collegeFilter.trim() ||
    availabilityFilter.trim() ||
    (selectedStatus && selectedStatus !== 'OPEN')
  );

  useEffect(() => {
    fetchSkillsList();
  }, []);

  useEffect(() => {
    fetchLinkupProjects();
  }, [selectedCategory, selectedStatus, skillFilter, collegeFilter, availabilityFilter]);

  const fetchSkillsList = async () => {
    try {
      const skillsData = await getSkills();
      setAllSkills(skillsData || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  const fetchLinkupProjects = async (searchOverride) => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (selectedCategory !== 'All Categories') params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (skillFilter.trim()) params.skill = skillFilter.trim();
      if (collegeFilter.trim()) params.college = collegeFilter.trim();
      if (availabilityFilter.trim()) params.availability = availabilityFilter.trim();

      const searchToUse = searchOverride !== undefined ? searchOverride : searchQuery;
      if (searchToUse.trim()) params.search = searchToUse.trim();

      const res = await getLinkups(params);
      if (res.success) {
        setLinkups(res.linkups || []);
      } else {
        setError(res.message || 'Failed to load projects.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch Linkups.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLinkupProjects(searchQuery);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedStatus('OPEN');
    setSkillFilter('');
    setCollegeFilter('');
    setAvailabilityFilter('');
    setShowFilters(false);
    fetchLinkupProjects('');
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container page-content">
        {/* HEADER HERO */}
        <div className="page-header-hero text-center margin-bottom-lg" style={{ padding: '1.5rem 0.5rem 1rem' }}>
          <div className="badge badge-accent margin-bottom-xs">
            <Sparkles size={14} />
            <span>Project Discovery</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '2rem' }}>Discover Student Linkups</h1>
          <p className="hero-subtitle" style={{ fontSize: '0.95rem' }}>
            Find innovative student projects, join cross-functional teams, and showcase your skills.
          </p>

          <div className="margin-top-sm">
            <Link to="/create-linkup" className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>Create a Linkup</span>
            </Link>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="card glass-card search-filters-card margin-bottom-lg" style={{ padding: '1rem 1.25rem' }}>
          <form onSubmit={handleSearchSubmit} className="search-form" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="input-wrapper search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
              <Search size={16} className="input-left-icon" />
              <input
                type="text"
                className="input input-sm"
                style={{ height: '40px', fontSize: '0.875rem' }}
                placeholder="Search projects by title or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    fetchLinkupProjects('');
                  }}
                >
                  &times;
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', width: 'auto' }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ height: '40px', padding: '0 0.9rem', fontSize: '0.85rem', gap: '0.35rem' }}>
                <Search size={14} />
                <span>Search</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${showFilters ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ height: '40px', padding: '0 0.85rem', fontSize: '0.85rem', gap: '0.35rem' }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={14} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span style={{ background: '#22d3ee', width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block' }} />
                )}
              </button>
            </div>
          </form>

          {/* CONDITIONAL FILTER CONTROLS GRID */}
          {showFilters && (
            <div className="filters-grid margin-top-md" style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {/* Skills Filter Input */}
              <div className="filter-item">
                <label className="filter-label">Skills</label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Filter by skill (e.g. React, Python)"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                />
              </div>

              {/* Category Dropdown */}
              <div className="filter-item">
                <label className="filter-label">Category</label>
                <select
                  className="select select-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* College Filter Input */}
              <div className="filter-item">
                <label className="filter-label">College</label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Filter by college (e.g. MIT, Stanford)"
                  value={collegeFilter}
                  onChange={(e) => setCollegeFilter(e.target.value)}
                />
              </div>

              {/* Availability Filter Input */}
              <div className="filter-item">
                <label className="filter-label">Availability</label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Filter by availability (e.g. 5-10 hrs, Flexible)"
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                />
              </div>

              {/* Status Dropdown */}
              <div className="filter-item">
                <label className="filter-label">Status</label>
                <select
                  className="select select-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              <div className="filter-item filter-actions-item">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-ghost btn-sm"
                  style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                  title="Reset all filters"
                >
                  <RefreshCw size={13} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RESULTS FEED */}
        {loading ? (
          <div className="loading-state card glass-card text-center p-xl">
            <RefreshCw size={32} className="spin text-accent margin-bottom-md" />
            <h3>Loading Linkups...</h3>
            <p className="text-muted">Fetching latest student project requests</p>
          </div>
        ) : error ? (
          <div className="card glass-card alert-card text-center p-xl">
            <h3 className="text-danger">Failed to load projects</h3>
            <p className="text-muted margin-bottom-md">{error}</p>
            <button onClick={() => fetchLinkupProjects()} className="btn btn-secondary btn-sm">
              Try Again
            </button>
          </div>
        ) : linkups.length === 0 ? (
          <div className="empty-state card glass-card text-center p-xl">
            <FolderGit2 size={48} className="text-muted margin-bottom-md" />
            <h3>No Linkups Found</h3>
            <p className="text-muted margin-bottom-md">
              No project requests match your current filters or search criteria.
            </p>
            <div className="flex-center gap-md">
              <button onClick={handleClearFilters} className="btn btn-ghost btn-sm">
                Clear Filters
              </button>
              <Link to="/create-linkup" className="btn btn-primary btn-sm">
                <Plus size={16} />
                <span>Create a Linkup</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="linkups-grid">
            {linkups.map((l) => (
              <div
                key={l.id}
                onClick={() => navigate(`/linkups/${l.id}`)}
                className="card glass-card linkup-card interactive-card"
              >
                <div className="card-top-row">
                  <span className="badge badge-category">{l.category}</span>
                  <span
                    className={`badge badge-status ${
                      l.currentStatus === 'OPEN'
                        ? 'status-open'
                        : l.currentStatus === 'FULL'
                        ? 'status-full'
                        : 'status-closed'
                    }`}
                  >
                    {l.currentStatus}
                  </span>
                </div>

                <h2 className="linkup-card-title">{l.title}</h2>

                <p className="linkup-card-desc">
                  {l.description.length > 140
                    ? `${l.description.substring(0, 140)}...`
                    : l.description}
                </p>

                {/* Skills Pills */}
                {l.requiredSkills && l.requiredSkills.length > 0 && (
                  <div className="skills-row margin-bottom-md">
                    {l.requiredSkills.slice(0, 4).map((sk) => (
                      <span key={sk.id || sk.name} className="pill pill-sm">
                        {sk.name}
                      </span>
                    ))}
                    {l.requiredSkills.length > 4 && (
                      <span className="pill pill-sm pill-more">
                        +{l.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="linkup-card-footer">
                  {/* Creator Snippet */}
                  <div className="creator-snippet">
                    <div className="creator-avatar">
                      {l.creator.name ? l.creator.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="creator-details">
                      <div className="creator-name-row">
                        <span className="creator-name">{l.creator.name}</span>
                        {l.creator.verificationStatus === 'VERIFIED' && (
                          <BadgeCheck size={15} className="verified-icon" title="Verified Student" />
                        )}
                      </div>
                      <span className="creator-college">{l.creator.college}</span>
                    </div>
                  </div>

                  {/* Team Capacity & Action */}
                  <div className="team-capacity-tag">
                    <Users size={15} />
                    <span>
                      {l.currentMemberCount} / {l.maxMembers}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
