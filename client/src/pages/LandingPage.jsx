import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import {
  ArrowRight,
  Users,
  Zap,
  ShieldCheck,
  Sparkles,
  Mail,
  Compass,
  FolderGit2,
  Cpu,
  Code2,
  UserCheck,
  Rocket,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Lock,
} from 'lucide-react';

export const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Is MELD free for student developers and creators?',
      a: 'Yes, 100% free! MELD is designed specifically for university students, hackathon participants, and capstone project teams.',
    },
    {
      q: 'How does the AI Candidate Matching engine work?',
      a: 'Our platform uses an advanced multi-provider AI matching architecture to evaluate candidate skill overlap, weekly availability compatibility, interest alignment, and verification status.',
    },
    {
      q: 'How do project invitations and team joining work?',
      a: 'Project creators can browse AI match candidates and send direct invitations. Candidates receive invites in their Invitations hub where they can Accept or Decline. Once accepted, the team count updates automatically.',
    },
    {
      q: 'How do I get the Verified Student status?',
      a: 'Navigate to your Profile page, enter your institutional college email (.edu, .ac.in, etc.), and enter the 6-digit OTP code sent to your inbox for instant verification.',
    },
  ];

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container page-content">
        {/* CLEAN HERO SECTION */}
        <section className="hero-section" style={{ padding: '3rem 1rem 3.5rem', textAlign: 'center' }}>
          <div className="hero-pill" style={{ animation: 'pulseGlow 3s infinite ease-in-out' }}>
            <Sparkles size={16} />
            <span>MELD Platform • AI-Powered Student Team Discovery</span>
          </div>

          <h1 className="hero-title" style={{ maxWidth: '850px', margin: '0 auto 1.5rem' }}>
            Gather the Crew for Your Next Student Project
          </h1>

          <p className="hero-subtitle" style={{ margin: '0 auto 2.5rem' }}>
            Post your project vision, discover verified student builders, and let our intelligent AI engine match you with compatible teammates.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="btn btn-primary btn-lg" style={{ gap: '0.6rem' }}>
              <span>Get Started Free</span>
              <ArrowRight size={20} />
            </Link>
            <Link to="/discover" className="btn btn-ghost btn-lg" style={{ gap: '0.6rem' }}>
              <Compass size={20} />
              <span>Discover MELDs</span>
            </Link>
          </div>

          {/* INLINE TECH & ROLE BADGES STRIP */}
          <div className="hero-tech-strip">
            <span className="tech-pill"><Code2 size={14} color="#818cf8" /> Full-Stack Devs</span>
            <span className="tech-pill"><Sparkles size={14} color="#c084fc" /> AI & Machine Learning</span>
            <span className="tech-pill"><Cpu size={14} color="#38bdf8" /> System Design</span>
            <span className="tech-pill"><UserCheck size={14} color="#34d399" /> Verified Student Builders</span>
            <span className="tech-pill"><FolderGit2 size={14} color="#f472b6" /> Project Leads</span>
          </div>

          {/* CLEAN DYNAMIC STATS BANNER */}
          <div className="landing-stats-row" style={{ marginTop: '3.5rem' }}>
            <div className="landing-stat-item">
              <Cpu size={30} color="#a855f7" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>Smart AI Engine</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automated Candidate Scoring</div>
              </div>
            </div>

            <div className="landing-stat-item">
              <ShieldCheck size={30} color="#22c55e" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>100% Student Verified</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Institutional .edu OTP Verification</div>
              </div>
            </div>

            <div className="landing-stat-item">
              <Mail size={30} color="#6366f1" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>Direct Invitations</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Send & Manage Team Invites</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section style={{ margin: '5rem 0 6rem', textAlign: 'center' }}>
          <div className="badge badge-accent margin-bottom-xs" style={{ display: 'inline-flex' }}>
            <Rocket size={14} />
            <span>Step-By-Step Workflow</span>
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            How MELD Assembles Teams
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem', fontSize: '1rem' }}>
            From posting an initial hackathon concept to building with a verified crew in 4 simple steps.
          </p>

          <div className="landing-workflow-grid">
            <div className="workflow-card">
              <div className="workflow-step-num">1</div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>Create a MELD</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Define your project category, required skills, duration, and open member capacity.
              </p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">2</div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>AI Matching Engine</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Our intelligent AI engine evaluates candidates' skill compatibility, college background, and availability.
              </p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">3</div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>Send Invitations</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Send direct invitations from candidate match cards and track pending request responses.
              </p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">4</div>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>Build & Launch</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Collaborate with verified team members and track progress on your dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE MELD (6 FEATURE CARDS) */}
        <section style={{ margin: '6rem 0 6rem' }}>
          <div className="text-center margin-bottom-lg">
            <div className="badge badge-primary margin-bottom-xs" style={{ display: 'inline-flex' }}>
              <Zap size={14} />
              <span>Platform Capabilities</span>
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>
              Engineered for Hackathons, Capstones & Startups
            </h2>
          </div>

          <div className="feature-grid" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <Cpu size={24} />
              </div>
              <h3>Multi-Model AI Matching</h3>
              <p>Advanced AI candidate evaluation algorithms deliver fast, accurate compatibility scoring for your open team roles.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                <UserCheck size={24} />
              </div>
              <h3>Verified Student Profiles</h3>
              <p>Link your college email (.edu, .ac.in) with 6-digit OTP verification to stand out as a Verified Student builder.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                <Mail size={24} />
              </div>
              <h3>Direct Team Invitations</h3>
              <p>MELD leads can directly invite candidates from AI match results. Manage incoming invites in your dedicated Invitations center.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <FolderGit2 size={24} />
              </div>
              <h3>Dynamic Team Capacity</h3>
              <p>Real-time team size tracking (OPEN, FULL, CLOSED). Members can manage their active MELDs and leave teams at any time.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                <Award size={24} />
              </div>
              <h3>Skill & Availability Alignment</h3>
              <p>Deterministic scoring algorithms ensure candidates match both technical requirements and weekly availability commitments.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' }}>
                <Lock size={24} />
              </div>
              <h3>Security & Privacy First</h3>
              <p>BCrypt password hashing, JWT session security, and strict data protection to safeguard student profiles.</p>
            </div>
          </div>
        </section>

        {/* BUILT FOR CREATORS vs BUILDERS */}
        <section style={{ margin: '6rem 0 6rem' }}>
          <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2.5rem' }}>
              <div className="badge badge-accent margin-bottom-xs" style={{ display: 'inline-flex' }}>
                <FolderGit2 size={14} />
                <span>For Project Creators</span>
              </div>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
                Stop Asking in Random Chat Groups
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Posting project ideas in generic messaging channels leads to unresponsive matches. MELD gives you a structured platform to define roles, run AI matching, and invite qualified candidates.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#cbd5e1', fontSize: '0.95rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#34d399" /> Filter candidates by specific skill sets</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#34d399" /> View Verified Student badges before inviting</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#34d399" /> Automatic status updates when team reaches full capacity</li>
              </ul>
            </div>

            <div className="glass-card" style={{ padding: '2.5rem' }}>
              <div className="badge badge-primary margin-bottom-xs" style={{ display: 'inline-flex' }}>
                <UserCheck size={14} />
                <span>For Student Builders</span>
              </div>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
                Get Invited to Exciting Student Projects
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Showcase your skills, university background, and availability. Get discovered by project leads building real-world software, AI tools, and capstone projects.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#cbd5e1', fontSize: '0.95rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#818cf8" /> Receive direct invitations in your Invitations hub</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#818cf8" /> Accept or decline project requests anytime</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#818cf8" /> Easily leave teams if project goals change</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section style={{ margin: '6rem 0 6rem', maxWidth: '850px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center margin-bottom-lg">
            <div className="badge badge-accent margin-bottom-xs" style={{ display: 'inline-flex' }}>
              <HelpCircle size={14} />
              <span>Got Questions?</span>
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="glass-card"
                style={{ padding: '1.25rem 1.75rem', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                onClick={() => toggleFaq(index)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {faq.q}
                  </h3>
                  {openFaq === index ? <ChevronUp size={20} color="#a855f7" /> : <ChevronDown size={20} color="#94a3b8" />}
                </div>
                {openFaq === index && (
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA BANNER */}
        <section
          className="dash-card page-header-hero"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.85) 100%)',
            border: '1px solid var(--glass-border-active)',
            borderRadius: 'var(--radius-xl)',
            margin: '6rem 0 4rem',
          }}
        >
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
            Ready to Build Your Next Big Project?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.25rem', fontSize: '1.1rem' }}>
            Join student creators, engineers, and designers collaborating on MELD today.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ gap: '0.5rem' }}>
              <span>Create Account</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/discover" className="btn btn-ghost btn-lg">
              Browse Projects
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer container" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>&copy; {new Date().getFullYear()} MELD. All rights reserved.</p>
      </footer>
    </div>
  );
};
