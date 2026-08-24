import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getSkills, createLinkup } from '../services/api';
import { PlusCircle, Search, X, Users, Clock, Calendar, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  'Web Development',
  'Mobile App Development',
  'AI / Machine Learning',
  'Data Science & Analytics',
  'Cybersecurity',
  'Blockchain & Web3',
  'UI/UX & Product Design',
  'Embedded Systems & IoT',
  'Game Development',
  'Research & Academic',
  'Other',
];

const COMMITMENT_OPTIONS = [
  '1-5 hours / week',
  '5-10 hours / week',
  '10-20 hours / week',
  'Full-Time / Sprint',
  'Flexible',
];

const DURATION_OPTIONS = [
  '1-2 Weeks (Hackathon / Sprint)',
  '1 Month',
  '1 Semester (~3 Months)',
  '3-6 Months',
  'Ongoing Project',
];

export const CreateLinkupPage = () => {
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [maxMembers, setMaxMembers] = useState(4);
  const [commitmentLevel, setCommitmentLevel] = useState(COMMITMENT_OPTIONS[1]);
  const [projectDuration, setProjectDuration] = useState(DURATION_OPTIONS[1]);

  // Skill Selection State
  const [allSkills, setAllSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [fetchingSkills, setFetchingSkills] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSkillsList = async () => {
      try {
        const skillsData = await getSkills();
        setAllSkills(skillsData || []);
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setFetchingSkills(false);
      }
    };
    fetchSkillsList();
  }, []);

  const filteredSkills = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.some((sel) => sel.id === s.id || sel.name.toLowerCase() === s.name.toLowerCase())
  );

  const handleAddSkill = (skillObj) => {
    setSelectedSkills([...selectedSkills, skillObj]);
    setSkillSearch('');
  };

  const handleAddCustomSkill = (e) => {
    if (e.key === 'Enter' && skillSearch.trim()) {
      e.preventDefault();
      const name = skillSearch.trim();
      if (!selectedSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        setSelectedSkills([...selectedSkills, { name }]);
      }
      setSkillSearch('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSelectedSkills(
      selectedSkills.filter((s) => (s.id ? s.id !== skillToRemove.id : s.name !== skillToRemove.name))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      return setError('Project Title is required.');
    }
    if (!description.trim()) {
      return setError('Project Description is required.');
    }
    if (selectedSkills.length === 0) {
      return setError('Please select at least one required skill for your team.');
    }
    if (maxMembers < 2) {
      return setError('Maximum team members must be at least 2.');
    }

    setLoading(true);

    try {
      const res = await createLinkup({
        title: title.trim(),
        description: description.trim(),
        category,
        requiredSkills: selectedSkills,
        maxMembers: parseInt(maxMembers, 10),
        commitmentLevel,
        projectDuration,
      });

      if (res.success && res.linkup) {
        navigate(`/linkups/${res.linkup.id}`);
      } else {
        setError(res.message || 'Failed to create Linkup project.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating your Linkup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="container page-content">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm margin-bottom-md">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="card glass-card form-container">
          <div className="card-header">
            <div className="header-badge">
              <PlusCircle size={20} className="text-accent" />
              <span>Team Formation</span>
            </div>
            <h1 className="card-title">Create a Meld</h1>
            <p className="card-subtitle">
              Don't ask around, post it and gather the crew. Post a project collaboration request to find talented student teammates.
            </p>
          </div>

          {error && (
            <div className="alert alert-error margin-bottom-md">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            {/* SECTION 1: PROJECT INFORMATION */}
            <div className="form-section">
              <h3 className="section-heading">1. Project Information</h3>

              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Project Title <span className="text-danger">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="input"
                  placeholder="e.g. AI-Powered Study Planner Web App"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  id="description"
                  className="textarea"
                  rows={4}
                  placeholder="Describe your project vision, key features, and goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="category"
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 2: TEAM REQUIREMENTS */}
            <div className="form-section">
              <h3 className="section-heading">2. Team Requirements</h3>

              {/* Skills Selector */}
              <div className="form-group">
                <label className="form-label">
                  Required Skills <span className="text-danger">*</span>
                </label>
                <p className="form-help-text">Search skills or type a custom skill and press Enter.</p>

                {/* Selected Skills Pills */}
                {selectedSkills.length > 0 && (
                  <div className="pills-container margin-bottom-sm">
                    {selectedSkills.map((s, idx) => (
                      <span key={s.id || idx} className="pill pill-primary">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s)}
                          className="pill-remove-btn"
                          title="Remove skill"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Skill Input */}
                <div className="input-wrapper">
                  <Search size={18} className="input-left-icon" />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search or add skill..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    onKeyDown={handleAddCustomSkill}
                  />
                </div>

                {/* Search Dropdown / Recommendations */}
                {skillSearch.trim() && (
                  <div className="skills-dropdown">
                    {fetchingSkills ? (
                      <div className="dropdown-loading">Loading skills...</div>
                    ) : filteredSkills.length > 0 ? (
                      filteredSkills.slice(0, 8).map((sk) => (
                        <button
                          key={sk.id}
                          type="button"
                          className="dropdown-item"
                          onClick={() => handleAddSkill(sk)}
                        >
                          <span>{sk.name}</span>
                          <PlusCircle size={14} />
                        </button>
                      ))
                    ) : (
                      <div className="dropdown-hint">
                        Press <strong>Enter</strong> to add "<em>{skillSearch}</em>" as a new skill
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Max Members */}
              <div className="form-group">
                <label htmlFor="maxMembers" className="form-label">
                  Number of People Needed <span className="text-danger">*</span>
                </label>
                <div className="input-wrapper max-width-sm">
                  <Users size={18} className="input-left-icon" />
                  <input
                    id="maxMembers"
                    type="number"
                    min={2}
                    max={20}
                    className="input"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    required
                  />
                </div>
                <span className="form-help-text">Includes yourself as creator. Minimum 2.</span>
              </div>
            </div>

            {/* SECTION 3: COMMITMENT */}
            <div className="form-section">
              <h3 className="section-heading">3. Commitment & Duration</h3>

              <div className="grid-2-col">
                <div className="form-group">
                  <label htmlFor="commitment" className="form-label">
                    Commitment Level <span className="text-danger">*</span>
                  </label>
                  <select
                    id="commitment"
                    className="select"
                    value={commitmentLevel}
                    onChange={(e) => setCommitmentLevel(e.target.value)}
                  >
                    {COMMITMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="duration" className="form-label">
                    Project Duration <span className="text-danger">*</span>
                  </label>
                  <select
                    id="duration"
                    className="select"
                    value={projectDuration}
                    onChange={(e) => setProjectDuration(e.target.value)}
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="form-actions margin-top-lg">
              <button
                type="button"
                onClick={() => navigate('/my-melds')}
                className="btn btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <span>Posting Meld...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Post Meld & Gather Crew</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
