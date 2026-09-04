import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getPublicUserProfile } from '../services/api';
import {
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
  ArrowLeft,
  User,
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

  return (
    <div className="app-layout">
      <Navbar />
      
      <main className="container page-content" style={{ paddingTop: '5.5rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: '1.25rem', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {loading ? (
            <div className="page-loader" style={{ padding: '4rem 0', textAlign: 'center' }}>
              <Loader2 size={40} className="spin" color="#6366f1" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading candidate user profile...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error" style={{ margin: '1rem 0' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : profile ? (
            <div className="profile-page-grid">
              {/* Header Banner */}
              <div className="dash-card profile-header-card" style={{ marginBottom: '1.5rem', padding: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="user-avatar-large" style={{ width: '72px', height: '72px', fontSize: '2rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                  {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{profile.name}</h1>
                    {profile.username && (
                      <span className="user-handle-pill" style={{ color: 'var(--accent-primary, #818cf8)', fontWeight: 600, fontSize: '1.05rem' }}>
                        @{profile.username}
                      </span>
                    )}
                    <span className={`verification-badge ${(profile.verificationStatus || 'UNVERIFIED').toLowerCase()}`}>
                      {profile.verificationStatus === 'VERIFIED' ? (
                        <><CheckCircle2 size={14} /> Verified Student</>
                      ) : (
                        <><AlertCircle size={14} /> Unverified Student</>
                      )}
                    </span>
                  </div>

                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
                    <GraduationCap size={16} color="#6366f1" />
                    <span>{profile.degree || 'Student'}</span>
                    <span>•</span>
                    <span>{profile.college || 'University'}</span>
                    {profile.yearOfStudy && (
                      <>
                        <span>•</span>
                        <span>{profile.yearOfStudy}</span>
                      </>
                    )}
                  </p>

                  {(profile.city || profile.state || profile.country) && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      <MapPin size={14} />
                      <span>{[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}</span>
                    </p>
                  )}

                  {(profile.githubUrl || profile.linkedinUrl) && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                      {profile.githubUrl && (
                        <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
                          <Github size={14} /> GitHub Profile
                        </a>
                      )}
                      {profile.linkedinUrl && (
                        <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
                          <Linkedin size={14} /> LinkedIn Profile
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* About / Bio */}
            <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <div className="dash-card-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="#6366f1" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>About</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' }}>
                {profile.bio || 'No bio description provided.'}
              </p>
            </div>

            {/* Availability */}
            <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <div className="dash-card-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Weekly Availability</h3>
              </div>
              <div className="availability-status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="avail-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{profile.availability || 'Flexible'}</span>
              </div>
            </div>

            {/* Skills */}
            <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <div className="dash-card-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code2 size={18} color="#a855f7" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Skills & Expertise ({(profile.skills || []).length})</h3>
              </div>
              <div className="pill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              <div className="dash-card-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#06b6d4" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Areas of Interest ({(profile.interests || []).length})</h3>
              </div>
              <div className="pill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(profile.interests || []).length === 0 ? (
                  <p className="no-pills-text">No interests listed.</p>
                ) : (
                  profile.interests.map((it, idx) => (
                    <span key={idx} className="tag-pill cyan">
                      <Sparkles size={12} style={{ marginRight: 4 }} />
                      {it}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </main>
    </div>
  );
};
