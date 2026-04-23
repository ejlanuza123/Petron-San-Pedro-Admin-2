// src/pages/ChatInbox.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services/chatService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MessageCircle, Loader2, Search, Sparkles, Circle } from 'lucide-react';
import '../styles/ChatInbox.css';
import { formatDistanceToNow } from 'date-fns';

const PRESENCE_FALLBACK_MINUTES = 2;
const RECONCILE_INTERVAL_MS = 75000;

const toMillis = (value) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const isConversationUnread = (conversation) => {
  const lastSeenMs = toMillis(conversation?.lastSeenAt);
  const updatedMs = toMillis(conversation?.updated_at);
  if (lastSeenMs === null || updatedMs === null) return false;
  return lastSeenMs < updatedMs;
};

const isRiderOnline = (rider) => {
  // Source of truth: backend-maintained realtime presence flag.
  if (typeof rider?.is_online === 'boolean') {
    return rider.is_online;
  }

  // Fallback for environments where is_online may be temporarily missing.
  if (!rider?.last_seen) return false;
  const lastSeen = new Date(rider.last_seen);
  if (Number.isNaN(lastSeen.getTime())) return false;

  const diffMinutes = (Date.now() - lastSeen.getTime()) / (1000 * 60);
  return diffMinutes < PRESENCE_FALLBACK_MINUTES;
};

const getRiderAvatarUrl = (rider) => (
  rider?.avatar_url || rider?.photo_url || rider?.profile_pic || rider?.picture_url || null
);

const getInitials = (name) => {
  if (!name) return 'R';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export default function ChatInbox() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [error, setError] = useState(null);
  const [chatInFlightRiderId, setChatInFlightRiderId] = useState(null);
  const [riderSearch, setRiderSearch] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const conversationUnsubscribeRef = useRef(null);
  const riderUnsubscribeRef = useRef(null);
  const unreadUnsubscribeRef = useRef(null);
  const syncTimerRef = useRef(null);
  const bootstrapCompleteRef = useRef(false);
  const stickyUnreadRef = useRef(new Set());

  const loadConversations = useCallback(async (options = {}) => {
    const { showLoader = true } = options;
    if (!user?.id) return;

    if (showLoader) {
      setLoadingConversations(true);
    }
    setError(null);

    const result = await chatService.getConversations(user.id, 100);
    if (result.success) {
      setConversations(() => {
        const nextConversations = (result.conversations || []).map((conversation) => {
          const conversationKey = String(conversation.conversationId);
          const computedUnread = Boolean(conversation.isUnread || isConversationUnread(conversation));
          const stickyUnread = stickyUnreadRef.current.has(conversationKey);
          const nextUnread = computedUnread || stickyUnread;

          if (nextUnread) {
            stickyUnreadRef.current.add(conversationKey);
          }

          return {
            ...conversation,
            isUnread: nextUnread
          };
        });

        return nextConversations;
      });
    } else {
      setError(result.error || 'Failed to load conversations');
    }

    if (showLoader) {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  const loadRiders = useCallback(async (options = {}) => {
    const { showLoader = true } = options;
    try {
      if (showLoader) {
        setLoadingRiders(true);
      }
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online, last_seen, phone_number, role, vehicle_type, vehicle_plate')
        .eq('role', 'rider')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setRiders(data || []);
    } catch (err) {
      console.error('Error loading riders:', err);
      setError(err.message || 'Failed to load riders');
    } finally {
      if (showLoader) {
        setLoadingRiders(false);
      }
    }
  }, []);

  const applyRealtimeConversationUpdate = useCallback((event) => {
    const row = event?.payload?.new;
    if (!row) return false;

    if (event.source === 'participants') {
      const conversationId = row.conversation_id;
      if (!conversationId) return false;

      let didChange = false;

      setConversations((prev) => {
        let changed = false;
        const next = prev.map((conversation) => {
          if (String(conversation.conversationId) !== String(conversationId)) {
            return conversation;
          }

          const previousLastSeenAt = conversation.lastSeenAt;
          const nextLastSeenAt = row.last_seen_at || conversation.lastSeenAt;
          const nextUnread = isConversationUnread({
            ...conversation,
            lastSeenAt: nextLastSeenAt
          });
          const conversationKey = String(conversation.conversationId);

          if (previousLastSeenAt === nextLastSeenAt) {
            return conversation;
          }

          changed = true;

          return {
            ...conversation,
            lastSeenAt: nextLastSeenAt,
            isUnread: Boolean(conversation.isUnread || nextUnread || stickyUnreadRef.current.has(conversationKey))
          };
        });

        didChange = changed;
        return changed ? next : prev;
      });

      return didChange;
    }

    if (event.source === 'messages') {
      const conversationId = row.conversation_id;
      if (!conversationId) return false;

      let didChange = false;

      setConversations((prev) => {
        const index = prev.findIndex(
          (conversation) => String(conversation.conversationId) === String(conversationId)
        );

        if (index === -1) return prev;

        const next = [...prev];
        const existing = next[index];
        const updatedAt = row.created_at || existing.updated_at;
        const lastSeenAt = row.sender_id === user?.id ? updatedAt : existing.lastSeenAt;
        const nextUnread = row.sender_id === user?.id ? false : true;
        const conversationKey = String(existing.conversationId);

        if (nextUnread) {
          stickyUnreadRef.current.add(conversationKey);
        }
        const patched = {
          ...existing,
          updated_at: updatedAt,
          last_message: row.content || existing.last_message,
          lastSeenAt,
          isUnread: nextUnread
        };

        next.splice(index, 1);
        didChange = true;
        return [patched, ...next];
      });

      return didChange;
    }

    return false;
  }, [user?.id]);

  const handleRealtimeResync = useCallback(() => {
    if (!bootstrapCompleteRef.current) {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      setIsSyncing(true);
    }, 500);

    Promise.all([
      loadConversations({ showLoader: false }),
      loadRiders({ showLoader: false })
    ]).finally(() => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      setIsSyncing(false);
    });
  }, [loadConversations, loadRiders]);

  useEffect(() => {
    if (!user?.id) return;

    const bootstrap = async () => {
      await Promise.all([loadConversations(), loadRiders()]);
      bootstrapCompleteRef.current = true;
    };

    bootstrap();

    conversationUnsubscribeRef.current = chatService.subscribeToConversations(
      user.id,
      (newConversation) => {
        setConversations((prev) => {
          const participants = newConversation.conversation_participants || newConversation.participants || [];
          const ownParticipant = participants.find((participant) => participant.user_id === user.id);
          const lastSeenAt = ownParticipant?.last_seen_at || newConversation.updated_at;
          const normalizedConversation = {
            conversationId: newConversation.id,
            ...newConversation,
            participants,
            lastSeenAt,
            isUnread: isConversationUnread({
              ...newConversation,
              lastSeenAt
            })
          };

          const next = prev.filter((conversation) => conversation.conversationId !== normalizedConversation.conversationId);
          return [normalizedConversation, ...next];
        });
      }
    );

    unreadUnsubscribeRef.current = chatService.subscribeToUnreadChanges(user.id, (event) => {
      const handled = applyRealtimeConversationUpdate(event);
      if (!handled) {
        loadConversations({ showLoader: false });
      }
    });

    riderUnsubscribeRef.current = chatService.subscribeToRiders((changedRider) => {
      if (changedRider?.role !== 'rider') return;

      setRiders((prev) => {
        if (changedRider.__eventType === 'DELETE') {
          return prev.filter((rider) => rider.id !== changedRider.id);
        }

        const exists = prev.some((rider) => rider.id === changedRider.id);
        const next = exists
          ? prev.map((rider) => (rider.id === changedRider.id ? { ...rider, ...changedRider } : rider))
          : [changedRider, ...prev];

        return next.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      });
    });

    return () => {
      if (conversationUnsubscribeRef.current) {
        conversationUnsubscribeRef.current();
        conversationUnsubscribeRef.current = null;
      }

      if (riderUnsubscribeRef.current) {
        riderUnsubscribeRef.current();
        riderUnsubscribeRef.current = null;
      }

      if (unreadUnsubscribeRef.current) {
        unreadUnsubscribeRef.current();
        unreadUnsubscribeRef.current = null;
      }

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      bootstrapCompleteRef.current = false;
    };
  }, [user?.id, loadConversations, loadRiders, applyRealtimeConversationUpdate]);

  useEffect(() => {
    if (!selectedRiderId && riders.length > 0) {
      setSelectedRiderId(riders[0].id);
    }
  }, [riders, selectedRiderId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRealtimeResync();
      }
    };

    const onOnline = () => {
      handleRealtimeResync();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, [handleRealtimeResync]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!bootstrapCompleteRef.current) {
        return;
      }

      if (document.visibilityState !== 'visible') {
        return;
      }

      handleRealtimeResync();
    }, RECONCILE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [handleRealtimeResync]);

  const filteredRiders = useMemo(() => {
    const query = riderSearch.trim().toLowerCase();
    if (!query) return riders;

    return riders.filter((rider) => {
      const name = rider.full_name || '';
      const phone = rider.phone_number || '';
      return name.toLowerCase().includes(query) || phone.toLowerCase().includes(query);
    });
  }, [riders, riderSearch]);

  const onlineRidersCount = useMemo(
    () => riders.filter((rider) => isRiderOnline(rider)).length,
    [riders]
  );

  const unreadConversationCount = useMemo(
    () => conversations.filter((conversation) => Boolean(conversation.isUnread || isConversationUnread(conversation))).length,
    [conversations]
  );

  const selectedRider = useMemo(
    () => filteredRiders.find((rider) => rider.id === selectedRiderId) || filteredRiders[0] || null,
    [filteredRiders, selectedRiderId]
  );

  const handleChatWithRider = useCallback(async (rider) => {
    if (!user?.id || !rider?.id) {
      setError('Sign in again to start a chat.');
      return;
    }

    setChatInFlightRiderId(rider.id);
    const result = await chatService.getOrCreateAdminRiderConversation(user.id, rider.id);
    setChatInFlightRiderId(null);

    if (result.success) {
      if (result.conversation?.id) {
        stickyUnreadRef.current.delete(String(result.conversation.id));
      }
      navigate(`/chat/${result.conversation.id}`, { state: { backTo: '/chat' } });
    } else {
      setError(result.error || 'Failed to start chat with rider');
    }
  }, [user?.id, navigate]);

  const handleOpenConversation = useCallback((conversationId) => {
    const conversationKey = String(conversationId);
    stickyUnreadRef.current.delete(conversationKey);

    setConversations((prev) => prev.map((conversation) => (
      String(conversation.conversationId) === conversationKey
        ? { ...conversation, isUnread: false }
        : conversation
    )));

    navigate(`/chat/${conversationId}`);
  }, [navigate]);

  const handleRefresh = async () => {
    await Promise.all([
      loadConversations({ showLoader: false }),
      loadRiders({ showLoader: false })
    ]);
  };

  const getOtherParticipant = (conversation) => {
    const other = conversation.participants?.find((participant) => participant.user_id !== user?.id);
    return other?.profiles || null;
  };

  const getConversationLabel = (conversation) => {
    return conversation.type === 'admin_rider' ? 'Support' : 'Order';
  };

  return (
    <div className="chat-inbox-shell">
      <div className="chat-inbox-hero">
        <div>
          <div className="hero-kicker">
            <Sparkles size={14} />
            Live rider messaging
          </div>
          <h1>Admin inbox</h1>
          <p>
            Hi {profile?.full_name || 'Admin'}, message riders instantly, see who is online, and follow live profile updates without refreshing.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span>Riders</span>
            <strong>{riders.length}</strong>
          </div>
          <div className="hero-stat">
            <span>Online</span>
            <strong>{onlineRidersCount}</strong>
          </div>
          <button className="btn btn-refresh hero-refresh" onClick={handleRefresh} disabled={loadingConversations || loadingRiders}>
            Refresh now
          </button>
          {isSyncing && <span className="hero-syncing-pill">Syncing...</span>}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="chat-inbox-grid">
        <aside className="riders-panel">
          <div className="panel-heading">
            <div>
              <h2>Riders</h2>
              <p>Tap a rider to start a support chat</p>
            </div>
            <span className="panel-count">{filteredRiders.length}</span>
          </div>

          <label className="rider-search">
            <Search size={16} />
            <input
              type="text"
              value={riderSearch}
              onChange={(event) => setRiderSearch(event.target.value)}
              placeholder="Search riders"
            />
          </label>

          <div className="rider-list">
            {loadingRiders && riders.length === 0 ? (
              <div className="chat-loading">
                <p>Loading riders...</p>
              </div>
            ) : filteredRiders.length === 0 ? (
              <div className="chat-empty">
                <p>No riders found</p>
                <p className="subtitle">Try a different search or wait for realtime updates</p>
              </div>
            ) : (
              filteredRiders.map((rider) => {
                const isOnline = isRiderOnline(rider);
                const isChatting = chatInFlightRiderId === rider.id;
                const isActive = selectedRider?.id === rider.id;
                const avatarUrl = getRiderAvatarUrl(rider);

                return (
                    <div
                    key={rider.id}
                    className={`rider-card ${isActive ? 'active' : ''}`}
                  >
                      <button
                        type="button"
                        onClick={() => setSelectedRiderId(rider.id)}
                        className="rider-card-main"
                      >
                        <div className="rider-avatar">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={rider.full_name || 'Rider'} />
                          ) : (
                            <div className="avatar-placeholder">
                              {getInitials(rider.full_name)}
                            </div>
                          )}
                          <span className={`online-indicator ${isOnline ? 'online' : 'offline'}`} />
                        </div>

                        <div className="rider-copy">
                          <div className="rider-name-row">
                            <p className="rider-name">{rider.full_name || 'Unknown rider'}</p>
                            <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
                              <Circle size={8} fill="currentColor" />
                              {isOnline ? 'Online now' : 'Offline'}
                            </span>
                          </div>
                          <p className="rider-subtitle">
                            {rider.phone_number || 'No phone listed'}
                          </p>
                          <p className="rider-meta">
                            {rider.vehicle_type || 'Vehicle unknown'}
                            {rider.vehicle_plate ? ` • ${rider.vehicle_plate}` : ''}
                            {!isOnline && rider.last_seen ? ` • Last seen ${formatDistanceToNow(new Date(rider.last_seen), { addSuffix: true })}` : ''}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChatWithRider(rider)}
                        disabled={isChatting}
                        className="btn-chat-rider"
                        title="Start chat with rider"
                      >
                        {isChatting ? <Loader2 size={18} className="spin" /> : <MessageCircle size={18} />}
                      </button>
                    </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="conversations-panel">
          <div className="panel-heading">
            <div>
              <h2>Conversations</h2>
              <p>Keep track of active rider support threads</p>
            </div>
            <span className="panel-count panel-count-alert">{unreadConversationCount}</span>
          </div>

          <div className="conversation-list">
            {loadingConversations && conversations.length === 0 ? (
              <div className="chat-loading">
                <p>Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty">
                <p>No conversations yet</p>
                <p className="subtitle">Rider messages and support threads will appear here</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const other = getOtherParticipant(conversation);
                const conversationTitle = conversation.custom_name || other?.full_name || 'Unknown';
                const label = getConversationLabel(conversation);
                const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), {
                  addSuffix: true
                });
                const isUnread = Boolean(conversation.isUnread);

                return (
                  <button
                    key={conversation.conversationId}
                    type="button"
                    className={`chat-item ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleOpenConversation(conversation.conversationId)}
                  >
                    <div className="chat-item-avatar">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt={other?.full_name || 'Chat participant'} />
                      ) : (
                        <div className="avatar-placeholder subtle">
                          {getInitials(other?.full_name || 'Rider')}
                        </div>
                      )}
                    </div>

                    <div className="chat-item-content">
                      <div className="chat-item-header">
                        <span className="chat-name">{conversationTitle}</span>
                        <span className="chat-time">{timeAgo}</span>
                      </div>
                      <div className="chat-item-meta">
                        <span className={`label ${label === 'Support' ? 'support' : 'order'}`}>
                          {label}
                        </span>
                        {conversation.orders && (
                          <span className="order-info">
                            Order #{conversation.orders.id?.slice(0, 8)} • {conversation.orders.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {isUnread && <div className="unread-badge" />}
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
