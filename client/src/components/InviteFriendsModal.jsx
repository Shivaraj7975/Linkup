import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Search,
  Check,
  Copy,
  X,
  Loader2,
  BadgeCheck,
  Users,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Send,
} from 'lucide-react';
import { searchUsersToInvite, inviteToLinkup } from '../services/api';

export const InviteFriendsModal = ({ meld, onClose, onInvitationSent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [copiedLink, setCopiedLink] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const searchDebounceRef = useRef(null);

  const meldId = meld?.id;
  const meldUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/melds/${meldId}?ref=invite`
    : `/melds/${meldId}?ref=invite`;

  // Fetch candidate users initially and on search query change
  useEffect(() => {
    if (!meldId) return;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setLoading(true);
    setModalError('');

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersToInvite(searchQuery.trim(), meldId);
        setUsers((results || []).slice(0, 10));
      } catch (err) {
        console.error('Failed to search candidates:', err);
        setModalError('Could not load candidates. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, meldId]);

  const handleInviteUser = async (targetUser) => {
    if (!targetUser || !meldId) return;
    setInvitingId(targetUser.id);
    setModalError('');
    setModalSuccess('');

    try {
      await inviteToLinkup(meldId, targetUser.id);
      setInvitedIds((prev) => new Set(prev).add(targetUser.id));
      setModalSuccess(`Invitation sent to ${targetUser.name}!`);
      if (onInvitationSent) onInvitationSent(targetUser);
      setTimeout(() => setModalSuccess(''), 3000);
    } catch (err) {
      setModalError(err.message || `Failed to invite ${targetUser.name}.`);
    } finally {
      setInvitingId(null);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(meldUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = meldUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const shareText = `Hey! I'm inviting you to join our project "${meld?.title || 'MELD'}" on MELD. Check it out here:`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${meldUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(meldUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card edit-profile-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '620px', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <UserPlus size={20} color="#6366f1" />
            <h2>Invite Friends to MELD</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" type="button" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem', gap: '1.25rem' }}>
          {/* Status Alerts */}
          {modalSuccess && (
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}>
              <CheckCircle2 size={16} />
              <span>{modalSuccess}</span>
            </div>
          )}
          {modalError && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}>
              <AlertCircle size={16} />
              <span>{modalError}</span>
            </div>
          )}

          {/* Section 1: Search by Name or @Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Search Students by Name or @Username
            </label>
            <div className="input-wrapper icon-left" style={{ position: 'relative' }}>
              <Search size={18} className="input-left-icon" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Type name, @username, or university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-md)' }}
                autoComplete="off"
              />
              {loading && <Loader2 size={18} className="input-icon-btn spin" style={{ right: '0.75rem' }} />}
            </div>
          </div>

          {/* Candidates Results List */}
          <div style={{
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '0.5rem',
          }}>
            {loading && users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
                <span>Searching students...</span>
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <Users size={28} style={{ opacity: 0.4, margin: '0 auto 0.5rem auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No matching students found.</p>
                <span style={{ fontSize: '0.8rem' }}>Try searching by first name, username, or college.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {users.map((u) => {
                  const isAlreadyMember = u.is_member;
                  const isAlreadyInvited = u.is_invited || invitedIds.has(u.id);
                  const isBeingInvited = invitingId === u.id;

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        gap: '0.75rem',
                      }}
                    >
                      {/* Avatar & User Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: '#fff',
                          flexShrink: 0,
                        }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {u.name}
                            </span>
                            {u.username && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-cyan, #22d3ee)',
                                background: 'rgba(34, 211, 238, 0.1)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: 'var(--radius-full)',
                                fontFamily: 'monospace'
                              }}>
                                @{u.username}
                              </span>
                            )}
                            {u.verification_status === 'VERIFIED' && (
                              <BadgeCheck size={14} className="verified-icon" title="Verified Student" />
                            )}
                          </div>
                          <span style={{
                            display: 'block',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {u.college ? `${u.college}${u.degree ? ` • ${u.degree}` : ''}` : 'Student Builder'}
                          </span>
                        </div>
                      </div>

                      {/* Invite Action Button / Status Badge */}
                      <div style={{ flexShrink: 0 }}>
                        {isAlreadyMember ? (
                          <span className="pill pill-success pill-xs" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                            ✓ In Team
                          </span>
                        ) : isAlreadyInvited ? (
                          <span className="pill pill-info pill-xs" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                            ✓ Invited
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleInviteUser(u)}
                            disabled={isBeingInvited}
                            style={{ gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            {isBeingInvited ? (
                              <>
                                <Loader2 size={14} className="spin" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={14} />
                                <span>Invite</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Direct Invite Link */}
          <div style={{
            padding: '1rem',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: 'var(--radius-md)',
          }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Or Share an Invite Link with Friends
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-md)',
              padding: '0.35rem 0.5rem 0.35rem 0.85rem',
              gap: '0.5rem',
            }}>
              <input
                type="text"
                readOnly
                value={meldUrl}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                }}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`btn btn-sm ${copiedLink ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyInviteLink}
                style={{ minWidth: '95px', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                {copiedLink ? (
                  <>
                    <Check size={14} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Social Share */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-xs"
                style={{
                  background: 'rgba(37, 211, 102, 0.1)',
                  color: '#25D366',
                  border: '1px solid rgba(37, 211, 102, 0.25)',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                }}
              >
                <MessageCircle size={14} />
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-xs"
                style={{
                  background: 'rgba(0, 136, 204, 0.1)',
                  color: '#0088cc',
                  border: '1px solid rgba(0, 136, 204, 0.25)',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                }}
              >
                <Send size={14} />
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer-actions" style={{ padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
