import React, { useState, useEffect } from 'react';
import { getPublicUserProfile } from '../services/api';
import {
  X,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Code2,
  Sparkles,
  Clock,
  Github,
  Linkedin,
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
      <div className="modal-card edit-profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <GraduationCap size={20} color="#6366f1" />
            <h2>Student Candidate Profile</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body auth-form">
          {loading ? (
            <div className="page-loader" style={{ padding: '3rem 0' }}>
              <Loader2 size={32} className="spin" color="#6366f1" />
              <p>Loading candidate profile...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : profile ? (
            <div className="public-profile-content">
              {/* Header Info */}
              <div className="dashboard-banner" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="user-avatar-large" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>
                  {profile.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>

                <div className="user-header-info">
                  <div className="user-title-row">
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{profile.name}</h3>
                    <span className={`verification-badge ${(profile.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                      {profile.verificationStatus === 'VERIFIED' ? (
                        <><CheckCircle2 size={13} /> Verified Student</>
                      ) : (
                        <><AlertCircle size={13} /> Unverified Student</>
                      )}
                    </span>
                  </div>

                  <p className="user-subtitle-line" style={{ fontSize: '0.85rem' }}>
                    <GraduationCap size={14} />
                    <span>{profile.degree || 'Student'}</span>
                    <span className="dot-divider">•</span>
                    <span>{profile.college || 'University'}</span>
                    {(profile.city || profile.state || profile.country) && (
                      <>
                        <span className="dot-divider">•</span>
                        <span>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 2 }} />
                          {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                        </span>
                      </>
                    )}
                    {profile.yearOfStudy && (
                      <>
                        <span className="dot-divider">•</span>
                        <span>{profile.yearOfStudy}</span>
                      </>
                    )}
                  </p>

                  {(profile.githubUrl || profile.linkedinUrl) && (
                    <div className="social-links-row" style={{ marginTop: '0.5rem' }}>
                      {profile.githubUrl && (
                        <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="social-link">
                          <Github size={14} /> GitHub
                        </a>
                      )}
                      {profile.linkedinUrl && (
                        <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="social-link">
                          <Linkedin size={14} /> LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="dash-card-header">
                  <BookOpen size={16} color="#6366f1" />
                  <h4 style={{ fontSize: '1rem' }}>About</h4>
                </div>
                <p className="bio-text" style={{ fontSize: '0.9rem' }}>
                  {profile.bio || 'No bio description provided.'}
                </p>
              </div>

              {/* Availability */}
              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="dash-card-header">
                  <Clock size={16} color="#10b981" />
                  <h4 style={{ fontSize: '1rem' }}>Weekly Availability</h4>
                </div>
                <div className="availability-status">
                  <span className="avail-dot" />
                  <span style={{ fontSize: '0.9rem' }}>{profile.availability || 'Flexible'}</span>
                </div>
              </div>

              {/* Skills */}
              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="dash-card-header">
                  <Code2 size={16} color="#a855f7" />
                  <h4 style={{ fontSize: '1rem' }}>Skills ({(profile.skills || []).length})</h4>
                </div>
                <div className="pill-tags">
                  {(profile.skills || []).length === 0 ? (
                    <p className="no-pills-text">No skills listed.</p>
                  ) : (
                    profile.skills.map((sk, idx) => (
                      <span key={idx} className="tag-pill active">
                        {sk}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Interests */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <Sparkles size={16} color="#06b6d4" />
                  <h4 style={{ fontSize: '1rem' }}>Areas of Interest ({(profile.interests || []).length})</h4>
                </div>
                <div className="pill-tags">
                  {(profile.interests || []).length === 0 ? (
                    <p className="no-pills-text">No interests listed.</p>
                  ) : (
                    profile.interests.map((it, idx) => (
                      <span key={idx} className="tag-pill cyan">
                        <Sparkles size={12} style={{ marginRight: 2 }} />
                        {it}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
