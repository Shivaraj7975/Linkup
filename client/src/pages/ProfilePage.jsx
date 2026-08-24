import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import {
  getProfile,
  updateProfile,
  getSkills,
  getInterests,
  searchUniversities,
  sendOtpApi,
  linkCollegeEmailApi,
  unlinkCollegeEmailApi,
} from '../services/api';
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
  Pencil,
  X,
  Building2,
  MapPin,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  Globe,
  Mail,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

const isCollegeEmailValid = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(clean)) return false;

  const domain = clean.split('@')[1] || '';
  const collegeDomainRegex = /\.(edu|edu\.[a-z]{2,3}|ac\.[a-z]{2,3}|ac)$/i;
  const explicitSuffixes = ['.edu', '.edu.in', '.ac.in', '.ac.uk', '.edu.au', '.edu.sg', '.edu.ca', '.edu.cn'];

  return collegeDomainRegex.test(domain) || explicitSuffixes.some((suf) => domain.endsWith(suf));
};

const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Graduate / Master\'s',
  'PhD / Doctorate',
];

const AVAILABILITY_OPTIONS = [
  'Flexible',
  'Weekdays',
  'Weekends',
  'Evenings',
  '10-15 hrs/week',
  '20+ hrs/week',
];

const FEATURED_SECTOR_SKILL_NAMES = [
  'Web Development',
  'Front-End Development',
  'Back-End Development',
  'Full-Stack Development',
  'React.js',
  'Node.js',
  'Python',
  'UI/UX Design',
  'Data Structures & Algorithms (DSA)',
  'Financial Modeling',
  'AutoCAD',
  'Biotechnology',
  'Technical Writing',
  'Digital Marketing',
  'Legal Research',
  'Robotics',
  'Clinical Research',
  'System Design',
  'Microsoft Power BI',
  'SolidWorks',
  'Agile & Scrum Methodologies',
  'Figma',
  'Product Management',
  'Project Management',
  'Java',
  'C++',
  'JavaScript',
  'TypeScript',
  'PostgreSQL',
  'Machine Learning',
];

const FEATURED_SECTOR_INTEREST_NAMES = [
  'Web Development',
  'Artificial Intelligence (AI)',
  'UI/UX & Product Design',
  'Startups & Venture Capital',
  'Finance & Fintech',
  'Robotics & Automation',
  'Mechanical Engineering & Automotive',
  'Biotechnology & MedTech',
  'Law, Policy & Governance',
  'Digital Marketing & Growth',
  'Full-Stack Development',
  'Mobile App Development',
  'Cybersecurity & Ethical Hacking',
  'Data Science & Analytics',
];

export const ProfilePage = () => {
  const { user, fetchCurrentUser } = useAuth();
  
  // Page Profile State
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageSuccess, setPageSuccess] = useState('');

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Reference data for editing
  const [dbSkills, setDbSkills] = useState([]);
  const [dbInterests, setDbInterests] = useState([]);

  // Form State for editing
  const [form, setForm] = useState({
    college: '',
    city: '',
    state: '',
    country: '',
    degree: '',
    year_of_study: '',
    college_email: '',
    bio: '',
    availability: 'Flexible',
    github_url: '',
    linkedin_url: '',
    skills: [],
    interests: [],
  });

  // ROR University Autocomplete state in modal
  const [uniSuggestions, setUniSuggestions] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const skipSearchRef = useRef(false);

  // Skill & Interest search / expand limits
  const [skillSearch, setSkillSearch] = useState('');
  const [featuredSkillLimit, setFeaturedSkillLimit] = useState(10);
  const [interestSearch, setInterestSearch] = useState('');
  const [featuredInterestLimit, setFeaturedInterestLimit] = useState(10);

  // College Email Link/Unlink state
  const [collegeInput, setCollegeInput] = useState('');
  const [collegeOtpInput, setCollegeOtpInput] = useState('');
  const [collegeStep, setCollegeStep] = useState(1);
  const [sendingCollegeOtp, setSendingCollegeOtp] = useState(false);
  const [linkingCollege, setLinkingCollege] = useState(false);
  const [unlinkingCollege, setUnlinkingCollege] = useState(false);
  const [collegeActionError, setCollegeActionError] = useState('');
  const [collegeActionSuccess, setCollegeActionSuccess] = useState('');
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  const handleSendCollegeOtp = async (e) => {
    e.preventDefault();
    setCollegeActionError('');
    setCollegeActionSuccess('');

    if (!collegeInput || !isCollegeEmailValid(collegeInput)) {
      setCollegeActionError('Please enter a valid institutional college email address ending with .edu, .edu.in, .ac.in, etc.');
      return;
    }

    setSendingCollegeOtp(true);
    try {
      await sendOtpApi(collegeInput.trim(), 'COLLEGE');
      setCollegeStep(2);
      setCollegeActionSuccess(`Verification OTP sent to ${collegeInput.trim()}.`);
    } catch (err) {
      setCollegeActionError(err.message || 'Failed to send verification OTP code.');
    } finally {
      setSendingCollegeOtp(false);
    }
  };

  const handleVerifyAndLinkCollege = async (e) => {
    e.preventDefault();
    setCollegeActionError('');
    setCollegeActionSuccess('');

    if (!collegeOtpInput || collegeOtpInput.trim().length !== 6) {
      setCollegeActionError('Please enter the 6-digit verification code.');
      return;
    }

    setLinkingCollege(true);
    try {
      const res = await linkCollegeEmailApi(collegeInput.trim(), collegeOtpInput.trim());
      setCollegeActionSuccess(res.message || 'College email linked successfully!');
      setCollegeStep(1);
      setCollegeInput('');
      setCollegeOtpInput('');
      fetchFullProfile();
    } catch (err) {
      setCollegeActionError(err.message || 'Failed to verify and link college email.');
    } finally {
      setLinkingCollege(false);
    }
  };

  const handleUnlinkCollege = () => {
    setShowUnlinkConfirm(true);
  };

  const executeUnlinkCollege = async () => {
    setShowUnlinkConfirm(false);
    setCollegeActionError('');
    setCollegeActionSuccess('');
    setUnlinkingCollege(true);
    try {
      const res = await unlinkCollegeEmailApi();
      setCollegeActionSuccess(res.message || 'College email unlinked successfully.');
      fetchFullProfile();
    } catch (err) {
      setCollegeActionError(err.message || 'Failed to unlink college email.');
    } finally {
      setUnlinkingCollege(false);
    }
  };

  // Fetch initial profile
  const fetchFullProfile = async () => {
    try {
      const data = await getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, []);

  // Open Edit Modal & load reference data
  const handleOpenEdit = async () => {
    setEditError('');
    setIsEditing(true);

    try {
      const [skillsList, interestsList] = await Promise.all([
        getSkills(),
        getInterests(),
      ]);
      setDbSkills(skillsList || []);
      setDbInterests(interestsList || []);

      const p = profileData?.profile || {};
      setForm({
        college: p.college || '',
        city: p.city || '',
        state: p.state || '',
        country: p.country || '',
        degree: p.degree || '',
        year_of_study: p.year_of_study || '',
        college_email: p.college_email || '',
        bio: p.bio || '',
        availability: p.availability || 'Flexible',
        github_url: p.github_url || '',
        linkedin_url: p.linkedin_url || '',
        skills: profileData?.skills || [],
        interests: profileData?.interests || [],
      });
    } catch (err) {
      console.error('Failed to load reference data for edit modal:', err);
    }
  };

  // Debounced ROR v2 University Search inside Edit Modal
  useEffect(() => {
    if (!isEditing) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const queryStr = form.college.trim();
    if (queryStr.length < 2) {
      setUniSuggestions([]);
      setShowUniDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setUniLoading(true);
      const results = await searchUniversities(queryStr);
      if (!skipSearchRef.current) {
        setUniSuggestions(results);
        setShowUniDropdown(results.length > 0);
      }
      setUniLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [form.college, isEditing]);

  // Click outside listener for uni dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUniDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUniversity = (uni) => {
    skipSearchRef.current = true;
    setForm((prev) => ({
      ...prev,
      college: uni.name,
      city: uni.city || prev.city || '',
      state: uni.state || prev.state || '',
      country: uni.country || prev.country || 'Global',
    }));
    setUniSuggestions([]);
    setShowUniDropdown(false);
  };

  // Skill Handlers
  const handleAddSkill = (skillItem) => {
    const name = typeof skillItem === 'string' ? skillItem : skillItem.name;
    if (!name) return;

    const exists = form.skills.some(
      (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === name.toLowerCase()
    );

    if (!exists) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, typeof skillItem === 'string' ? { name: skillItem } : skillItem],
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const targetName = (typeof skillToRemove === 'string' ? skillToRemove : skillToRemove.name).toLowerCase();
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter(
        (s) => (typeof s === 'string' ? s : s.name).toLowerCase() !== targetName
      ),
    }));
  };

  // Interest Handlers
  const handleToggleInterest = (interestItem) => {
    const targetId = interestItem.id;
    const exists = form.interests.some((i) => (typeof i === 'object' ? i.id : i) === targetId);

    if (exists) {
      setForm((prev) => ({
        ...prev,
        interests: prev.interests.filter((i) => (typeof i === 'object' ? i.id : i) !== targetId),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        interests: [...prev.interests, interestItem],
      }));
    }
  };

  // Submit Profile Edit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditError('');

    // Validation
    if (!form.college.trim()) {
      setEditError('Please enter your college or university name.');
      return;
    }
    if (!form.degree.trim()) {
      setEditError('Please enter your degree or major.');
      return;
    }
    if (!form.year_of_study) {
      setEditError('Please select your year of study.');
      return;
    }
    if (!form.bio.trim() || form.bio.trim().length < 10) {
      setEditError('Please provide a bio of at least 10 characters.');
      return;
    }
    if (form.skills.length === 0) {
      setEditError('Please select at least one skill.');
      return;
    }
    if (form.interests.length === 0) {
      setEditError('Please select at least one area of interest.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        college: form.college.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim() || 'Global',
        degree: form.degree.trim(),
        year_of_study: form.year_of_study,
        college_email: form.college_email.trim(),
        bio: form.bio.trim(),
        availability: form.availability,
        github_url: form.github_url.trim(),
        linkedin_url: form.linkedin_url.trim(),
        skills: form.skills,
        interests: form.interests,
      });

      await fetchFullProfile();
      await fetchCurrentUser();
      setIsEditing(false);
      setPageSuccess('Your profile has been updated successfully!');
      setTimeout(() => setPageSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner" />
        <p>Loading student profile...</p>
      </div>
    );
  }

  const p = profileData?.profile || {};
  const skills = profileData?.skills || [];
  const interests = profileData?.interests || [];
  const verification = profileData?.verification || {};

  // Filtering for modal selectors
  const isSearchingSkills = skillSearch.trim().length > 0;
  const allFeaturedSkillsPool = dbSkills.filter((s) =>
    FEATURED_SECTOR_SKILL_NAMES.includes(s.name)
  );
  const slicedFeaturedSkills = allFeaturedSkillsPool.slice(0, featuredSkillLimit);
  const searchResultsSkills = isSearchingSkills
    ? dbSkills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.trim().toLowerCase())
      )
    : slicedFeaturedSkills;

  const isSearchingInterests = interestSearch.trim().length > 0;
  const allFeaturedInterestsPool = dbInterests.filter((i) =>
    FEATURED_SECTOR_INTEREST_NAMES.includes(i.name)
  );
  const slicedFeaturedInterests = allFeaturedInterestsPool.slice(0, featuredInterestLimit);
  const searchResultsInterests = isSearchingInterests
    ? dbInterests.filter((i) =>
        i.name.toLowerCase().includes(interestSearch.trim().toLowerCase())
      )
    : (slicedFeaturedInterests.length > 0 ? slicedFeaturedInterests : dbInterests.slice(0, featuredInterestLimit));

  return (
    <>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="container">
        <Navbar />

        <main className="dashboard-layout">
          {pageSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              <CheckCircle2 size={16} /> {pageSuccess}
            </div>
          )}

          {/* PROFILE HEADER CARD */}
          <div className="dashboard-banner profile-header-card">
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

              {(p.github_url || p.linkedin_url || p.college_email || user?.email) && (
                <div className="social-links-row">
                  {user?.email && (
                    <span className="social-link" style={{ color: 'var(--text-secondary)' }} title="Primary Login Email">
                      <Mail size={16} /> {user.email} (Primary)
                    </span>
                  )}
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
                  {p.college_email && (
                    <span className="social-link" style={{ color: 'var(--text-secondary)' }} title="Linked College Email">
                      <GraduationCap size={16} /> {p.college_email}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* EDIT PROFILE BUTTON */}
            <div className="profile-header-actions">
              <button onClick={handleOpenEdit} className="btn btn-primary">
                <Pencil size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* MAIN PROFILE GRID */}
          <div className="dashboard-grid">
            {/* Left Main Column */}
            <div className="dashboard-main-col">
              {/* STUDENT VERIFICATION & COLLEGE EMAIL CARD */}
              <div className="dash-card">
                <div className="dash-card-header flex-center-between">
                  <div className="flex-center gap-xs">
                    <ShieldCheck size={18} color={verification.status === 'VERIFIED' ? '#22d3ee' : '#f59e0b'} />
                    <h2>Student Verification</h2>
                  </div>
                  <span className={`verification-badge ${verification.status?.toLowerCase()}`}>
                    {verification.status === 'VERIFIED' ? (
                      <><CheckCircle2 size={14} /> Verified Student</>
                    ) : (
                      <><AlertCircle size={14} /> Unverified Student</>
                    )}
                  </span>
                </div>

                {collegeActionError && (
                  <div className="alert alert-error margin-bottom-sm flex-center gap-2xs">
                    <AlertCircle size={15} /> <span>{collegeActionError}</span>
                  </div>
                )}
                {collegeActionSuccess && (
                  <div className="alert alert-success margin-bottom-sm flex-center gap-2xs">
                    <CheckCircle2 size={15} /> <span>{collegeActionSuccess}</span>
                  </div>
                )}

                {p.college_email && verification.status === 'VERIFIED' ? (
                  <div className="flex-center-between p-sm rounded-lg" style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.2)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="flex-center gap-sm">
                      <GraduationCap size={20} className="text-cyan" />
                      <div>
                        <div className="font-semibold text-cyan">Linked College Email</div>
                        <div className="text-sm text-muted">{p.college_email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkCollege}
                      disabled={unlinkingCollege}
                      className="btn btn-danger btn-ghost btn-sm flex-center gap-2xs"
                      title="Remove linked college email"
                    >
                      <Trash2 size={14} />
                      <span>{unlinkingCollege ? 'Unlinking...' : 'Unlink College ID'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-sm rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <p className="text-sm text-muted margin-bottom-sm">
                      Link your institutional email to verify your student status and receive top priority in AI candidate matching!
                    </p>

                    {collegeStep === 1 ? (
                      <form onSubmit={handleSendCollegeOtp} className="flex-center gap-sm flex-wrap">
                        <input
                          type="email"
                          placeholder="student@university.edu"
                          value={collegeInput}
                          onChange={(e) => setCollegeInput(e.target.value)}
                          className="input-field"
                          style={{ flex: 1, minWidth: '220px' }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm flex-center gap-2xs" disabled={sendingCollegeOtp}>
                          {sendingCollegeOtp ? (
                            <><Loader2 size={15} className="spin" /> Sending...</>
                          ) : (
                            <><Mail size={15} /> Send OTP Code</>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyAndLinkCollege} className="flex-center gap-sm flex-wrap">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6-Digit OTP Code"
                          value={collegeOtpInput}
                          onChange={(e) => setCollegeOtpInput(e.target.value)}
                          className="input-field text-center font-bold tracking-widest"
                          style={{ width: '160px', letterSpacing: '0.2rem' }}
                        />
                        <button type="submit" className="btn btn-success btn-sm flex-center gap-2xs" disabled={linkingCollege}>
                          {linkingCollege ? (
                            <><Loader2 size={15} className="spin" /> Verifying...</>
                          ) : (
                            <><CheckCircle2 size={15} /> Verify & Link</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollegeStep(1)}
                          className="btn btn-ghost btn-sm text-xs"
                        >
                          Change Email
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ABOUT CARD */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <BookOpen size={18} color="#6366f1" />
                  <h2>About</h2>
                </div>
                <p className="bio-text">{p.bio || 'No bio provided yet.'}</p>
              </div>

              {/* SKILLS CARD */}
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

              {/* INTERESTS CARD */}
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
                        <Sparkles size={13} style={{ marginRight: 2 }} />
                        {it.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Side Column */}
            <div className="dashboard-side-col">
              {/* AVAILABILITY CARD */}
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

              {/* LINKS CARD */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <Globe size={18} color="#6366f1" />
                  <h2>Portfolio & Links</h2>
                </div>
                <div className="links-list-group">
                  {p.github_url ? (
                    <a href={p.github_url} target="_blank" rel="noreferrer" className="link-item-row">
                      <Github size={18} />
                      <span className="link-text">{p.github_url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <p className="no-pills-text">No GitHub link provided.</p>
                  )}
                  {p.linkedin_url ? (
                    <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="link-item-row">
                      <Linkedin size={18} />
                      <span className="link-text">{p.linkedin_url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <p className="no-pills-text">No LinkedIn link provided.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-card edit-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Pencil size={20} color="#6366f1" />
                <h2>Edit Student Profile</h2>
              </div>
              <button onClick={() => setIsEditing(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-body auth-form">
              {editError && <div className="alert alert-error">{editError}</div>}

              {/* College Autocomplete Search */}
              <div className="form-group">
                <label htmlFor="edit-college-input">College or University *</label>
                <div className="input-wrapper icon-left" ref={dropdownRef}>
                  <Building2 size={18} className="input-left-icon" />
                  <input
                    id="edit-college-input"
                    type="text"
                    placeholder="Type university name..."
                    value={form.college}
                    onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
                    onFocus={() => {
                      if (uniSuggestions.length > 0 && !skipSearchRef.current) {
                        setShowUniDropdown(true);
                      }
                    }}
                  />
                  {uniLoading && <Loader2 size={18} className="input-icon-btn spin" />}

                  {showUniDropdown && uniSuggestions.length > 0 && (
                    <div className="uni-dropdown">
                      <div className="uni-dropdown-header">
                        <span>ROR Registry Matches ({uniSuggestions.length})</span>
                        <span className="api-attribution">via ROR v2 API</span>
                      </div>
                      {uniSuggestions.map((uni) => (
                        <div
                          key={uni.id}
                          className="uni-item"
                          onClick={() => handleSelectUniversity(uni)}
                        >
                          <div className="uni-item-info">
                            <span className="uni-name">{uni.name}</span>
                            <span className="uni-country">
                              <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
                              {uni.locationStr || 'Global'}
                            </span>
                          </div>
                          {uni.domain && <span className="uni-domain">{uni.domain}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Grid (City, State, Country) - Read-only */}
              <div className="form-group">
                <label>Location (Auto-detected) *</label>
                <div className="location-grid-3">
                  <div>
                    <span className="sub-field-label">City</span>
                    <input
                      type="text"
                      placeholder="City"
                      value={form.city}
                      readOnly
                      tabIndex={-1}
                      className="readonly-input"
                    />
                  </div>
                  <div>
                    <span className="sub-field-label">State</span>
                    <input
                      type="text"
                      placeholder="State"
                      value={form.state}
                      readOnly
                      tabIndex={-1}
                      className="readonly-input"
                    />
                  </div>
                  <div>
                    <span className="sub-field-label">Country</span>
                    <input
                      type="text"
                      placeholder="Country"
                      value={form.country}
                      readOnly
                      tabIndex={-1}
                      className="readonly-input"
                    />
                  </div>
                </div>
              </div>

              {/* Degree / Major & Year */}
              <div className="country-input-row">
                <div className="form-group">
                  <label>Degree / Major *</label>
                  <input
                    type="text"
                    placeholder="e.g. B.S. Computer Science"
                    value={form.degree}
                    onChange={(e) => setForm((prev) => ({ ...prev, degree: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Year of Study *</label>
                  <select
                    className="country-quick-select"
                    value={form.year_of_study}
                    onChange={(e) => setForm((prev) => ({ ...prev, year_of_study: e.target.value }))}
                  >
                    <option value="">Select Year...</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Short Bio */}
              <div className="form-group">
                <label>Short Bio *</label>
                <textarea
                  rows={3}
                  placeholder="Share a short bio..."
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="bio-textarea"
                />
              </div>

              {/* Availability */}
              <div className="form-group">
                <label>Weekly Availability *</label>
                <div className="pill-grid">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`pill-btn ${form.availability === opt ? 'selected' : ''}`}
                      onClick={() => setForm((prev) => ({ ...prev, availability: opt }))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Selector */}
              <div className="form-group">
                <label>Skills ({form.skills.length}) *</label>
                <div className="selected-pills-container" style={{ marginBottom: '0.75rem' }}>
                  <div className="pill-tags">
                    {form.skills.length === 0 ? (
                      <p className="no-pills-text">No skills selected.</p>
                    ) : (
                      form.skills.map((s, idx) => {
                        const name = typeof s === 'string' ? s : s.name;
                        return (
                          <span key={idx} className="tag-pill active">
                            <span>{name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(s)}
                              className="pill-remove-btn"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="skill-search-wrapper" style={{ marginBottom: '0.75rem' }}>
                  <div className="input-wrapper icon-left">
                    <Search size={16} className="search-icon input-left-icon" />
                    <input
                      type="text"
                      placeholder="Search 260+ skills..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pill-grid">
                  {searchResultsSkills.map((sk) => {
                    const isSelected = form.skills.some(
                      (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === sk.name.toLowerCase()
                    );
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        className={`pill-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => (isSelected ? handleRemoveSkill(sk) : handleAddSkill(sk))}
                      >
                        {sk.name}
                      </button>
                    );
                  })}
                  {!isSearchingSkills && (
                    <>
                      {featuredSkillLimit < allFeaturedSkillsPool.length && (
                        <button
                          type="button"
                          className="pill-btn expand-inline-btn"
                          onClick={() => setFeaturedSkillLimit((prev) => prev + 10)}
                        >
                          <span>+10 More</span>
                          <ChevronDown size={14} />
                        </button>
                      )}
                      {featuredSkillLimit > 10 && (
                        <button
                          type="button"
                          className="pill-btn collapse-inline-btn"
                          onClick={() => setFeaturedSkillLimit(10)}
                        >
                          <span>Show Less</span>
                          <ChevronUp size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Interests Selector */}
              <div className="form-group">
                <label>Areas of Interest ({form.interests.length}) *</label>
                <div className="selected-pills-container" style={{ marginBottom: '0.75rem' }}>
                  <div className="pill-tags">
                    {form.interests.length === 0 ? (
                      <p className="no-pills-text">No interests selected.</p>
                    ) : (
                      form.interests.map((interest, idx) => {
                        const interestObj = typeof interest === 'object'
                          ? interest
                          : dbInterests.find((i) => i.id === interest) || { name: interest };
                        return (
                          <span key={idx} className="tag-pill cyan">
                            <Sparkles size={12} style={{ marginRight: 2 }} />
                            <span>{interestObj.name}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleInterest(interestObj)}
                              className="pill-remove-btn"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="skill-search-wrapper" style={{ marginBottom: '0.75rem' }}>
                  <div className="input-wrapper icon-left">
                    <Search size={16} className="search-icon input-left-icon" />
                    <input
                      type="text"
                      placeholder="Search domains..."
                      value={interestSearch}
                      onChange={(e) => setInterestSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pill-grid">
                  {searchResultsInterests.map((interest) => {
                    const isSelected = form.interests.some(
                      (i) => (typeof i === 'object' ? i.id : i) === interest.id
                    );
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        className={`pill-btn interest-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleInterest(interest)}
                      >
                        <Sparkles size={14} />
                        <span>{interest.name}</span>
                      </button>
                    );
                  })}
                  {!isSearchingInterests && (
                    <>
                      {featuredInterestLimit < (allFeaturedInterestsPool.length || dbInterests.length) && (
                        <button
                          type="button"
                          className="pill-btn expand-inline-btn"
                          onClick={() => setFeaturedInterestLimit((prev) => prev + 10)}
                        >
                          <span>+10 More</span>
                          <ChevronDown size={14} />
                        </button>
                      )}
                      {featuredInterestLimit > 10 && (
                        <button
                          type="button"
                          className="pill-btn collapse-inline-btn"
                          onClick={() => setFeaturedInterestLimit(10)}
                        >
                          <span>Show Less</span>
                          <ChevronUp size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div className="country-input-row">
                <div className="form-group">
                  <label>GitHub URL</label>
                  <div className="input-wrapper icon-left">
                    <Github size={16} className="input-left-icon" />
                    <input
                      type="url"
                      placeholder="https://github.com/yourusername"
                      value={form.github_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, github_url: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>LinkedIn URL</label>
                  <div className="input-wrapper icon-left">
                    <Linkedin size={16} className="input-left-icon" />
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/yourusername"
                      value={form.linkedin_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showUnlinkConfirm}
        title="Unlink College Email"
        message="Are you sure you want to remove your linked college email? Your Verified Student status will be removed."
        confirmText="Unlink Email"
        onConfirm={executeUnlinkCollege}
        onCancel={() => setShowUnlinkConfirm(false)}
        isDangerous={true}
      />
    </>
  );
};
