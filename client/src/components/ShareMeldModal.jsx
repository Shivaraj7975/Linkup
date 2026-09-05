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
} from 'lucide-react';

export const ShareMeldModal = ({ meld, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!meld) return null;

  const meldId = meld.id || meld._id;
  const meldUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/melds/${meldId}`
    : `/melds/${meldId}`;
  const shareUrl = meldUrl;

  const shareTitle = meld.title || 'Join this project on MELD!';
  const shareText = `Check out "${meld.title}" on MELD — The Student Team-Building Platform! Join the crew:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
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
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=MELD,Project,StudentBuilders`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Invitation to collaborate on ${meld.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'd like to invite you to check out "${meld.title}" on MELD.\n\nProject Link:\n${shareUrl}\n\nLet's build something awesome together!`)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card edit-profile-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <Share2 size={20} color="var(--accent-primary, #3b82f6)" />
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
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md, 8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              {meld.category && (
                <span className="badge badge-category" style={{ fontSize: '0.72rem' }}>{meld.category}</span>
              )}
              {meld.currentStatus && (
                <span className={`badge badge-status ${meld.currentStatus === 'OPEN' ? 'status-open' : meld.currentStatus === 'FULL' ? 'status-full' : 'status-closed'}`} style={{ fontSize: '0.72rem' }}>
                  {meld.currentStatus}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
              {meld.title}
            </h3>
            {meld.description && (
              <p style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
              }}>
                {meld.description}
              </p>
            )}
          </div>

          {/* Direct Copy Link Section */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Share Link
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm, 6px)',
              padding: '0.35rem 0.5rem 0.35rem 0.85rem',
            }}>
              <span style={{
                flex: 1,
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                {shareUrl}
              </span>
              <button
                type="button"
                className={`btn btn-sm ${copied ? 'btn-ghost' : 'btn-primary'}`}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  gap: '0.35rem',
                }}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share Channels */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
              Share directly via
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(37, 211, 102, 0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  fontWeight: 600,
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
                  background: 'rgba(0, 136, 204, 0.12)',
                  color: '#0284c7',
                  border: '1px solid rgba(0, 136, 204, 0.3)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  fontWeight: 600,
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
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  fontWeight: 600,
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
                  background: 'rgba(10, 102, 194, 0.12)',
                  color: '#0a66c2',
                  border: '1px solid rgba(10, 102, 194, 0.3)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  fontWeight: 600,
                }}
              >
                <Linkedin size={16} />
                <span>LinkedIn</span>
              </a>

              <a
                href={emailUrl}
                className="btn btn-ghost btn-sm"
                style={{
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--accent-primary, #2563eb)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  fontWeight: 600,
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
                    background: 'var(--bg-secondary)',
                    color: 'var(--accent-primary, #2563eb)',
                    border: '1px solid var(--glass-border)',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem',
                    fontWeight: 600,
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
