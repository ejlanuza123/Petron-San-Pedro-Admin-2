// src/__tests__/services/chatService.test.js
import { chatService } from '../../services/chatService';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }
}));

import { supabase } from '../../lib/supabase';

describe('chatService (admin-web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'admin-1'
          }
        }
      },
      error: null
    });
  });

  describe('getOrCreateAdminRiderConversation', () => {
    it('returns existing conversation if found', async () => {
      const mockConversation = {
        id: 'conv-1',
        type: 'admin_rider',
        order_id: null,
        created_at: '2026-04-20T00:00:00Z',
        participants: [
          { user_id: 'admin-1' },
          { user_id: 'rider-1' }
        ]
      };

      vi.spyOn(chatService, 'getConversations').mockResolvedValueOnce({
        success: true,
        conversations: [mockConversation]
      });

      const result = await chatService.getOrCreateAdminRiderConversation('admin-1', 'rider-1');

      expect(result.success).toBe(true);
      expect(result.conversation).toEqual(mockConversation);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('creates new conversation if none exists', async () => {
      const mockNewConversation = {
        id: 'conv-2',
        type: 'admin_rider',
        order_id: null,
        created_at: '2026-04-20T00:00:00Z'
      };

      vi.spyOn(chatService, 'getConversations').mockResolvedValueOnce({
        success: true,
        conversations: []
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-1', role: 'admin', full_name: 'Admin' },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'conversations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockNewConversation, error: null })
              })
            })
          };
        }
        if (table === 'conversation_participants') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
      });

      const result = await chatService.getOrCreateAdminRiderConversation('admin-1', 'rider-1');

      expect(result.success).toBe(true);
      expect(result.conversation).toEqual(mockNewConversation);
      expect(result.isNew).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('sends a message successfully', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello',
        created_at: '2026-04-20T00:00:00Z',
        profiles: {
          id: 'user-1',
          full_name: 'Admin User',
          avatar_url: null,
          role: 'admin'
        }
      };

      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockMessage, error: null })
          })
        })
      });

      const result = await chatService.sendMessage('conv-1', 'user-1', 'Hello');

      expect(result.success).toBe(true);
      expect(result.message).toEqual(mockMessage);
    });

    it('returns error for empty message', async () => {
      const result = await chatService.sendMessage('conv-1', 'user-1', '   ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });
  });

  describe('getConversations', () => {
    it('fetches conversations for admin user', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-1',
          last_seen_at: '2026-04-19T00:00:00Z',
          conversations: {
            id: 'conv-1',
            type: 'admin_rider',
            order_id: null,
            created_at: '2026-04-20T00:00:00Z',
            updated_at: '2026-04-20T12:00:00Z',
            conversation_participants: [
              { user_id: 'admin-1', last_seen_at: '2026-04-20T10:00:00Z', profiles: { full_name: 'Admin', role: 'admin' } },
              { user_id: 'rider-1', last_seen_at: '2026-04-19T00:00:00Z', profiles: { full_name: 'Rider', role: 'rider' } }
            ]
          }
        }
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockConversations, error: null })
            })
          })
        })
      });

      const result = await chatService.getConversations('admin-1', 100);

      expect(result.success).toBe(true);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].isUnread).toBe(true);
    });
  });

  describe('getTotalUnreadCount', () => {
    it('returns total unread count', async () => {
      const mockParticipants = [
        {
          last_seen_at: '2026-04-19T00:00:00Z',
          conversations: { updated_at: '2026-04-20T12:00:00Z' }
        },
        {
          last_seen_at: '2026-04-20T13:00:00Z',
          conversations: { updated_at: '2026-04-20T12:00:00Z' }
        }
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockParticipants, error: null })
        })
      });

      const result = await chatService.getTotalUnreadCount('admin-1');

      expect(result.success).toBe(true);
      expect(result.totalUnreadCount).toBe(1);
    });
  });

  describe('subscribeToMessages', () => {
    it('subscribes to messages in a conversation', () => {
      const mockUnsubscribe = vi.fn();

      supabase.channel.mockReturnValue({
        on: vi.fn().mockReturnValue({
          subscribe: vi.fn().mockReturnValue({
            unsubscribe: mockUnsubscribe
          })
        })
      });

      const mockCallback = vi.fn();
      const unsubscribe = chatService.subscribeToMessages('conv-1', mockCallback);

      expect(supabase.channel).toHaveBeenCalledWith('conversation-conv-1');
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('subscribeToRiders', () => {
    it('subscribes to rider profile updates', () => {
      const mockUnsubscribe = vi.fn();

      supabase.channel.mockReturnValue({
        on: vi.fn().mockReturnValue({
          subscribe: vi.fn().mockReturnValue({
            unsubscribe: mockUnsubscribe
          })
        })
      });

      const mockCallback = vi.fn();
      const unsubscribe = chatService.subscribeToRiders(mockCallback);

      expect(supabase.channel).toHaveBeenCalledWith('riders-directory');
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('subscribeToUnreadChanges', () => {
    it('subscribes to unread-related realtime events', () => {
      const mockUnsubscribe = vi.fn();
      const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
      const mockOn = vi.fn().mockReturnThis();

      supabase.channel.mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe
      });

      const callback = vi.fn();
      const unsubscribe = chatService.subscribeToUnreadChanges('user-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('unread-changes-user-1');
      expect(mockOn).toHaveBeenCalledTimes(3);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('subscribeToTyping', () => {
    it('subscribes to typing presence and exposes controls', () => {
      const mockUnsubscribe = vi.fn();
      const mockTrack = vi.fn().mockResolvedValue(undefined);
      const mockUntrack = vi.fn();

      const channel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe }),
        presenceState: vi.fn().mockReturnValue({}),
        track: mockTrack,
        untrack: mockUntrack,
        unsubscribe: mockUnsubscribe
      };

      supabase.channel.mockReturnValue(channel);

      const callback = vi.fn();
      const typing = chatService.subscribeToTyping('conv-1', 'user-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('typing-conv-1', {
        config: { presence: { key: 'user-1' } }
      });
      expect(channel.on).toHaveBeenCalledTimes(3);
      expect(typeof typing.setTyping).toBe('function');
      expect(typeof typing.unsubscribe).toBe('function');

      typing.setTyping(true);
      typing.unsubscribe();

      expect(mockUntrack).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToConversationParticipantSeen', () => {
    it('subscribes to participant seen updates', () => {
      const mockUnsubscribe = vi.fn();
      const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
      const mockOn = vi.fn().mockReturnThis();

      supabase.channel.mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe
      });

      const callback = vi.fn();
      const unsubscribe = chatService.subscribeToConversationParticipantSeen('conv-1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('conversation-seen-conv-1');
      expect(mockOn).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('markConversationAsSeen', () => {
    it('updates last_seen_at for conversation', async () => {
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      });

      const result = await chatService.markConversationAsSeen('conv-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('returns error if update fails', async () => {
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
          })
        })
      });

      const result = await chatService.markConversationAsSeen('conv-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('getMessages', () => {
    it('fetches messages with pagination', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Test message',
          created_at: '2026-04-20T00:00:00Z',
          profiles: { full_name: 'Admin', role: 'admin' }
        }
      ];

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockMessages.reverse(), error: null })
            })
          })
        })
      });

      const result = await chatService.getMessages('conv-1', 100, 0);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1);
    });
  });
});
