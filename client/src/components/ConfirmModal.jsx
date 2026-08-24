import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed? This action cannot be undone.", 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
  isDangerous = true 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 12000 }}>
      <div 
        className="modal-card edit-profile-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '400px', width: '90%' }}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            {isDangerous ? (
              <AlertTriangle size={20} color="var(--accent-rose)" />
            ) : (
              <AlertTriangle size={20} color="var(--accent-primary)" />
            )}
            <h2>{title}</h2>
          </div>
          <button onClick={onCancel} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body auth-form" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {message}
          </p>
          
          <div className="modal-footer-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: 'none', padding: 0 }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onConfirm}
              style={{ 
                flex: 1, 
                background: isDangerous ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : 'var(--gradient-brand)',
                boxShadow: isDangerous ? '0 4px 15px rgba(225, 29, 72, 0.3)' : 'var(--shadow-glow)'
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
