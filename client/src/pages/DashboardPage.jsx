import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/api';
import {
  GraduationCap,
  Code2,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Github,
  Linkedin,
  Clock,
  BookOpen,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const data = await getProfile();
        setProfileData(data);
      } catch (err) {
        console.error('Failed to load profile for dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullProfile();
  }, []);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const p = profileData?.profile || {};
  const skills = profileData?.skills || [];
  const interests = profileData?.interests || [];
  const verification = profileData?.verification || {};

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="container">
        <Navbar />

        <main className="dashboard-layout">
          {/* Header Banner */}
          <div className="dashboard-banner">
            <div className="user-avatar-large">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>

            <div className="user-header-info">
              <div className="user-title-row">
                <h1>{user?.name}</h1>
                <span className={`verification-badge ${verification.status?.toLowerCase()}`}>
                  {verification.status === 'VERIFIED' ? (
                    <><CheckCircle2 size={14} /> Verified Student</>
                  ) : (
                    <><AlertCircle size={14} /> Unverified Student</>
                  )}
                </span>
              </div>

              <p className="user-subtitle-line">
                <GraduationCap size={16} />
                <span>{p.degree || 'Student'}</span>
                <span className="dot-divider">•</span>
                <span>{p.college || 'University'}</span>
                {(p.city || p.state || p.country) && (
                  <>
                    <span className="dot-divider">•</span>
                    <span>
                      📍 {[p.city, p.state, p.country].filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
                {p.year_of_study && (
                  <>
                    <span className="dot-divider">•</span>
                    <span>{p.year_of_study}</span>
                  </>
                )}
              </p>

              {(p.github_url || p.linkedin_url) && (
                <div className="social-links-row">
                  {p.github_url && (
                    <a href={p.github_url} target="_blank" rel="noreferrer" className="social-link">
                      <Github size={16} /> GitHub
                    </a>
                  )}
                  {p.linkedin_url && (
                    <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="social-link">
                      <Linkedin size={16} /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout */}
          <div className="dashboard-grid">
            {/* Left Main Column */}
            <div className="dashboard-main-col">
              {/* Bio Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <BookOpen size={18} color="#6366f1" />
                  <h2>About</h2>
                </div>
                <p className="bio-text">{p.bio || 'No bio provided yet.'}</p>
              </div>

              {/* Skills Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <Code2 size={18} color="#a855f7" />
                  <h2>Skills ({skills.length})</h2>
                </div>
                <div className="pill-tags">
                  {skills.length === 0 ? (
                    <p className="no-pills-text">No skills added yet.</p>
                  ) : (
                    skills.map((sk) => (
                      <span key={sk.id} className="tag-pill active">
                        {sk.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Interests Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <Sparkles size={18} color="#06b6d4" />
                  <h2>Areas of Interest ({interests.length})</h2>
                </div>
                <div className="pill-tags">
                  {interests.length === 0 ? (
                    <p className="no-pills-text">No interests selected yet.</p>
                  ) : (
                    interests.map((it) => (
                      <span key={it.id} className="tag-pill cyan">
                        {it.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Side Column */}
            <div className="dashboard-side-col">
              <div className="dash-card">
                <div className="dash-card-header">
                  <Clock size={18} color="#10b981" />
                  <h2>Availability</h2>
                </div>
                <div className="availability-status">
                  <span className="avail-dot" />
                  <span>{p.availability || 'Flexible'}</span>
                </div>
              </div>

              <div className="dash-card matching-teaser">
                <h3>🚀 AI Teammate Matching</h3>
                <p>Matching algorithm is using your skills and interests to find complementary collaborators.</p>
                <span className="teaser-pill">Phase 2 Enabled</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
