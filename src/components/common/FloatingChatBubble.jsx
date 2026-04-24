import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { chatService } from '../../services/chatService';

const BASE_BOTTOM_PX = 24;
const RIGHT_PX = 24;

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

export default function FloatingChatBubble({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [verticalOffset, setVerticalOffset] = useState(0);

  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startY: 0,
    startOffset: 0
  });

  const hiddenOnChatRoute = useMemo(() => location.pathname.startsWith('/chat'), [location.pathname]);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return;

    const result = await chatService.getConversations(userId, 100);
    if (result.success) {
      const unread = (result.conversations || []).filter((conversation) => {
        if (typeof conversation?.isUnread === 'boolean') {
          return conversation.isUnread;
        }

        return isConversationUnread(conversation);
      }).length;

      setUnreadCount(unread);
    }
  }, [userId]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return undefined;
    }

    const unsubscribeUnread = chatService.subscribeToUnreadChanges(userId, () => {
      refreshUnreadCount();
    });

    return () => {
      unsubscribeUnread();
    };
  }, [userId, refreshUnreadCount]);

  useEffect(() => {
    if (!userId || hiddenOnChatRoute) return;
    refreshUnreadCount();
  }, [userId, hiddenOnChatRoute, location.pathname, refreshUnreadCount]);

  useEffect(() => {
    if (!userId) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !hiddenOnChatRoute) {
        refreshUnreadCount();
      }
    };

    const handleFocus = () => {
      if (!hiddenOnChatRoute) {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, hiddenOnChatRoute, refreshUnreadCount]);

  const handlePointerDown = (event) => {
    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: verticalOffset
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) return;

    const upwardDelta = Math.max(0, dragState.startY - event.clientY);
    const maxOffset = Math.max(0, window.innerHeight - 140);
    const nextOffset = Math.min(maxOffset, dragState.startOffset + upwardDelta);

    // Upward-only movement: offset can only increase.
    setVerticalOffset((prev) => Math.max(prev, nextOffset));
  };

  const handlePointerUp = (event) => {
    const dragState = dragStateRef.current;
    if (dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = {
      active: false,
      pointerId: null,
      startY: 0,
      startOffset: verticalOffset
    };

    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!userId || hiddenOnChatRoute) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/chat')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[130] h-14 w-14 rounded-full bg-[#0033A0] text-white shadow-xl ring-2 ring-white transition hover:scale-[1.03] hover:bg-[#0A3DB6] active:scale-95"
      style={{
        right: RIGHT_PX,
        bottom: BASE_BOTTOM_PX + verticalOffset,
        touchAction: 'none'
      }}
      aria-label="Open chat inbox"
      title="Open chat"
    >
      <MessageCircle size={24} className="mx-auto" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1 rounded-full bg-[#ED1C24] text-[11px] font-bold text-white flex items-center justify-center ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}