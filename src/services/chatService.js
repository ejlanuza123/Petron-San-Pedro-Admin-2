// src/services/chatService.js
import { supabase } from '../lib/supabase';

const toMillis = (value) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const isConversationUnread = (lastSeenAt, updatedAt) => {
  const lastSeenMs = toMillis(lastSeenAt);
  const updatedMs = toMillis(updatedAt);
  if (lastSeenMs === null || updatedMs === null) return false;
  return lastSeenMs < updatedMs;
};

export const chatService = {
  /**
   * Get or create an admin-rider support conversation
   */
  async getOrCreateAdminRiderConversation(adminId, riderId) {
    try {
      const existingResult = await chatService.getConversations(adminId, 1000);
      if (existingResult.success) {
        const existingConversation = existingResult.conversations.find((conversation) =>
          conversation.type === 'admin_rider' &&
          conversation.participants?.some((participant) => participant.user_id === riderId)
        );

        if (existingConversation) {
          return { success: true, conversation: existingConversation };
        }
      }

      // Get current session to verify admin status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: 'Not authenticated. Please sign in again.' };
      }

      // Verify admin profile exists with admin role
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return { 
          success: false, 
          error: `Admin profile not found. Please contact support. (ID: ${session.user.id})` 
        };
      }

      if (!adminProfile) {
        return { 
          success: false, 
          error: 'Admin profile does not exist in the database.' 
        };
      }

      if (adminProfile.role !== 'admin') {
        return { 
          success: false, 
          error: `Account role is "${adminProfile.role}", not "admin". Only admins can create conversations.` 
        };
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([
          {
            type: 'admin_rider',
            order_id: null
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('RLS Error details:', {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          adminProfile: { id: adminProfile.id, role: adminProfile.role }
        });
        
        // Provide more helpful error message
        if (createError.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: `Database permission denied. Admin profile role: "${adminProfile.role}". This might be a database configuration issue. Contact support if the issue persists.` 
          };
        }
        
        return { success: false, error: `Failed to create conversation: ${createError.message}` };
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: adminId },
          { conversation_id: newConversation.id, user_id: riderId }
        ]);

      if (participantsError) {
        console.error('Participants insert error:', participantsError);
        // Delete the conversation we just created since we can't add participants
        await supabase.from('conversations').delete().eq('id', newConversation.id);
        throw participantsError;
      }

      return { success: true, conversation: newConversation, isNew: true };
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      return { success: false, error: error.message || 'Failed to create conversation' };
    }
  },

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          orders (id, status, total_amount, user_id),
          conversation_participants (
            user_id,
            last_seen_at,
            profiles (id, full_name, avatar_url, role, is_online, last_seen)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return { success: true, conversation: data };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all conversations for the current admin user
   */
  async getConversations(userId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          joined_at,
          last_seen_at,
          conversations (
            id,
            type,
            custom_name,
            order_id,
            created_at,
            updated_at,
            orders (id, status, total_amount, user_id),
            conversation_participants (
              user_id,
              last_seen_at,
              profiles (id, full_name, avatar_url, role, is_online, last_seen)
            )
          )
        `)
        .eq('user_id', userId)
        .order('conversations(updated_at)', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Map to flattened structure with unread info
      const conversations = (data || []).map((p) => {
        return {
          conversationId: p.conversation_id,
          ...p.conversations,
          participants: p.conversations.conversation_participants,
          lastSeenAt: p.last_seen_at,
          isUnread: isConversationUnread(p.last_seen_at, p.conversations.updated_at)
        };
      });

      return { success: true, conversations };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(conversationId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!sender_id (id, full_name, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return { success: true, messages: (data || []).reverse() };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId, senderId, content) {
    if (!content || !content.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: senderId,
            content: content.trim()
          }
        ])
        .select(`
          *,
          profiles!sender_id (id, full_name, avatar_url, role)
        `)
        .single();

      if (error) throw error;

      return { success: true, message: data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Edit a message authored by the current user.
   */
  async editMessage(messageId, senderId, content) {
    const trimmed = (content || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty' };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content: trimmed })
        .eq('id', messageId)
        .eq('sender_id', senderId)
        .select(`
          *,
          profiles!sender_id (id, full_name, avatar_url, role)
        `)
        .single();

      if (error) throw error;

      return { success: true, message: data };
    } catch (error) {
      console.error('Error editing message:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a message authored by the current user.
   */
  async deleteMessage(messageId, senderId) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', senderId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update conversation custom name.
   */
  async updateConversationName(conversationId, customName) {
    try {
      const normalizedName = (customName || '').trim() || null;
      const { data, error } = await supabase
        .from('conversations')
        .update({ custom_name: normalizedName })
        .eq('id', conversationId)
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, conversation: data };
    } catch (error) {
      console.error('Error updating conversation name:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subscribe to new messages in a conversation (realtime)
   */
  subscribeToMessages(conversationId, onNewMessage) {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Fetch sender profile for new message
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', payload.new.sender_id)
            .single()
            .then(({ data: profile }) => {
              onNewMessage({
                ...payload.new,
                profiles: profile
              });
            })
            .catch((err) => {
              console.error('Error fetching sender profile:', err);
              onNewMessage(payload.new);
            });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages in conversation ${conversationId}`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Subscribe to message update/delete events in a conversation.
   */
  subscribeToMessageMutations(conversationId, handlers = {}) {
    const channel = supabase
      .channel(`conversation-mutations-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (typeof handlers.onUpdate !== 'function' || !payload?.new) return;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role')
              .eq('id', payload.new.sender_id)
              .single();

            handlers.onUpdate({ ...payload.new, profiles: profile || null });
          } catch {
            handlers.onUpdate(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (typeof handlers.onDelete === 'function' && payload?.old) {
            handlers.onDelete(payload.old);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Subscribe to new conversations (realtime)
   */
  subscribeToConversations(userId, onNewConversation) {
    const channel = supabase
      .channel(`user-conversations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Fetch full conversation details
          supabase
            .from('conversations')
            .select(`
              *,
              conversation_participants (
                user_id,
                last_seen_at,
                profiles (id, full_name, avatar_url, role, is_online, last_seen)
              ),
              orders (id, status, total_amount, user_id)
            `)
            .eq('id', payload.new.conversation_id)
            .single()
            .then(({ data: conversation }) => {
              onNewConversation(conversation);
            })
            .catch((err) => {
              console.error('Error fetching new conversation:', err);
            });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to conversations for user ${userId}`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Subscribe to rider profile updates for realtime inbox presence/avatar updates
   */
  subscribeToRiders(onRiderChange) {
    const channel = supabase
      .channel('riders-directory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.rider'
        },
        (payload) => {
          const riderRecord = payload.new || payload.old;
          if (typeof onRiderChange === 'function' && riderRecord) {
            onRiderChange({
              ...riderRecord,
              __eventType: payload.eventType
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to rider profile updates');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Subscribe to events that affect unread counters in realtime.
   */
  subscribeToUnreadChanges(userId, onUnreadChange) {
    const channel = supabase
      .channel(`unread-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (typeof onUnreadChange === 'function') {
            onUnreadChange({ source: 'messages', payload });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (typeof onUnreadChange === 'function') {
            onUnreadChange({ source: 'participants', payload });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (typeof onUnreadChange === 'function') {
            onUnreadChange({ source: 'participants', payload });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to unread changes for user ${userId}`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Subscribe to typing state in a conversation via realtime presence.
   */
  subscribeToTyping(conversationId, userId, onTypingChange) {
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    const emitTypingUsers = () => {
      const presenceState = channel.presenceState();
      const typingUserIds = [];

      Object.values(presenceState).forEach((entries) => {
        (entries || []).forEach((entry) => {
          if (!entry?.user_id || entry.user_id === userId) return;
          if (entry.is_typing) {
            typingUserIds.push(entry.user_id);
          }
        });
      });

      if (typeof onTypingChange === 'function') {
        onTypingChange(Array.from(new Set(typingUserIds)));
      }
    };

    channel
      .on('presence', { event: 'sync' }, emitTypingUsers)
      .on('presence', { event: 'join' }, emitTypingUsers)
      .on('presence', { event: 'leave' }, emitTypingUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            conversation_id: conversationId,
            is_typing: false,
            updated_at: new Date().toISOString()
          });
        }
      });

    const setTyping = async (isTyping) => {
      try {
        await channel.track({
          user_id: userId,
          conversation_id: conversationId,
          is_typing: Boolean(isTyping),
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating typing state:', error);
      }
    };

    return {
      setTyping,
      unsubscribe: () => {
        if (typeof channel.untrack === 'function') {
          channel.untrack();
        }
        channel.unsubscribe();
      }
    };
  },

  /**
   * Subscribe to participant seen updates in a conversation.
   */
  subscribeToConversationParticipantSeen(conversationId, onParticipantSeen) {
    const channel = supabase
      .channel(`conversation-seen-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (typeof onParticipantSeen === 'function' && payload?.new) {
            onParticipantSeen(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Update last_seen_at when user views a conversation
   */
  async markConversationAsSeen(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking conversation as seen:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get unread count for a specific conversation
   */
  async getUnreadCount(conversationId, userId) {
    try {
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('last_seen_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (participantError) throw participantError;

      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', participant.last_seen_at);

      if (countError) throw countError;

      return { success: true, unreadCount: count || 0 };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get total unread count for all conversations
   */
  async getTotalUnreadCount(userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          last_seen_at,
          conversations (updated_at)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const unreadCount = (data || []).filter(
        (p) => new Date(p.last_seen_at) < new Date(p.conversations.updated_at)
      ).length;

      return { success: true, totalUnreadCount: unreadCount };
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId, excludeUserId = null) {
    try {
      let query = supabase
        .from('conversation_participants')
        .select(`
          user_id,
          joined_at,
          last_seen_at,
          profiles (id, full_name, avatar_url, role)
        `)
        .eq('conversation_id', conversationId);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        participants: data || []
      };
    } catch (error) {
      console.error('Error fetching participants:', error);
      return { success: false, error: error.message };
    }
  }
};
