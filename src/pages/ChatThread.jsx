// src/pages/ChatThread.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chatService } from '../services/chatService';
import '../styles/ChatThread.css';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronLeft, Send, Sparkles, Circle, Check, CheckCheck, Pencil, Trash2, Ellipsis } from 'lucide-react';

const getInitials = (name) => {
  if (!name) return 'R';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export default function ChatThread() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const messageMutationUnsubscribeRef = useRef(null);
  const riderPresenceUnsubscribeRef = useRef(null);
  const seenUnsubscribeRef = useRef(null);
  const typingSubscriptionRef = useRef(null);
  const typingStopTimeoutRef = useRef(null);
  const localTypingActiveRef = useRef(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsMenuOpen]);

  const resyncThreadData = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    const convResult = await chatService.getConversation(conversationId);
    if (convResult.success) {
      setConversation(convResult.conversation);
    }

    const msgResult = await chatService.getMessages(conversationId, 100);
    if (msgResult.success) {
      setMessages(msgResult.messages);
    }

    await chatService.markConversationAsSeen(conversationId, user.id);
  }, [conversationId, user?.id]);

  useEffect(() => {
    loadThreadData();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (riderPresenceUnsubscribeRef.current) {
        riderPresenceUnsubscribeRef.current();
      }
      if (messageMutationUnsubscribeRef.current) {
        messageMutationUnsubscribeRef.current();
      }
      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      if (seenUnsubscribeRef.current) {
        seenUnsubscribeRef.current();
      }
    };
  }, [resyncThreadData]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useLayoutEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom('smooth');
    }
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('auto');

    const onResize = () => {
      scrollToBottom('auto');
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [scrollToBottom]);


  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resyncThreadData();
      }
    };

    const onOnline = () => {
      resyncThreadData();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, [conversationId, user?.id]);

  const loadThreadData = async () => {
    if (!conversationId || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Load conversation
      const convResult = await chatService.getConversation(conversationId);
      if (convResult.success) {
        setConversation(convResult.conversation);
      } else {
        throw new Error(convResult.error);
      }

      // Load messages
      const msgResult = await chatService.getMessages(conversationId, 100);
      if (msgResult.success) {
        setMessages(msgResult.messages);
      } else {
        throw new Error(msgResult.error);
      }

      // Mark as seen
      await chatService.markConversationAsSeen(conversationId, user.id);

      // Subscribe to new messages
      unsubscribeRef.current = chatService.subscribeToMessages(
        conversationId,
        (newMsg) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      );

      if (messageMutationUnsubscribeRef.current) {
        messageMutationUnsubscribeRef.current();
      }

      messageMutationUnsubscribeRef.current = chatService.subscribeToMessageMutations(
        conversationId,
        {
          onUpdate: (updatedMessage) => {
            setMessages((prev) => prev.map((msg) => (
              msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            )));
          },
          onDelete: (deletedMessage) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessage.id));
          }
        }
      );

      // Subscribe to realtime rider presence updates while thread is open
      riderPresenceUnsubscribeRef.current = chatService.subscribeToRiders((updatedRider) => {
        if (!updatedRider?.id) return;

        setConversation((prevConversation) => {
          if (!prevConversation?.conversation_participants) return prevConversation;

          const hasTarget = prevConversation.conversation_participants.some(
            (participant) => participant.user_id === updatedRider.id
          );
          if (!hasTarget) return prevConversation;

          return {
            ...prevConversation,
            conversation_participants: prevConversation.conversation_participants.map((participant) => {
              if (participant.user_id !== updatedRider.id) return participant;

              return {
                ...participant,
                profiles: {
                  ...(participant.profiles || {}),
                  id: updatedRider.id,
                  full_name: updatedRider.full_name ?? participant.profiles?.full_name,
                  avatar_url: updatedRider.avatar_url ?? participant.profiles?.avatar_url,
                  role: updatedRider.role ?? participant.profiles?.role,
                  is_online: updatedRider.is_online,
                  last_seen: updatedRider.last_seen
                }
              };
            })
          };
        });
      });

      if (typingSubscriptionRef.current) {
        typingSubscriptionRef.current.unsubscribe();
      }

      typingSubscriptionRef.current = chatService.subscribeToTyping(
        conversationId,
        user.id,
        (typingUserIds) => {
          setIsOtherTyping((typingUserIds || []).length > 0);
        }
      );

      if (seenUnsubscribeRef.current) {
        seenUnsubscribeRef.current();
      }

      seenUnsubscribeRef.current = chatService.subscribeToConversationParticipantSeen(
        conversationId,
        (participantUpdate) => {
          setConversation((prevConversation) => {
            if (!prevConversation?.conversation_participants) return prevConversation;

            return {
              ...prevConversation,
              conversation_participants: prevConversation.conversation_participants.map((participant) => (
                participant.user_id === participantUpdate.user_id
                  ? { ...participant, last_seen_at: participantUpdate.last_seen_at }
                  : participant
              ))
            };
          });
        }
      );
    } catch (err) {
      console.error('Error loading thread:', err);
      setError(err.message || 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !user?.id) return;

    setSending(true);
    const messageText = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}`;

    const optimisticMessage = {
      id: tempMessageId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageText,
      created_at: new Date().toISOString()
    };

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    localTypingActiveRef.current = false;
    typingSubscriptionRef.current?.setTyping(false);

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    const result = await chatService.sendMessage(conversationId, user.id, messageText);
    setSending(false);

    if (!result.success) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
      setNewMessage(messageText);
      setError(result.error || 'Failed to send message');
      return;
    }

    setMessages((prev) => {
      const replaced = prev.map((msg) => (msg.id === tempMessageId ? result.message : msg));
      const unique = [];
      const seen = new Set();

      for (const msg of replaced) {
        if (!msg?.id || seen.has(msg.id)) continue;
        seen.add(msg.id);
        unique.push(msg);
      }

      return unique;
    });
  };

  const handleMessageInputChange = (value) => {
    setNewMessage(value);

    const hasText = value.trim().length > 0;
    if (hasText && !localTypingActiveRef.current) {
      localTypingActiveRef.current = true;
      typingSubscriptionRef.current?.setTyping(true);
    }

    if (!hasText && localTypingActiveRef.current) {
      localTypingActiveRef.current = false;
      typingSubscriptionRef.current?.setTyping(false);
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      return;
    }

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    if (hasText) {
      typingStopTimeoutRef.current = setTimeout(() => {
        localTypingActiveRef.current = false;
        typingSubscriptionRef.current?.setTyping(false);
      }, 1500);
    }
  };

  const handleEditMessage = async (message) => {
    if (!message?.id || message.sender_id !== user?.id) return;

    const nextContent = window.prompt('Edit message', message.content || '');
    if (nextContent === null) return;

    const trimmed = nextContent.trim();
    if (!trimmed) return;

    const result = await chatService.editMessage(message.id, user.id, trimmed);
    if (!result.success) {
      setError(result.error || 'Failed to edit message');
      return;
    }

    if (result.message) {
      setMessages((prev) => prev.map((msg) => (
        msg.id === result.message.id ? { ...msg, ...result.message } : msg
      )));
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!message?.id || message.sender_id !== user?.id) return;

    const shouldDelete = window.confirm('Delete this message?');
    if (!shouldDelete) return;

    const result = await chatService.deleteMessage(message.id, user.id);
    if (!result.success) {
      setError(result.error || 'Failed to delete message');
      return;
    }

    setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
  };

  const handleRenameConversation = async () => {
    if (!conversationId) return;

    const currentName = conversation?.custom_name || '';
    const nextName = window.prompt('Conversation name (leave blank to reset)', currentName);
    if (nextName === null) return;

    const result = await chatService.updateConversationName(conversationId, nextName);
    if (!result.success) {
      setError(result.error || 'Failed to update conversation name');
      return;
    }

    setConversation((prev) => ({
      ...(prev || {}),
      custom_name: result.conversation?.custom_name ?? null
    }));
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;

    const shouldDelete = window.confirm('Delete this conversation and all messages?');
    if (!shouldDelete) return;

    const result = await chatService.deleteConversation(conversationId);
    if (!result.success) {
      setError(result.error || 'Failed to delete conversation');
      return;
    }

    navigate('/chat');
  };

  const getOtherParticipant = () => {
    if (!conversation?.conversation_participants) return null;
    return conversation.conversation_participants.find((p) => p.user_id !== user?.id);
  };

  const otherParticipant = getOtherParticipant();
  const otherProfile = otherParticipant?.profiles || null;
  const threadTitle = conversation?.custom_name || otherProfile?.full_name || 'Unknown rider';
  const otherLastSeenAt = useMemo(() => {
    if (!otherParticipant?.last_seen_at) return null;
    const value = new Date(otherParticipant.last_seen_at);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [otherParticipant?.last_seen_at]);
  const isOtherOnline = Boolean(otherProfile?.is_online);
  const lastSeenText = useMemo(() => {
    if (!otherProfile?.last_seen) return null;
    return formatDistanceToNow(new Date(otherProfile.last_seen), { addSuffix: true });
  }, [otherProfile?.last_seen]);

  if (loading) {
    return (
      <div className="chat-thread-container">
        <div className="chat-thread-loading">
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-thread-container">
      <div className="chat-thread-header">
        <button className="btn-back" onClick={() => navigate(location.state?.backTo || '/chat')}>
          <ChevronLeft size={18} />
          Back
        </button>

        <div className="chat-thread-title">
          <div className="thread-avatar-wrap">
            {otherProfile?.avatar_url ? (
              <img src={otherProfile.avatar_url} alt={otherProfile.full_name || 'Rider'} className="thread-avatar" />
            ) : (
              <div className="thread-avatar thread-avatar-fallback">
                {getInitials(otherProfile?.full_name)}
              </div>
            )}
            <span className={`thread-presence ${isOtherOnline ? 'online' : 'offline'}`} />
          </div>

          <div className="thread-title-copy">
            <div className="thread-title-row">
              <h2>{threadTitle}</h2>
              <span className={`thread-status-badge ${isOtherOnline ? 'online' : 'offline'}`}>
                <Circle size={8} fill="currentColor" />
                {isOtherOnline ? 'Online' : 'Offline'}
              </span>
              <div className="thread-actions" ref={settingsMenuRef}>
                <button
                  type="button"
                  className="thread-action-btn thread-action-btn-menu"
                  onClick={() => setSettingsMenuOpen((prev) => !prev)}
                  title="Conversation settings"
                >
                  <Ellipsis size={16} />
                </button>
                {settingsMenuOpen && (
                  <div className="thread-settings-menu">
                    <button type="button" className="thread-settings-item" onClick={() => { setSettingsMenuOpen(false); handleRenameConversation(); }}>
                      Rename conversation
                    </button>
                    <button type="button" className="thread-settings-item danger" onClick={() => { setSettingsMenuOpen(false); handleDeleteConversation(); }}>
                      Delete conversation
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="thread-subtitle">
              {conversation?.type === 'admin_rider' ? 'Admin support chat' : 'Rider conversation'}
            </p>

            <div className="thread-meta-row">
              {conversation?.type === 'customer_rider' && conversation?.orders && (
                <span className="order-info">
                  Order #{conversation.orders.id?.slice(0, 8)}
                </span>
              )}
              {lastSeenText && (
                <span className="thread-meta-note">Last seen {lastSeenText}</span>
              )}
              {isOtherTyping && (
                <span className="thread-meta-note thread-typing-note">typing...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-messages">
            <div className="empty-state-card">
              <Sparkles size={18} />
              <p>No messages yet. Start the conversation.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === user?.id;
            const messageTime = new Date(msg.created_at);
            const isMessageSeen = Boolean(
              isCurrentUser &&
              otherLastSeenAt &&
              !Number.isNaN(messageTime.getTime()) &&
              messageTime <= otherLastSeenAt
            );

            return (
              <div key={msg.id} className={`message ${isCurrentUser ? 'current-user' : ''}`}>
                <div className="message-bubble">
                  {!isCurrentUser && (
                    <div className="message-sender">{msg.profiles?.full_name || 'Unknown'}</div>
                  )}
                  <p className="message-content">{msg.content}</p>
                  <span className="message-time">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {isCurrentUser && (
                    <span className="message-actions">
                      <button
                        type="button"
                        className="message-action-btn"
                        onClick={() => setOpenMessageMenuId((prev) => (prev === msg.id ? null : msg.id))}
                        title="Message settings"
                      >
                        <Ellipsis size={12} />
                      </button>
                      {openMessageMenuId === msg.id && (
                        <span className="message-settings-menu">
                          <button type="button" className="message-settings-item" onClick={() => { setOpenMessageMenuId(null); handleEditMessage(msg); }}>
                            Edit
                          </button>
                          <button type="button" className="message-settings-item danger" onClick={() => { setOpenMessageMenuId(null); handleDeleteMessage(msg); }}>
                            Delete
                          </button>
                        </span>
                      )}
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className={`message-receipt ${isMessageSeen ? 'seen' : 'delivered'}`}>
                      {isMessageSeen ? <CheckCheck size={12} /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleMessageInputChange(e.target.value)}
          placeholder={`Message ${threadTitle || 'rider'}...`}
          disabled={sending}
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="btn btn-send"
        >
          {sending ? '...' : <><Send size={16} /> Send</>}
        </button>
      </form>
    </div>
  );
}
