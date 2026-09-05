import React, { useState, useEffect } from 'react';
import { getPublicUserProfile } from '../services/api';
import {
  X,
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
} from 'lucide-react';

export const PublicProfileModal = ({ userId, onClose }) => {
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
        console.error('Failed to load public profile:', err);
        setError(err.message || 'Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div className="modal-card edit-profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <GraduationCap size={20} color="#3b82f6" />
            <h2>Student Candidate Profile</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div className="page-loader" style={{ padding: '3rem 0' }}>
              <Loader2 size={32} className="spin" color="#3b82f6" />
              <p>Loading candidate profile...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : profile ? (
            <div className="public-profile-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header Info */}
              <div className="dashboard-banner profile-header-card" style={{ padding: '1.5rem' }}>
                <div className="profile-header-top-row">
                  <div className="profile-header-left">
                    <div className="user-avatar-large" style={{ width: '60px', height: '60px', fontSize: '1.6rem' }}>
                      {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="profile-name-group">
                      <h3 className="profile-display-name" style={{ fontSize: '1.3rem' }}>{profile.name}</h3>
                      <span className={`verification-badge ${(profile.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                        {profile.verificationStatus === 'VERIFIED' ? (
                          <><CheckCircle2 size={12} /> Verified</>
                        ) : (
                          <><AlertCircle size={12} /> Unverified</>
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
                            <Github size={15} />
                          </a>
                        )}
                        {profile.linkedinUrl && (
                          <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="LinkedIn" aria-label="LinkedIn">
                            <Linkedin size={15} />
                          </a>
                        )}
                        {profile.instagramUrl && (
                          <a href={profile.instagramUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="Instagram" aria-label="Instagram">
                            <Instagram size={15} />
                          </a>
                        )}
                        {profile.youtubeUrl && (
                          <a href={profile.youtubeUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="YouTube" aria-label="YouTube">
                            <Youtube size={15} />
                          </a>
                        )}
                        {profile.websiteUrl && (
                          <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="social-symbol-btn" title="Portfolio / Website" aria-label="Portfolio / Website">
                            <Globe size={15} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="profile-academic-details-row" style={{ marginTop: '1rem', paddingTop: '0.75rem' }}>
                  <span className="profile-meta-item">
                    <GraduationCap size={14} className="text-accent" />
                    <span>{profile.degree || 'Student'}{profile.yearOfStudy ? ` • ${profile.yearOfStudy}` : ''}</span>
                  </span>
                  {profile.college && (
                    <span className="profile-meta-item">
                      <Building2 size={14} className="text-accent" />
                      <span>{profile.college}</span>
                    </span>
                  )}
                  {(profile.city || profile.state || profile.country) && (
                    <span className="profile-meta-item text-muted">
                      <MapPin size={13} />
                      <span>{[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Combined Details Card */}
              <div className="dash-card profile-combined-card" style={{ padding: '1.25rem' }}>
                <div className="profile-combined-grid">
                  {/* About */}
                  <div className="profile-section-item">
                    <div className="profile-section-header">
                      <BookOpen size={16} color="#3b82f6" />
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>About</h4>
                    </div>
                    <p className="bio-text" style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                      {profile.bio || 'No bio provided yet.'}
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="profile-section-item">
                    <div className="profile-section-header">
                      <Code2 size={16} color="#3b82f6" />
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Skills ({(profile.skills || []).length})</h4>
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

                  {/* Interests */}
                  <div className="profile-section-item">
                    <div className="profile-section-header">
                      <Sparkles size={16} color="#3b82f6" />
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Interests ({(profile.interests || []).length})</h4>
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

                  {/* Availability */}
                  <div className="profile-section-item">
                    <div className="profile-section-header">
                      <Clock size={16} color="#10b981" />
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Availability</h4>
                    </div>
                    <div className="availability-pill">
                      <span className="status-dot green" />
                      <span>{profile.availability || 'Flexible'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
