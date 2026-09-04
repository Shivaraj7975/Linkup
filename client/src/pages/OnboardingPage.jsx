import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import {
  getSkills,
  getInterests,
  getProfile,
  updateProfile,
  searchUniversities,
  checkUsernameApi,
} from '../services/api';
import {
  AtSign,
  GraduationCap,
  Code2,
  Sparkles,
  UserCheck,
  Globe,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Loader2,
  Github,
  Linkedin,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';

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

// Curated 50 Featured Sector Skills
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
  'Prompt Engineering',
  'Advanced Microsoft Excel (VLOOKUP/Pivot)',
  'Corporate Etiquette',
  'Problem Solving',
  'Quantitative Aptitude',
  'DevOps Engineering',
  'Cloud Engineering',
  'Mobile App Development',
  'SQL',
  'Graphic Design',
  'Embedded Systems',
  'Biomedical Equipment Operation',
  'Environmental Science',
  'Copywriting',
  'Academic Research',
  'Instructional Design',
  'Patient Care & Nursing',
  'Behavioral Interviewing (STAR Method)',
  'Financial Analysis & Valuation (DCF)',
  'Public Speaking',
];

// Curated Featured Sector Interests representing distinct domains
const FEATURED_SECTOR_INTEREST_NAMES = [
  'Gaming & Esports (BGMI, Valorant, PC)',
  'Trips & Travel (Trekking, Road Trips)',
  'Sports & Fitness (Football, Gym, Cricket)',
  'Music, Band & Jamming',
  'Events, Parties & Campus Hangouts',
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
  'Open Source Projects',
  'Hackathons & Coding Contests',
  'Product Management',
  'Game Development',
  'Content Creation & Vlogging',
  'Renewable Energy & Climate Tech',
  'E-commerce & D2C Brands',
  'Consulting & Strategy',
  'Healthcare & Clinical Research',
  'Academic Research & Publishing',
  'Social Entrepreneurship',
];

const STEPS = [
  { id: 1, name: 'Handle', icon: AtSign },
  { id: 2, name: 'Academics', icon: GraduationCap },
  { id: 3, name: 'Skills', icon: Code2 },
  { id: 4, name: 'Interests', icon: Sparkles },
  { id: 5, name: 'About & Links', icon: UserCheck },
];

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reference lists from DB
  const [dbSkills, setDbSkills] = useState([]);
  const [dbInterests, setDbInterests] = useState([]);

  // Form State
  const [form, setForm] = useState({
    username: '',
    college: '',
    city: '',
    state: '',
    country: '',
    degree: '',
    year_of_study: '',
    college_email: '',
    skills: [],
    interests: [],
    bio: '',
    availability: 'Flexible',
    github_url: '',
    linkedin_url: '',
  });

  // Username validation state
  const [usernameCheck, setUsernameCheck] = useState({
    checking: false,
    available: null,
    message: '',
  });
  const usernameDebounceRef = useRef(null);

  // University Autocomplete State
  const [collegeSelectedFromApi, setCollegeSelectedFromApi] = useState(false);
  const [uniSuggestions, setUniSuggestions] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const skipSearchRef = useRef(false);

  // Skill Search & Featured Limit State
  const [skillSearch, setSkillSearch] = useState('');
  const [featuredLimit, setFeaturedLimit] = useState(10);

  // Interest Search & Featured Limit State
  const [interestSearch, setInterestSearch] = useState('');
  const [featuredInterestLimit, setFeaturedInterestLimit] = useState(10);

  // Initial Data Fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [skillsList, interestsList, profileData] = await Promise.all([
          getSkills(),
          getInterests(),
          getProfile().catch(() => null),
        ]);

        setDbSkills(skillsList || []);
        setDbInterests(interestsList || []);

        if (profileData) {
          const u = profileData.user;
          const p = profileData.profile || {};

          let initialUsername = u?.username || user?.username || '';
          if (!initialUsername && (u?.name || user?.name)) {
            const rawFirst = (u?.name || user?.name || '').trim().split(/\s+/)[0];
            let cleanFirst = rawFirst.toLowerCase().replace(/[^a-z0-9]/g, '') || 'coder';
            if (!/^[a-z]/.test(cleanFirst)) {
              cleanFirst = 'user' + cleanFirst;
            }
            while ((cleanFirst.match(/[a-z]/g) || []).length < 5) {
              cleanFirst += 'code';
            }
            const rndNum = Math.floor(10 + Math.random() * 90);
            initialUsername = `${cleanFirst}${rndNum}`;
          }

          if (initialUsername) {
            setUsernameCheck({ checking: false, available: true, message: '✓ Current handle' });
          }

          if (p.college && p.college.trim()) {
            setCollegeSelectedFromApi(true);
          }

          setForm((prev) => ({
            ...prev,
            username: initialUsername,
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
            skills: profileData.skills || [],
            interests: profileData.interests || [],
          }));

          // Restore saved step if user previously exited during onboarding
          if (p.onboarding_step && p.onboarding_step >= 1 && p.onboarding_step <= 5) {
            setCurrentStep(p.onboarding_step);
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding references:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm((prev) => ({ ...prev, username: clean }));
    if (error) setError('');

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
    }

    if (!clean) {
      setUsernameCheck({ checking: false, available: null, message: '' });
      return;
    }

    if (!/^[a-z]/.test(clean)) {
      setUsernameCheck({ checking: false, available: false, message: 'Must start with a letter.' });
      return;
    }

    if (clean.length < 7) {
      setUsernameCheck({ checking: false, available: false, message: `Minimum 7 characters (${clean.length}/7).` });
      return;
    }

    if (clean.length > 30) {
      setUsernameCheck({ checking: false, available: false, message: 'Maximum 30 characters.' });
      return;
    }

    const letters = (clean.match(/[a-z]/g) || []).length;
    const digits = (clean.match(/[0-9]/g) || []).length;

    const conditionA = letters >= 8; // At least 8 letters
    const conditionB = letters >= 5 && digits >= 2; // At least 5 letters and 2 numbers

    if (!conditionA && !conditionB) {
      if (letters >= 5) {
        setUsernameCheck({
          checking: false,
          available: false,
          message: `Needs either ${8 - letters} more letter(s) OR ${2 - digits} more number(s).`,
        });
      } else {
        setUsernameCheck({
          checking: false,
          available: false,
          message: `Needs at least 8 letters OR (5 letters + 2 numbers). Letters: ${letters}/5.`,
        });
      }
      return;
    }

    setUsernameCheck({ checking: true, available: null, message: 'Checking availability...' });

    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await checkUsernameApi(clean);
        setUsernameCheck({
          checking: false,
          available: res.available,
          message: res.available ? '✓ Username is available!' : '✗ Username is already taken.',
        });
      } catch (err) {
        setUsernameCheck({
          checking: false,
          available: false,
          message: err.message || 'Error checking availability.',
        });
      }
    }, 350);
  };

  // Debounced ROR v2 University Search
  useEffect(() => {
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
  }, [form.college]);

  // Hide dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUniDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSelectUniversity = (uni) => {
    skipSearchRef.current = true;
    setForm((prev) => ({
      ...prev,
      college: uni.name,
      city: uni.city || prev.city || '',
      state: uni.state || prev.state || '',
      country: uni.country || prev.country || 'Global',
    }));
    setCollegeSelectedFromApi(true);
    setUniSuggestions([]);
    setShowUniDropdown(false);
  };

  // Skill Management
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

  const handleAddCustomSkill = (customName) => {
    const trimmed = (customName || skillSearch).trim();
    if (!trimmed) return;
    handleAddSkill({ name: trimmed });
    setSkillSearch('');
  };

  const handleKeyDownSkill = (e) => {
    if (e.key === 'Enter' && skillSearch.trim()) {
      e.preventDefault();
      handleAddCustomSkill(skillSearch);
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

  // Interest Management
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

  const handleAddCustomInterest = (customName) => {
    const trimmed = (customName || interestSearch).trim();
    if (!trimmed) return;
    const exists = form.interests.some(
      (i) => (typeof i === 'string' ? i : i.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      setForm((prev) => ({
        ...prev,
        interests: [...prev.interests, { name: trimmed }],
      }));
    }
    setInterestSearch('');
  };

  const handleKeyDownInterest = (e) => {
    if (e.key === 'Enter' && interestSearch.trim()) {
      e.preventDefault();
      handleAddCustomInterest(interestSearch);
    }
  };

  // Validation per step
  const validateStep = (step) => {
    if (step === 1) {
      if (!form.username || !form.username.trim()) {
        return 'Please choose a unique username handle.';
      }
      const clean = form.username.trim().toLowerCase();
      if (!/^[a-z]/.test(clean)) {
        return 'Username must start with a letter.';
      }
      if (clean.length < 7 || clean.length > 30) {
        return 'Username must be between 7 and 30 characters.';
      }
      if (!/^[a-z0-9_]+$/.test(clean)) {
        return 'Username can only contain letters, numbers, and underscores.';
      }
      const letters = (clean.match(/[a-z]/g) || []).length;
      const digits = (clean.match(/[0-9]/g) || []).length;
      const conditionA = letters >= 8;
      const conditionB = letters >= 5 && digits >= 2;
      if (!conditionA && !conditionB) {
        return 'Username must have either at least 8 letters, or at least 5 letters and 2 numbers.';
      }
      if (usernameCheck.available === false) {
        return 'This username is already taken. Please choose another.';
      }
    }
    if (step === 2) {
      if (!collegeSelectedFromApi || !form.college.trim()) {
        return 'Please search and select your college or university from the verified registry dropdown.';
      }
      if (!form.degree.trim()) return 'Please enter your degree / major.';
      if (!form.year_of_study) return 'Please select your current year of study.';
    }
    if (step === 3) {
      if (form.skills.length === 0) return 'Please add at least one skill.';
    }
    if (step === 4) {
      if (form.interests.length === 0) return 'Please select at least one area of interest.';
    }
    if (step === 5) {
      if (!form.bio.trim() || form.bio.trim().length < 10) {
        return 'Please provide a short bio (at least 10 characters).';
      }
    }
    return null;
  };

  // Save progress helper
  const saveProgress = async (isFinal = false, targetStep = currentStep) => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        username: form.username.trim().toLowerCase(),
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
        onboarding_step: targetStep,
        is_completed: isFinal,
      });

      if (isFinal) {
        await fetchCurrentUser();
        navigate('/discover', { replace: true });
      }
    } catch (err) {
      console.error('Failed to save onboarding step:', err);
      setError(err.message || 'Failed to save progress.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }

    const nextStep = Math.min(currentStep + 1, 5);
    try {
      await saveProgress(false, nextStep);
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Handled in saveProgress
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = async () => {
    const err = validateStep(5);
    if (err) {
      setError(err);
      return;
    }
    try {
      await saveProgress(true, 5);
    } catch {
      // Handled in saveProgress
    }
  };

  // Skills Logic
  const isSearchingSkills = skillSearch.trim().length > 0;
  const allFeaturedSkillsPool = dbSkills.filter((s) =>
    FEATURED_SECTOR_SKILL_NAMES.includes(s.name)
  );
  const slicedFeaturedSkills = allFeaturedSkillsPool.slice(0, featuredLimit);
  const searchResultsSkills = isSearchingSkills
    ? dbSkills.filter((s) =>
      s.name.toLowerCase().includes(skillSearch.trim().toLowerCase())
    )
    : slicedFeaturedSkills;

  // Interests Logic
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

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner" />
        <p>Loading onboarding wizard...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container page-content">
        <div className="onboarding-wrapper">
          {/* Stepper Header */}
          <div className="stepper-bar">
            {STEPS.map((step) => {
              const IconComponent = step.icon;
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              return (
                <div
                  key={step.id}
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''
                    }`}
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.id);
                  }}
                >
                  <div className="step-circle">
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <IconComponent size={18} />
                    )}
                  </div>
                  <span className="step-name">{step.name}</span>
                </div>
              );
            })}
          </div>

          {/* Step Form Container */}
          <div className="onboarding-card">
            {error && <div className="alert alert-error">{error}</div>}

            {/* STEP 1: CHOOSE USERNAME HANDLE */}
            {currentStep === 1 && (
              <div className="wizard-step">
                <div className="wizard-step-header">
                  <h2>Step 1 — Choose Your Username Handle</h2>
                  <p>Pick your unique identity on MELD. Teammates will find, mention, and invite you using this handle.</p>
                </div>

                <div className="auth-form">
                  <div className="form-group">
                    <label htmlFor="username-input">Unique Username *</label>
                    <div className="input-wrapper icon-left">
                      <AtSign size={18} className="input-left-icon" />
                      <input
                        id="username-input"
                        type="text"
                        placeholder="e.g. shivaraj123, alex_smith99"
                        value={form.username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        maxLength={30}
                        autoFocus
                      />
                      {usernameCheck.checking && (
                        <Loader2 size={18} className="input-icon-btn spin" />
                      )}
                    </div>

                    <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                      {usernameCheck.message && (
                        <div style={{
                          color: usernameCheck.available === true ? 'var(--accent-teal, #10b981)' : '#f43f5e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500,
                          marginBottom: 4,
                        }}>
                          {usernameCheck.available === true ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                          <span>{usernameCheck.message}</span>
                        </div>
                      )}
                      <span className="field-hint">
                        Must start with a letter and have either at least 8 letters (e.g. <code>alexander</code>) OR at least 5 letters with 2 numbers (e.g. <code>coder42</code>, <code>shivaraj99</code>).
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ACADEMICS & ROR V2 SEARCH */}
            {currentStep === 2 && (
              <div className="wizard-step">
                <div className="wizard-step-header">
                  <h2>Step 2 — Academic Information</h2>
                  <p>Search your university via Research Organization Registry (ROR). City, State, and Country will be auto-selected.</p>
                </div>

                <div className="auth-form">
                  {/* College Search Autocomplete with ROR API */}
                  <div className="form-group">
                    <label htmlFor="college-input">College or University *</label>
                    <div className="input-wrapper icon-left" ref={dropdownRef}>
                      <Building2 size={18} className="input-left-icon" />
                      <input
                        id="college-input"
                        type="text"
                        placeholder="Type university name to search verified registry..."
                        value={form.college}
                        onChange={(e) => {
                          handleChange('college', e.target.value);
                          setCollegeSelectedFromApi(false);
                        }}
                        onFocus={() => {
                          if (uniSuggestions.length > 0 && !skipSearchRef.current) {
                            setShowUniDropdown(true);
                          }
                        }}
                      />
                      {uniLoading && (
                        <Loader2 size={18} className="input-icon-btn spin" />
                      )}

                      {/* Autocomplete Dropdown List */}
                      {showUniDropdown && uniSuggestions.length > 0 && (
                        <div className="uni-dropdown">
                          <div className="uni-dropdown-header">
                            <span>ROR Registry Matches ({uniSuggestions.length})</span>
                            <span className="api-attribution">Click to select institution</span>
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
                              {uni.domain && (
                                <span className="uni-domain">{uni.domain}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {collegeSelectedFromApi ? (
                      <div style={{ color: 'var(--accent-teal, #10b981)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                        <CheckCircle2 size={14} />
                        <span style={{ fontWeight: 500 }}>Verified from Institutional Registry</span>
                      </div>
                    ) : form.college.trim().length >= 2 ? (
                      <div style={{ color: '#f59e0b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                        <AlertCircle size={14} />
                        <span>Please click and select an institution from the suggestions dropdown.</span>
                      </div>
                    ) : (
                      <span className="field-hint">
                        Search research & academic organizations globally. You must click an option from the dropdown to select it.
                      </span>
                    )}
                  </div>

                  {/* Location Grid: City, State, Country (Non-editable / Read-only) */}
                  <div className="form-group">
                    <label>University Location (Auto-detected) *</label>
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
                        <span className="sub-field-label">State / Region</span>
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
                    <span className="field-hint">
                      City, State, and Country are automatically detected when you select your college above.
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Degree / Major *</label>
                    <input
                      type="text"
                      placeholder="e.g. B.S. Computer Science"
                      value={form.degree}
                      onChange={(e) => handleChange('degree', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Year of Study *</label>
                    <div className="pill-grid">
                      {YEARS.map((y) => (
                        <button
                          key={y}
                          type="button"
                          className={`pill-btn ${form.year_of_study === y ? 'selected' : ''
                            }`}
                          onClick={() => handleChange('year_of_study', y)}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>College Email (Optional for Verification)</label>
                    <input
                      type="email"
                      placeholder="you@university.edu"
                      value={form.college_email}
                      onChange={(e) => handleChange('college_email', e.target.value)}
                    />
                    <span className="field-hint">
                      Used for institutional student badge verification.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SKILLS */}
            {currentStep === 3 && (
              <div className="wizard-step">
                <div className="wizard-step-header">
                  <h2>Step 3 — Technical, Development & Sector Skills</h2>
                  <p>Select your top skills from Web Development, Software Engineering, Interview Prep, and Sector Fields.</p>
                </div>

                <div className="selected-pills-container">
                  <label className="section-label">Your Selected Skills ({form.skills.length})</label>
                  <div className="pill-tags">
                    {form.skills.length === 0 ? (
                      <p className="no-pills-text">No skills added yet. Search or click below to select skills.</p>
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

                {/* Skill Search Field */}
                <div className="skill-search-wrapper">
                  <div className="input-wrapper icon-left" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} className="search-icon input-left-icon" />
                    <input
                      type="text"
                      placeholder="Search skills or type custom skill..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      onKeyDown={handleKeyDownSkill}
                      style={{ paddingRight: skillSearch.trim() ? '5.5rem' : '1rem' }}
                    />
                    {skillSearch.trim().length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddCustomSkill(skillSearch)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm, 6px)',
                          gap: '0.25rem',
                          zIndex: 2,
                        }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Skill Pills Display Section */}
                <div className="available-pills-section">
                  <label className="section-label">
                    {isSearchingSkills
                      ? `Search Results for "${skillSearch}" (${searchResultsSkills.length})`
                      : 'Featured Sector Skills'}
                  </label>

                  <div className="pill-grid">
                    {searchResultsSkills.length === 0 ? (
                      <p className="no-pills-text">
                        No matching skill found in database for "{skillSearch}". Click <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>Add</strong> above or press Enter to create it.
                      </p>
                    ) : (
                      <>
                        {searchResultsSkills.map((sk) => {
                          const isSelected = form.skills.some(
                            (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === sk.name.toLowerCase()
                          );
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              className={`pill-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() =>
                                isSelected ? handleRemoveSkill(sk) : handleAddSkill(sk)
                              }
                            >
                              {sk.name}
                            </button>
                          );
                        })}

                        {/* Inline +10 More / Show Less Button placed RIGHT BESIDE the last skill pill button */}
                        {!isSearchingSkills && (
                          <>
                            {featuredLimit < allFeaturedSkillsPool.length && (
                              <button
                                type="button"
                                className="pill-btn expand-inline-btn"
                                onClick={() => setFeaturedLimit((prev) => prev + 10)}
                                title="Expand 10 more skills"
                              >
                                <span>+10 More</span>
                                <ChevronDown size={14} />
                              </button>
                            )}
                            {featuredLimit > 10 && (
                              <button
                                type="button"
                                className="pill-btn collapse-inline-btn"
                                onClick={() => setFeaturedLimit(10)}
                                title="Collapse back to 10 skills"
                              >
                                <span>Show Less</span>
                                <ChevronUp size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: AREAS OF INTEREST (Searchable + Inline +10 More Expand Button) */}
            {currentStep === 4 && (
              <div className="wizard-step">
                <div className="wizard-step-header">
                  <h2>Step 4 — Areas of Interest & Domains</h2>
                  <p>Choose topics, industries, and project domains you are passionate about collaborating in.</p>
                </div>

                {/* Selected Interests Summary Box */}
                <div className="selected-pills-container">
                  <label className="section-label">Your Selected Interests ({form.interests.length})</label>
                  <div className="pill-tags">
                    {form.interests.length === 0 ? (
                      <p className="no-pills-text">No interests selected yet. Search or click below to choose domains.</p>
                    ) : (
                      form.interests.map((interest, idx) => {
                        const interestObj = typeof interest === 'object'
                          ? interest
                          : dbInterests.find((i) => i.id === interest) || { name: interest };
                        return (
                          <span key={idx} className="tag-pill cyan">
                            <Sparkles size={13} style={{ marginRight: 2 }} />
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

                {/* Interest Search Field */}
                <div className="skill-search-wrapper">
                  <div className="input-wrapper icon-left" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} className="search-icon input-left-icon" />
                    <input
                      type="text"
                      placeholder="Search domains or type custom interest..."
                      value={interestSearch}
                      onChange={(e) => setInterestSearch(e.target.value)}
                      onKeyDown={handleKeyDownInterest}
                      style={{ paddingRight: interestSearch.trim() ? '5.5rem' : '1rem' }}
                    />
                    {interestSearch.trim().length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddCustomInterest(interestSearch)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm, 6px)',
                          gap: '0.25rem',
                          zIndex: 2,
                        }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Interest Pills Display Section */}
                <div className="available-pills-section">
                  <label className="section-label">
                    {isSearchingInterests
                      ? `Search Results for "${interestSearch}" (${searchResultsInterests.length})`
                      : 'Featured Domain Interests'}
                  </label>

                  <div className="pill-grid grid-lg">
                    {searchResultsInterests.length === 0 ? (
                      <p className="no-pills-text">
                        No matching interest domain found for "{interestSearch}". Click <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>Add</strong> above or press Enter to create it.
                      </p>
                    ) : (
                      <>
                        {searchResultsInterests.map((interest) => {
                          const isSelected = form.interests.some(
                            (i) => (typeof i === 'object' ? i.id : i) === interest.id
                          );
                          return (
                            <button
                              key={interest.id}
                              type="button"
                              className={`pill-btn interest-pill ${isSelected ? 'selected' : ''
                                }`}
                              onClick={() => handleToggleInterest(interest)}
                            >
                              <Sparkles size={16} />
                              <span>{interest.name}</span>
                            </button>
                          );
                        })}

                        {/* Inline +10 More / Show Less Button placed RIGHT BESIDE the last interest pill button */}
                        {!isSearchingInterests && (
                          <>
                            {featuredInterestLimit < (allFeaturedInterestsPool.length || dbInterests.length) && (
                              <button
                                type="button"
                                className="pill-btn expand-inline-btn"
                                onClick={() => setFeaturedInterestLimit((prev) => prev + 10)}
                                title="Expand 10 more domains"
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
                                title="Collapse back to 10 domains"
                              >
                                <span>Show Less</span>
                                <ChevronUp size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: ABOUT YOU, AVAILABILITY & LINKS */}
            {currentStep === 5 && (
              <div className="wizard-step">
                <div className="wizard-step-header">
                  <h2>Step 5 — About You & Social Links</h2>
                  <p>Share a brief bio, your weekly availability, and portfolio links for project collaboration.</p>
                </div>

                <div className="auth-form">
                  <div className="form-group">
                    <label>Short Bio *</label>
                    <textarea
                      rows={4}
                      placeholder="Tell potential teammates about your experience, past projects, or what kind of teams you want to join..."
                      value={form.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      className="bio-textarea"
                    />
                    <span className="field-hint">Minimum 10 characters.</span>
                  </div>

                  <div className="form-group">
                    <label>Weekly Availability *</label>
                    <div className="pill-grid">
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`pill-btn ${form.availability === opt ? 'selected' : ''
                            }`}
                          onClick={() => handleChange('availability', opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>GitHub Profile URL (Optional)</label>
                    <div className="input-wrapper icon-left">
                      <Github size={18} className="input-left-icon" />
                      <input
                        type="url"
                        placeholder="https://github.com/yourusername"
                        value={form.github_url}
                        onChange={(e) => handleChange('github_url', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>LinkedIn Profile URL (Optional)</label>
                    <div className="input-wrapper icon-left">
                      <Linkedin size={18} className="input-left-icon" />
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourusername"
                        value={form.linkedin_url}
                        onChange={(e) => handleChange('linkedin_url', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="wizard-nav-footer">
              {currentStep > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                  disabled={saving}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="spin" /> Completing...
                    </>
                  ) : (
                    <>
                      <span>Complete Profile</span>
                      <CheckCircle2 size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
