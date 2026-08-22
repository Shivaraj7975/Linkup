import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ArrowRight, Users, Zap, Globe } from 'lucide-react';

export const LandingPage = () => {
  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="container">
        <Navbar />

        <main className="hero-section">
          <div className="hero-pill">
            <span>✨ Connect. Collaborate. Create.</span>
          </div>

          <h1 className="hero-title">Linkup</h1>

          <p className="hero-subtitle">
            Find the right people. Build better things.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="btn btn-primary btn-lg">
              <span>Get Started</span>
              <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Login
            </Link>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <h3>Find Teammates</h3>
              <p>Connect with students who have the skills you need for your next project.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3>Smart Matching</h3>
              <p>AI-powered matching finds the most compatible collaborators for your goals.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Globe size={24} />
              </div>
              <h3>Cross-Discipline</h3>
              <p>Bridge the gap between engineering, design, business, and science students.</p>
            </div>
          </div>
        </main>

        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} Linkup. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};
