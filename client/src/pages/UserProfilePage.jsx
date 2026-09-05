import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getPublicUserProfile } from '../services/api';
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertCircle,
  Code2,
  Sparkles,
  Clock,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Globe,
  MapPin,
  Loader2,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';

export const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicUserProfile(userId);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError(err.message || 'Failed to load candidate profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <div className="page-loader">
          <div className="loader-spinner" />
          <p>Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container dashboard-layout">
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm"
            style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {error ? (
          <div className="alert alert-error" style={{ margin: '1rem 0' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : profile ? (
          <>
            {/* PROFILE HEADER CARD */}
            <div className="dashboard-banner profile-header-card">
              {/* Top Row: Left (Avatar on top, Name below) and Right (Username on top, Social Symbols below) */}
              <div className="profile-header-top-row">
                <div className="profile-header-left">
                  <div className="user-avatar-large">
                    {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="profile-name-group">
                    <h1 className="profile-display-name">{profile.name}</h1>
                    <span className={`verification-badge ${(profile.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                      {profile.verificationStatus === 'VERIFIED' ? (
                        <><CheckCircle2 size={13} /> Verified Student</>
                      ) : (
                        <><AlertCircle size={13} /> Unverified Student</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="profile-header-right">
                  <div className="profile-account-meta">
                    {profile.username && (
                      <span className="user-handle-pill">
                        @{profile.username}
                      </span>
                    )}
                  </div>

                  {/* Social / Portfolio Links - Logo Symbols Only */}
                  {(profile.githubUrl || profile.linkedinUrl || profile.instagramUrl || profile.youtubeUrl || profile.websiteUrl) && (
                    <div className="social-icons-group">
                      {profile.githubUrl && (
                        <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="GitHub" aria-label="GitHub">
                          <Github size={16} />
                        </a>
                      )}
                      {profile.linkedinUrl && (
                        <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="LinkedIn" aria-label="LinkedIn">
                          <Linkedin size={16} />
                        </a>
                      )}
                      {profile.instagramUrl && (
                        <a href={profile.instagramUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="Instagram" aria-label="Instagram">
                          <Instagram size={16} />
                        </a>
                      )}
                      {profile.youtubeUrl && (
                        <a href={profile.youtubeUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="YouTube" aria-label="YouTube">
                          <Youtube size={16} />
                        </a>
                      )}
                      {profile.websiteUrl && (
                        <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="Portfolio / Website" aria-label="Portfolio / Website">
                          <Globe size={16} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: College & Academic Details */}
              <div className="profile-academic-details-row">
                <span className="profile-meta-item">
                  <GraduationCap size={15} className="text-accent" />
                  <span>{profile.degree || 'Student'}{profile.yearOfStudy ? ` • ${profile.yearOfStudy}` : ''}</span>
                </span>
                {profile.college && (
                  <span className="profile-meta-item">
                    <Building2 size={15} className="text-accent" />
                    <span>{profile.college}</span>
                  </span>
                )}
                {(profile.city || profile.state || profile.country) && (
                  <span className="profile-meta-item text-muted">
                    <MapPin size={14} />
                    <span>{[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* COMBINED DETAILS CARD (About, Skills, Interests, Availability in 2x2 grid) */}
            <div className="dash-card profile-combined-card">
              <div className="profile-combined-grid">
                {/* 1. ABOUT SECTION */}
                <div className="profile-section-item">
                  <div className="profile-section-header">
                    <BookOpen size={18} color="#3b82f6" />
                    <h2>About</h2>
                  </div>
                  <p className="bio-text" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '0.95rem', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                    {profile.bio || 'No bio provided yet.'}
                  </p>
                </div>

                {/* 2. SKILLS SECTION */}
                <div className="profile-section-item">
                  <div className="profile-section-header">
                    <Code2 size={18} color="#3b82f6" />
                    <h2>Skills & Expertise ({(profile.skills || []).length})</h2>
                  </div>
                  <div className="pill-tags">
                    {(profile.skills || []).length === 0 ? (
                      <p className="no-pills-text">No skills added yet.</p>
                    ) : (
                      profile.skills.map((sk, idx) => (
                        <span key={idx} className="tag-pill active">
                          {typeof sk === 'object' ? sk.name : sk}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. INTERESTS SECTION */}
                <div className="profile-section-item">
                  <div className="profile-section-header">
                    <Sparkles size={18} color="#3b82f6" />
                    <h2>Areas of Interest ({(profile.interests || []).length})</h2>
                  </div>
                  <div className="pill-tags">
                    {(profile.interests || []).length === 0 ? (
                      <p className="no-pills-text">No interests added yet.</p>
                    ) : (
                      profile.interests.map((it, idx) => (
                        <span key={idx} className="tag-pill cyan">
                          <Sparkles size={12} style={{ marginRight: 4 }} />
                          {typeof it === 'object' ? it.name : it}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. AVAILABILITY SECTION */}
                <div className="profile-section-item">
                  <div className="profile-section-header">
                    <Clock size={18} color="#10b981" />
                    <h2>Weekly Availability</h2>
                  </div>
                  <div className="availability-pill">
                    <span className="status-dot green" />
                    <span>{profile.availability || 'Flexible'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
