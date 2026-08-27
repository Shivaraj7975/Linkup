import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { getMeldChatHistory } from '../services/api';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const MeldChat = ({ meldId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Removed the useEffect that unconditionally scrolled to bottom on any message change.
  // Instead, we scroll to bottom explicitly on initial load and on new incoming messages.

  useEffect(() => {
    let activeSocket;
    let isMounted = true;

    const initChat = async () => {
      try {
        setLoading(true);
        // 1. Fetch recent message history via REST API
        try {
          const fetchedMessages = await getMeldChatHistory(meldId);
          if (isMounted) {
            setMessages(Array.isArray(fetchedMessages) ? fetchedMessages.reverse() : []);
            if (!Array.isArray(fetchedMessages) || fetchedMessages.length < 50) {
              setHasMore(false);
            } else {
              setHasMore(true);
            }
            scrollToBottom();
          }
        } catch (apiErr) {
          if (isMounted) {
            setError(apiErr.message || 'Failed to load chat history.');
            setLoading(false);
          }
          return;
        }

        if (!isMounted) return;

        // 2. Initialize Socket.IO connection
        const token = localStorage.getItem('meld_token') || localStorage.getItem('linkup_token');
        if (!token) {
          setError('Authentication required for chat.');
          setLoading(false);
          return;
        }

        activeSocket = io(SOCKET_URL, {
          auth: { token }
        });

        activeSocket.on('connect', () => {
          if (!isMounted) return;
          setIsConnected(true);
          // 3. Request to join the specific Meld room
          activeSocket.emit('join_meld', meldId, (response) => {
            if (response && !response.success) {
              if (isMounted) setError(response.message || 'Unauthorized to join this chat.');
              activeSocket.disconnect();
            } else {
              if (isMounted) setLoading(false);
            }
          });
        });

        activeSocket.on('connect_error', (err) => {
          console.error('Socket connect error:', err);
          if (isMounted) {
            setError('Failed to connect to chat server.');
            setLoading(false);
          }
        });

        activeSocket.on('disconnect', () => {
          if (isMounted) setIsConnected(false);
        });

        // 4. Listen for new incoming messages
        activeSocket.on('new_message', (message) => {
          if (isMounted) {
            setMessages((prev) => [...prev, message]);
            scrollToBottom();
          }
        });

        setSocket(activeSocket);

      } catch (err) {
        console.error('Chat init error:', err);
        if (isMounted) {
          setError('An unexpected error occurred loading chat.');
          setLoading(false);
        }
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.off('connect');
        activeSocket.off('connect_error');
        activeSocket.off('disconnect');
        activeSocket.off('new_message');
        activeSocket.disconnect();
      }
    };
  }, [meldId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected) return;
    
    if (newMessage.length > 2000) {
      setError('Message is too long (max 2000 characters).');
      return;
    }

    const payload = {
      meldId,
      content: newMessage.trim(),
    };

    socket.emit('send_message', payload, (response) => {
      if (response && !response.success) {
        setError(response.message || 'Failed to send message.');
      } else {
        setNewMessage('');
        setError('');
      }
    });
  };

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight } = e.target;
    if (scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
      setLoadingMore(true);
      try {
        const oldestMessage = messages[0];
        const fetchedMessages = await getMeldChatHistory(meldId, oldestMessage.created_at);
        
        if (!Array.isArray(fetchedMessages) || fetchedMessages.length < 50) {
          setHasMore(false);
        }

        if (Array.isArray(fetchedMessages) && fetchedMessages.length > 0) {
          const scrollHeightBefore = scrollHeight;
          const reversedOld = fetchedMessages.reverse();
          
          setMessages(prev => [...reversedOld, ...prev]);
          
          // Maintain scroll position after React renders
          setTimeout(() => {
            if (chatContainerRef.current) {
              const scrollHeightAfter = chatContainerRef.current.scrollHeight;
              chatContainerRef.current.scrollTop = scrollHeightAfter - scrollHeightBefore;
            }
          }, 0);
        }
      } catch (err) {
        console.error('Error fetching older messages', err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="card glass-card p-xl text-center" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spinning text-accent margin-bottom-md" size={32} />
        <p>Loading chat...</p>
      </div>
    );
  }

  if (error && !messages.length) {
    return (
      <div className="card glass-card p-xl text-center">
        <AlertCircle size={32} className="text-danger margin-bottom-sm mx-auto" />
        <h3 className="text-danger">Chat Error</h3>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="card glass-card meld-chat-card" style={{ display: 'flex', flexDirection: 'column', padding: '0' }}>
      <div className="chat-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="block-title" style={{ margin: 0 }}>Meld Team Chat</h3>
        <span className={`badge ${isConnected ? 'badge-category' : 'badge-status status-closed'}`} style={{ fontSize: '0.7rem' }}>
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>

      <div ref={chatContainerRef} className="chat-messages" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)' }}>
            <Loader2 size={16} className="spin" style={{ display: 'inline' }} />
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center text-muted" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Say hello to your team!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser?.id;
            // Parse date securely
            const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={msg.id || index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                {!isMe && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{msg.sender_name}</div>}
                <div style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  backgroundColor: isMe ? 'var(--accent-primary, #6366f1)' : 'var(--bg-card-hover, rgba(255,255,255,0.05))',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  borderBottomRightRadius: isMe ? '0' : 'var(--radius-md, 8px)',
                  borderBottomLeftRadius: !isMe ? '0' : 'var(--radius-md, 8px)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>
                  {timeString}
                </div>
              </div>
            );
          })
        )}
        {/* Bottom dummy div is no longer strictly needed for this scrolling approach, but we can keep it empty */}
      </div>

      {error && (
        <div style={{ padding: '0.5rem 1rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-card)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
        <input
          type="text"
          className="input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!isConnected}
          style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
          maxLength={2000}
        />
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={!newMessage.trim() || !isConnected}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
