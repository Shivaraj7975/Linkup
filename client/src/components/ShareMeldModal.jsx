import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
  Linkedin,
  Mail,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const ShareMeldModal = ({ meld, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!meld) return null;

  const meldUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/melds/${meld.id}`
    : `/melds/${meld.id}`;

  const shareTitle = meld.title || 'Join this project on MELD!';
  const shareText = `Check out "${meld.title}" on MELD — The Student Team-Building Platform! Join the crew:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meldUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = meldUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: meldUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${meldUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(meldUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(meldUrl)}&hashtags=MELD,Project,StudentBuilders`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(meldUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Invitation to collaborate on ${meld.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'd like to invite you to check out "${meld.title}" on MELD.\n\nProject Link:\n${meldUrl}\n\nLet's build something awesome together!`)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card edit-profile-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <Share2 size={20} color="#6366f1" />
            <h2>Share MELD</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" type="button" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', gap: '1.25rem' }}>
          {/* MELD Summary Card */}
          <div style={{
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-category" style={{ fontSize: '0.72rem' }}>{meld.category}</span>
              <span className="badge badge-status status-open" style={{ fontSize: '0.72rem' }}>{meld.currentStatus}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#fff' }}>
              {meld.title}
            </h3>
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #94a3b8)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
            }}>
              {meld.description}
            </p>
          </div>

          {/* Direct Copy Link Section */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Share Link
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-md, 8px)',
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
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                }}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`btn btn-sm ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyLink}
                style={{ minWidth: '95px', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                {copied ? (
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
            {copied && (
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--accent-teal, #10b981)' }}>
                ✓ Link copied to clipboard! Share it with friends or classmates.
              </span>
            )}
          </div>

          {/* Social Share Grid */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Share to Platforms
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(37, 211, 102, 0.1)',
                  color: '#25D366',
                  border: '1px solid rgba(37, 211, 102, 0.25)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                }}
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(0, 136, 204, 0.1)',
                  color: '#0088cc',
                  border: '1px solid rgba(0, 136, 204, 0.25)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                }}
              >
                <Send size={16} />
                <span>Telegram</span>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>𝕏</span>
                <span>X / Twitter</span>
              </a>

              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(10, 102, 194, 0.1)',
                  color: '#0a66c2',
                  border: '1px solid rgba(10, 102, 194, 0.25)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                }}
              >
                <Linkedin size={16} />
                <span>LinkedIn</span>
              </a>

              <a
                href={emailUrl}
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                }}
              >
                <Mail size={16} />
                <span>Email</span>
              </a>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleNativeShare}
                  style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    color: '#ec4899',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem',
                  }}
                >
                  <ExternalLink size={16} />
                  <span>More...</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer-actions" style={{ padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
