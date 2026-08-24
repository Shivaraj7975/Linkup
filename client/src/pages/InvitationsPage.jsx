import React, { useState, useEffect } from 'react';
import { getUserInvitations, respondToInvitation } from '../services/api';
import { Mail, CheckCircle2, XCircle, AlertCircle, Sparkles, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const InvitationsPage = () => {
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await getUserInvitations();
      // The API returns res.invitations which contains { received, sent }
      const data = res.invitations || { received: [], sent: [] };
      setReceivedInvitations(data.received || []);
      setSentInvitations(data.sent || []);
    } catch (err) {
      setError(err.message || 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitationId, action) => {
    try {
      setActionError('');
      setActionSuccess('');
      setActionLoading(invitationId);
      await respondToInvitation(invitationId, action);
      setActionSuccess(`Invitation ${action.toLowerCase()} successfully!`);
      // Remove from list or refetch
      await fetchInvitations();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to process invitation.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        <Navbar />
        <main className="container dashboard-layout center-content" style={{ minHeight: '60vh' }}>
          <Sparkles size={36} className="spin" color="#6366f1" />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <Navbar />

      <main className="container dashboard-layout">
          {/* Header Banner */}
          <div
            className="dash-card page-header-hero"
            style={{
              marginBottom: '1.75rem',
              padding: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <Mail size={24} color="#6366f1" />
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  MELD Invitations
                </h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Manage your incoming and outgoing requests to join MELDs.
              </p>
            </div>
            
            <Link to="/discover" className="btn btn-primary btn-md">
              <span>Discover MELDs</span>
            </Link>
          </div>

          {/* Segmented Options / Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '2rem',
              background: 'rgba(15, 22, 41, 0.6)',
              padding: '0.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              width: 'fit-content',
              maxWidth: '100%',
            }}
          >
            <button 
              type="button"
              className={`btn btn-sm ${activeTab === 'received' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('received')}
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1.25rem',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Mail size={16} /> <span>Received ({receivedInvitations.length})</span>
            </button>
            <button 
              type="button"
              className={`btn btn-sm ${activeTab === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('sent')}
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 1.25rem',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Send size={16} /> <span>Sent ({sentInvitations.length})</span>
            </button>
          </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {activeTab === 'received' ? (
        receivedInvitations.length === 0 && !error ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Mail size={48} color="#475569" style={{ margin: '0 auto 1rem' }} />
            <h3 className="section-title">No Received Invitations</h3>
            <p className="section-subtitle">You haven't received any invitations to join a MELD recently.</p>
            <Link to="/discover" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Discover MELDs
            </Link>
          </div>
        ) : (
          <div className="members-manage-grid">
            {receivedInvitations.map((inv) => (
              <div key={inv.invitation_id} className="request-item-card">
                <div className="card-top-row">
                  <div>
                    <div className="applicant-name">{inv.title}</div>
                    <div className="applicant-college">Invited by: {inv.inviter_name}</div>
                  </div>
                  <div className="badge-primary">{inv.category}</div>
                </div>
                <p className="member-bio" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  {inv.description.length > 100 ? inv.description.substring(0, 100) + '...' : inv.description}
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => handleRespond(inv.invitation_id, 'ACCEPTED')}
                    disabled={actionLoading === inv.invitation_id}
                  >
                    {actionLoading === inv.invitation_id ? <Sparkles size={16} className="spin" /> : <CheckCircle2 size={16} />}
                    Accept
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => handleRespond(inv.invitation_id, 'REJECTED')}
                    disabled={actionLoading === inv.invitation_id}
                  >
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        sentInvitations.length === 0 && !error ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Send size={48} color="#475569" style={{ margin: '0 auto 1rem' }} />
            <h3 className="section-title">No Sent Invitations</h3>
            <p className="section-subtitle">You haven't sent any invitations to candidates recently.</p>
            <Link to="/my-melds" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Go to My MELDs
            </Link>
          </div>
        ) : (
          <div className="members-manage-grid">
            {sentInvitations.map((inv) => (
              <div key={inv.invitation_id} className="request-item-card">
                <div className="card-top-row">
                  <div>
                    <div className="applicant-name">{inv.invitee_name}</div>
                    <div className="applicant-college">Invited to: {inv.title}</div>
                  </div>
                  <div className="badge-primary">Pending</div>
                </div>
                <p className="member-bio" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  Awaiting response from {inv.invitee_name}.
                </p>
              </div>
            ))}
          </div>
        )
      )}
      </main>
    </div>
  );
};
