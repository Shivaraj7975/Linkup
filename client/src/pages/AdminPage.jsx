import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import {
  ShieldAlert,
  Users,
  FolderGit2,
  BadgeCheck,
  Trash2,
  Search,
  RotateCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Mail,
  Lock,
  ExternalLink,
  ChevronRight,
  User,
} from 'lucide-react';
import {
  getAdminStats,
  getAdminUsers,
  deleteAdminUser,
  updateAdminUserRole,
  updateAdminUserVerification,
  getAdminMelds,
  deleteAdminMeld,
  updateAdminMeldStatus,
} from '../services/adminApi';

export const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('melds'); // 'melds' | 'users' | 'system'

  // Dashboard Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // MELDs State
  const [melds, setMelds] = useState([]);
  const [meldsLoading, setMeldsLoading] = useState(false);
  const [meldSearch, setMeldSearch] = useState('');
  const [meldFilterStatus, setMeldFilterStatus] = useState('');

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Messages
  const [alertSuccess, setAlertSuccess] = useState('');
  const [alertError, setAlertError] = useState('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setAlertError(err.message || 'Failed to fetch admin metrics.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMelds = async () => {
    setMeldsLoading(true);
    try {
      const data = await getAdminMelds(meldSearch, meldFilterStatus);
      setMelds(data);
    } catch (err) {
      setAlertError(err.message || 'Failed to fetch MELD list.');
    } finally {
      setMeldsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getAdminUsers(userSearch);
      setUsers(data);
    } catch (err) {
      setAlertError(err.message || 'Failed to fetch user list.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMelds();
    fetchUsers();
  }, []);

  const handleMeldSearch = (e) => {
    e.preventDefault();
    fetchMelds();
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleStatusChange = async (meldId, newStatus) => {
    try {
      setAlertSuccess('');
      setAlertError('');
      await updateAdminMeldStatus(meldId, newStatus);
      setAlertSuccess(`MELD status updated to "${newStatus}".`);
      fetchMelds();
      fetchStats();
    } catch (err) {
      setAlertError(err.message || 'Failed to update MELD status.');
    }
  };

  const handleDeleteMeld = async (meldId, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete MELD "${title}"?`)) {
      return;
    }
    try {
      setAlertSuccess('');
      setAlertError('');
      await deleteAdminMeld(meldId);
      setAlertSuccess(`MELD project "${title}" deleted.`);
      fetchMelds();
      fetchStats();
    } catch (err) {
      setAlertError(err.message || 'Failed to delete MELD.');
    }
  };

  const handleToggleVerification = async (userId, currentStatus, userName) => {
    const nextStatus = currentStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED';
    try {
      setAlertSuccess('');
      setAlertError('');
      await updateAdminUserVerification(userId, nextStatus);
      setAlertSuccess(`User "${userName}" verification status set to ${nextStatus}.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setAlertError(err.message || 'Failed to update verification status.');
    }
  };

  const handleToggleRole = async (userId, currentRole, userName) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change role of user "${userName}" from ${currentRole} to ${nextRole}?`)) {
      return;
    }
    try {
      setAlertSuccess('');
      setAlertError('');
      await updateAdminUserRole(userId, nextRole);
      setAlertSuccess(`User "${userName}" role updated to ${nextRole}.`);
      fetchUsers();
    } catch (err) {
      setAlertError(err.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId, userName, userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}" (${userEmail})? This cannot be undone.`)) {
      return;
    }
    try {
      setAlertSuccess('');
      setAlertError('');
      await deleteAdminUser(userId);
      setAlertSuccess(`User account for "${userName}" deleted.`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setAlertError(err.message || 'Failed to delete user account.');
    }
  };

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container page-content">
        {/* HEADER HERO */}
        <section className="dash-card page-header-hero admin-hero-card margin-bottom-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="badge badge-accent margin-bottom-xs" style={{ display: 'inline-flex', gap: '0.4rem' }}>
                <ShieldAlert size={14} color="#f43f5e" />
                <span>Admin Control Center</span>
              </div>
              <h1 className="admin-hero-title">
                Platform Management & Oversight
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
                Manage MELD projects, user roles, student verification badges, and system health metrics.
              </p>
            </div>

            <button
              onClick={() => {
                fetchStats();
                fetchMelds();
                fetchUsers();
              }}
              className="btn btn-ghost btn-sm"
              style={{ gap: '0.4rem' }}
            >
              <RotateCw size={15} />
              <span>Refresh Control Panel</span>
            </button>
          </div>

          {/* STATS METRICS ROW */}
          <div className="landing-stats-row" style={{ marginTop: '2rem' }}>
            <div className="landing-stat-item">
              <Users size={28} color="#6366f1" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
                  {statsLoading ? '...' : stats?.totalUsers || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Users</div>
              </div>
            </div>

            <div className="landing-stat-item">
              <FolderGit2 size={28} color="#a855f7" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
                  {statsLoading ? '...' : `${stats?.openMelds || 0} / ${stats?.totalMelds || 0}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Open / Total MELDs</div>
              </div>
            </div>

            <div className="landing-stat-item">
              <BadgeCheck size={28} color="#22c55e" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
                  {statsLoading ? '...' : `${stats?.verifiedPercentage || 0}%`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verified Students Ratio</div>
              </div>
            </div>

            <div className="landing-stat-item">
              <Mail size={28} color="#38bdf8" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
                  {statsLoading ? '...' : stats?.totalInvitations || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Team Invitations</div>
              </div>
            </div>
          </div>
        </section>

        {/* ALERTS */}
        {alertSuccess && (
          <div className="alert alert-success margin-bottom-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{alertSuccess}</span>
          </div>
        )}

        {alertError && (
          <div className="alert alert-error margin-bottom-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{alertError}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="admin-tabs-nav">
          <button
            className={`btn ${activeTab === 'melds' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ gap: '0.5rem', fontSize: '0.9rem' }}
            onClick={() => setActiveTab('melds')}
          >
            <FolderGit2 size={16} />
            <span>Manage MELDs ({melds.length})</span>
          </button>

          <button
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ gap: '0.5rem', fontSize: '0.9rem' }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            <span>User Accounts ({users.length})</span>
          </button>

          <button
            className={`btn ${activeTab === 'system' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ gap: '0.5rem', fontSize: '0.9rem' }}
            onClick={() => setActiveTab('system')}
          >
            <Cpu size={16} />
            <span>AI Engine & System Health</span>
          </button>
        </div>

        {/* TAB 1: MELDS MANAGEMENT */}
        {activeTab === 'melds' && (
          <div className="card glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                MELD Projects Control
              </h2>

              <form onSubmit={handleMeldSearch} className="admin-search-bar">
                <select
                  className="input-field"
                  style={{ width: '130px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                  value={meldFilterStatus}
                  onChange={(e) => setMeldFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="FULL">FULL</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <div className="search-input-wrapper" style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search MELD title..."
                    style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', fontSize: '0.85rem' }}
                    value={meldSearch}
                    onChange={(e) => setMeldSearch(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>

                <button type="submit" className="btn btn-primary btn-sm">Filter</button>
              </form>
            </div>

            {meldsLoading ? (
              <div className="text-center padding-y-lg"><div className="loading-spinner" /></div>
            ) : melds.length === 0 ? (
              <div className="text-center padding-y-lg text-muted">No MELD projects found matching query.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>MELD Project Title</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Creator</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Members</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {melds.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'var(--transition-smooth)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{m.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {new Date(m.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="pill pill-xs">{m.category}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ color: '#cbd5e1' }}>{m.creatorName || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.creatorEmail}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 700, color: '#fff' }}>{m.memberCount}</span> / {m.maxMembers}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            className="input-field"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-xs)',
                              color: m.currentStatus === 'OPEN' ? '#34d399' : m.currentStatus === 'FULL' ? '#f59e0b' : '#ef4444',
                              borderColor: 'rgba(255, 255, 255, 0.15)',
                            }}
                            value={m.currentStatus}
                            onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="FULL">FULL</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => navigate(`/melds/${m.id}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', gap: '0.2rem' }}
                              title="View project details"
                            >
                              <ExternalLink size={13} />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDeleteMeld(m.id, m.title)}
                              className="btn btn-danger btn-ghost btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', gap: '0.2rem' }}
                              title="Delete MELD project"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER ACCOUNTS CONTROL */}
        {activeTab === 'users' && (
          <div className="card glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                User Accounts Control
              </h2>

              <form onSubmit={handleUserSearch} className="admin-search-bar">
                <div className="search-input-wrapper" style={{ position: 'relative', width: '260px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search name, email or college..."
                    style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', fontSize: '0.85rem' }}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
              </form>
            </div>

            {usersLoading ? (
              <div className="text-center padding-y-lg"><div className="loading-spinner" /></div>
            ) : users.length === 0 ? (
              <div className="text-center padding-y-lg text-muted">No users found matching query.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>User / Email</th>
                      <th style={{ padding: '0.75rem 1rem' }}>College / University</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Student Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Account Role</th>
                      <th style={{ padding: '0.75rem 1rem' }}>MELD Activity</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="member-avatar-lg" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: '220px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.college || 'Unspecified'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.degree}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => handleToggleVerification(u.id, u.verificationStatus, u.name)}
                            className={`btn btn-sm ${u.verificationStatus === 'VERIFIED' ? 'btn-ghost' : 'btn-primary'}`}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.75rem',
                              gap: '0.25rem',
                              color: u.verificationStatus === 'VERIFIED' ? '#34d399' : '#94a3b8',
                              borderColor: u.verificationStatus === 'VERIFIED' ? 'rgba(52, 211, 153, 0.3)' : 'var(--glass-border)',
                            }}
                            title="Click to toggle Verified Student status"
                          >
                            <BadgeCheck size={14} color={u.verificationStatus === 'VERIFIED' ? '#34d399' : '#94a3b8'} />
                            <span>{u.verificationStatus === 'VERIFIED' ? 'Verified Student' : 'Unverified'}</span>
                          </button>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button
                            onClick={() => handleToggleRole(u.id, u.role, u.name)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: u.role === 'ADMIN' ? '#f43f5e' : '#818cf8',
                              borderColor: u.role === 'ADMIN' ? 'rgba(244, 63, 94, 0.4)' : 'var(--glass-border)',
                              gap: '0.25rem',
                            }}
                            title="Click to toggle user role"
                          >
                            {u.role === 'ADMIN' ? <ShieldAlert size={13} color="#f43f5e" /> : <User size={13} color="#818cf8" />}
                            <span>{u.role}</span>
                          </button>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div>Created: {u.meldsCreatedCount || 0}</div>
                          <div>Joined: {u.meldsJoinedCount || 0}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => navigate(`/users/${u.id}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', gap: '0.2rem' }}
                              title="View user profile"
                            >
                              <User size={13} />
                              <span>Profile</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name, u.email)}
                              className="btn btn-danger btn-ghost btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', gap: '0.2rem' }}
                              title="Delete user account"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM HEALTH & AI MODEL CONFIG */}
        {activeTab === 'system' && (
          <div className="card glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1rem' }}>
              <div className="badge badge-accent margin-bottom-xs" style={{ display: 'inline-flex', gap: '0.35rem' }}>
                <Cpu size={14} color="#a855f7" />
                <span>AI Candidate Matcher Engine</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Multi-Model Fallback Waterfall
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                The candidate compatibility engine utilizes an automated 4-tier provider stack with seamless failover and cache layer.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="pill" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}>
                  <span>1. Primary AI Provider</span>
                  <strong>Groq (openai/gpt-oss-20b)</strong>
                </div>
                <div className="pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}>
                  <span>2. Fallback Tier 1</span>
                  <strong>NVIDIA Llama 3.1 8B</strong>
                </div>
                <div className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}>
                  <span>3. Fallback Tier 2</span>
                  <strong>VoidAI (gpt-4o-mini)</strong>
                </div>
                <div className="pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', justifyContent: 'space-between', padding: '0.5rem 0.85rem' }}>
                  <span>4. Deterministic Engine</span>
                  <strong>Skill & Interest Matcher</strong>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem' }}>
              <div className="badge badge-primary margin-bottom-xs" style={{ display: 'inline-flex', gap: '0.35rem' }}>
                <Lock size={14} color="#38bdf8" />
                <span>Security & Access Control</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Security Audit & Active Protection
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                Real-time security mechanisms active on this environment:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', color: '#cbd5e1', fontSize: '0.88rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} color="#34d399" /> BCrypt salted password hashing (10 rounds)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} color="#34d399" /> JWT token expiration session protection</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} color="#34d399" /> Admin middleware role guard (`requireAdmin`)</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16} color="#34d399" /> Zero plain-text credentials in client builds</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
