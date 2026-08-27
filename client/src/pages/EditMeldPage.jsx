import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getLinkupById, getSkills, updateLinkup } from '../services/api';
import { CATEGORY_NAMES } from '../constants/categories';
import {
  Pencil,
  Search,
  X,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  RefreshCw,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

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

const STATUS_OPTIONS = [
  { label: 'Open (Recruiting)', value: 'OPEN' },
  { label: 'Full (Team Complete)', value: 'FULL' },
  { label: 'Closed (Project Archived)', value: 'CLOSED' },
];

export const EditMeldPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [currentStatus, setCurrentStatus] = useState('OPEN');
  const [maxMembers, setMaxMembers] = useState(4);
  const [commitmentLevel, setCommitmentLevel] = useState(COMMITMENT_OPTIONS[1]);
  const [projectDuration, setProjectDuration] = useState(DURATION_OPTIONS[1]);

  // Skill Selection State
  const [allSkills, setAllSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);

  // UI State
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadMeldAndSkills();
  }, [id]);

  const loadMeldAndSkills = async () => {
    setInitialLoading(true);
    setError('');
    try {
      const [meldData, skillsData] = await Promise.all([
        getLinkupById(id),
        getSkills(),
      ]);

      if (!meldData) {
        setError('MELD project not found.');
        setInitialLoading(false);
        return;
      }

      if (!meldData.isCreator) {
        setError('Unauthorized. Only the project creator can edit this MELD.');
        setInitialLoading(false);
        return;
      }

      // Populate Form
      setTitle(meldData.title || '');
      setDescription(meldData.description || '');
      setCategory(meldData.category || CATEGORY_NAMES[0]);
      setCurrentStatus(meldData.currentStatus || 'OPEN');
      setMaxMembers(meldData.maxMembers || 4);
      setCommitmentLevel(meldData.commitmentLevel || COMMITMENT_OPTIONS[1]);
      setProjectDuration(meldData.projectDuration || DURATION_OPTIONS[1]);
      setSelectedSkills(meldData.requiredSkills || []);

      setAllSkills(skillsData || []);
    } catch (err) {
      console.error('Failed to load MELD for editing:', err);
      setError(err.message || 'Failed to load MELD details.');
    } finally {
      setInitialLoading(false);
    }
  };

  const filteredSkills = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !selectedSkills.some((sel) => (sel.id ? sel.id === s.id : sel.name.toLowerCase() === s.name.toLowerCase()))
  );

  const handleAddSkill = (skillObj) => {
    const name = typeof skillObj === 'string' ? skillObj : skillObj.name;
    if (!name) return;
    if (!selectedSkills.some((s) => (s.name || s).toLowerCase() === name.toLowerCase())) {
      setSelectedSkills([...selectedSkills, typeof skillObj === 'string' ? { name: skillObj } : skillObj]);
    }
    setSkillSearch('');
  };

  const handleAddCustomSkill = (customName) => {
    const name = (typeof customName === 'string' ? customName : skillSearch).trim();
    if (!name) return;
    handleAddSkill({ name });
    setSkillSearch('');
  };

  const handleKeyDownSkill = (e) => {
    if (e.key === 'Enter' && skillSearch.trim()) {
      e.preventDefault();
      handleAddCustomSkill(skillSearch);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const targetName = (skillToRemove.name || skillToRemove).toLowerCase();
    setSelectedSkills(
      selectedSkills.filter((s) => (s.name || s).toLowerCase() !== targetName)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!title.trim()) return setError('Project Title is required.');
    if (!description.trim()) return setError('Project Description is required.');
    if (selectedSkills.length === 0) return setError('Please select at least one required skill.');
    if (maxMembers < 2) return setError('Maximum team members must be at least 2.');

    setSaving(true);

    try {
      const updatedData = {
        title: title.trim(),
        description: description.trim(),
        category,
        currentStatus,
        maxMembers: parseInt(maxMembers, 10),
        commitmentLevel,
        projectDuration,
        requiredSkills: selectedSkills,
      };

      const res = await updateLinkup(id, updatedData);

      if (res.success) {
        setSuccessMsg('MELD project updated successfully!');
        setTimeout(() => {
          navigate(`/melds/${id}`);
        }, 1200);
      } else {
        setError(res.message || 'Failed to update MELD project.');
      }
    } catch (err) {
      console.error('Error updating MELD:', err);
      setError(err.message || 'An error occurred while saving changes.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container page-content text-center p-xl">
          <RefreshCw size={32} className="spin text-accent margin-bottom-md" />
          <h3>Loading MELD details for editing...</h3>
        </main>
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="container page-content">
          <div className="card glass-card text-center p-xl">
            <h3 className="text-danger margin-bottom-sm">Access Denied or Not Found</h3>
            <p className="text-muted margin-bottom-md">{error}</p>
            <button onClick={() => navigate('/discover')} className="btn btn-primary btn-sm">
              <ArrowLeft size={16} />
              <span>Back to Discover</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(`/melds/${id}`)} className="btn btn-ghost btn-sm margin-bottom-md" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Meld Details</span>
        </button>

        <div className="card glass-card page-header-card margin-bottom-lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--gradient-brand)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <Pencil size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Edit MELD Project</h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Update your project title, description, status, required skills, and team capacity.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error margin-bottom-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success margin-bottom-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card glass-card p-xl">
          {/* TITLE & CATEGORY */}
          <div className="grid-2-col margin-bottom-md">
            <div className="form-group">
              <label>Project Title *</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AI Powered Student Study Group"
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_NAMES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PROJECT STATUS */}
          <div className="form-group margin-bottom-md">
            <label>Project Status *</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  className={`btn btn-sm ${currentStatus === st.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCurrentStatus(st.value)}
                  style={{ gap: '0.35rem' }}
                >
                  <Layers size={14} />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="form-group margin-bottom-md">
            <label>Project Description *</label>
            <textarea
              className="textarea"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project vision, goals, and what you are looking for..."
              required
            ></textarea>
          </div>

          {/* REQUIRED SKILLS SELECTOR */}
          <div className="form-group margin-bottom-md">
            <label>Required Roles & Skills ({selectedSkills.length}) *</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Select from suggested skills or type any custom skill and click <strong>Add</strong>.
            </p>

            {/* Selected Skills Pills */}
            <div className="selected-pills-container margin-bottom-sm">
              <div className="pill-tags">
                {selectedSkills.length === 0 ? (
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>No skills selected yet.</span>
                ) : (
                  selectedSkills.map((sk, idx) => {
                    const skName = typeof sk === 'string' ? sk : sk.name;
                    return (
                      <span key={idx} className="tag-pill primary">
                        <span>{skName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(sk)}
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

            {/* Search Bar with Integrated Add Button */}
            <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} className="input-left-icon" />
              <input
                type="text"
                className="input"
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

            {/* Suggested Skill Pills */}
            {filteredSkills.length > 0 && (
              <div className="pill-grid margin-top-sm">
                {filteredSkills.slice(0, 10).map((sk) => (
                  <button
                    key={sk.id}
                    type="button"
                    className="pill-btn"
                    onClick={() => handleAddSkill(sk)}
                  >
                    + {sk.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TEAM CAPACITY, COMMITMENT, DURATION */}
          <div className="grid-3-col margin-bottom-lg">
            <div className="form-group">
              <label>Max Team Capacity *</label>
              <div className="input-wrapper icon-left">
                <Users size={16} className="input-left-icon" />
                <input
                  type="number"
                  min={2}
                  max={20}
                  className="input"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Commitment Level *</label>
              <select
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
              <label>Project Duration *</label>
              <select
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

          {/* SUBMIT BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(`/melds/${id}`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ gap: '0.5rem' }}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
