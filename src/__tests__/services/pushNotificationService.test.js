import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pushNotificationService } from '../../services/pushNotificationService';

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockChannel = vi.fn();
let onInsertCallback;

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
  },
}));

describe('pushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: { id: 'n-1' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    onInsertCallback = undefined;

    mockOn.mockImplementation((_event, _filter, cb) => {
      onInsertCallback = cb;
      return { subscribe: mockSubscribe };
    });
    mockChannel.mockReturnValue({ on: mockOn });
    mockSubscribe.mockImplementation((statusCallback) => {
      if (typeof statusCallback === 'function') {
        statusCallback('SUBSCRIBED');
      }
      return { unsubscribe: vi.fn() };
    });

    mockFrom.mockImplementation(() => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }));
  });

  it('returns granted state when browser notification is granted', () => {
    const original = window.Notification;
    window.Notification = { permission: 'granted' };

    const state = pushNotificationService.getPermissionState();

    expect(state).toBe('granted');
    window.Notification = original;
  });

  it('getPermissionState returns unsupported when Notification is unavailable', () => {
    const original = window.Notification;
    delete window.Notification;

    const state = pushNotificationService.getPermissionState();

    expect(state).toBe('unsupported');
    Object.defineProperty(window, 'Notification', {
      value: original,
      configurable: true,
      writable: true,
    });
  });

  it('requestPermission returns denied payload when permission is denied', async () => {
    const original = window.Notification;
    window.Notification = { permission: 'denied' };

    const result = await pushNotificationService.requestPermission();

    expect(result.success).toBe(false);
    expect(result.permission).toBe('denied');
    window.Notification = original;
  });

  it('requestPermission returns unsupported when Notification API is unavailable', async () => {
    const original = window.Notification;
    delete window.Notification;

    const result = await pushNotificationService.requestPermission();

    expect(result).toEqual({ success: false, error: 'Browser does not support notifications' });
    Object.defineProperty(window, 'Notification', {
      value: original,
      configurable: true,
      writable: true,
    });
  });

  it('requestPermission returns catch payload when request throws', async () => {
    const original = window.Notification;
    window.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockRejectedValue(new Error('permission flow failed')),
    };

    const result = await pushNotificationService.requestPermission();

    expect(result.success).toBe(false);
    expect(result.error).toBe('permission flow failed');
    expect(result.permission).toBe('default');
    window.Notification = original;
  });

  it('requestPermission requests browser permission when not denied/granted', async () => {
    const original = window.Notification;
    window.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const result = await pushNotificationService.requestPermission();

    expect(result.success).toBe(true);
    expect(result.permission).toBe('granted');
    expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
    window.Notification = original;
  });

  it('returns true when sendNotification succeeds', () => {
    const original = window.Notification;
    const notificationCtor = vi.fn();
    notificationCtor.permission = 'granted';
    window.Notification = notificationCtor;

    const result = pushNotificationService.sendNotification('Hello', { body: 'World' });

    expect(result).toBe(true);
    expect(notificationCtor).toHaveBeenCalledWith(
      'Hello',
      expect.objectContaining({ body: 'World' })
    );

    window.Notification = original;
  });

  it('sendNotification returns false when permission is not granted', () => {
    const original = window.Notification;
    window.Notification = { permission: 'denied' };

    const result = pushNotificationService.sendNotification('Blocked');

    expect(result).toBe(false);
    window.Notification = original;
  });

  it('sendNotification returns false when Notification constructor throws', () => {
    const original = window.Notification;
    function NotificationCtor() {
      throw new Error('cannot show');
    }
    NotificationCtor.permission = 'granted';
    window.Notification = NotificationCtor;

    const result = pushNotificationService.sendNotification('Will Fail');

    expect(result).toBe(false);
    window.Notification = original;
  });

  it('creates notification record and sends browser notification', async () => {
    const sendSpy = vi.spyOn(pushNotificationService, 'sendNotification').mockReturnValue(true);

    const result = await pushNotificationService.createNotification('user-1', {
      type: 'order',
      title: 'Order Created',
      message: 'New order submitted',
      data: { orderId: 'o-1' },
    });

    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'user-1', type: 'order' }),
    ]);
    expect(sendSpy).toHaveBeenCalledWith(
      'Order Created',
      expect.objectContaining({ body: 'New order submitted' })
    );
    expect(result).toEqual({ success: true, data: { id: 'n-1' } });

    sendSpy.mockRestore();
  });

  it('returns failure object when markAsRead query errors', async () => {
    mockEq.mockResolvedValue({ error: new Error('write failed') });

    const result = await pushNotificationService.markAsRead('n-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('write failed');
  });

  it('markAllAsRead returns success on valid chain', async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const localUpdate = vi.fn().mockReturnValue({ eq: firstEq });

    mockFrom.mockReturnValue({ update: localUpdate });

    const result = await pushNotificationService.markAllAsRead('user-1');

    expect(result).toEqual({ success: true });
    expect(firstEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(secondEq).toHaveBeenCalledWith('is_read', false);
  });

  it('markAllAsRead returns failure when update chain returns error', async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: new Error('bulk update failed') });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const localUpdate = vi.fn().mockReturnValue({ eq: firstEq });
    mockFrom.mockReturnValue({ update: localUpdate });

    const result = await pushNotificationService.markAllAsRead('user-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('bulk update failed');
  });

  it('removeNotification and clearNotifications return success', async () => {
    const localEq = vi.fn().mockResolvedValue({ error: null });
    const localDelete = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ delete: localDelete });

    const removeRes = await pushNotificationService.removeNotification('n-9');
    const clearRes = await pushNotificationService.clearNotifications('user-1');

    expect(removeRes).toEqual({ success: true });
    expect(clearRes).toEqual({ success: true });
  });

  it('removeNotification returns failure when delete query errors', async () => {
    const localEq = vi.fn().mockResolvedValue({ error: new Error('remove failed') });
    const localDelete = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ delete: localDelete });

    const result = await pushNotificationService.removeNotification('n-9');

    expect(result.success).toBe(false);
    expect(result.error).toBe('remove failed');
  });

  it('clearNotifications returns failure when delete query errors', async () => {
    const localEq = vi.fn().mockResolvedValue({ error: new Error('clear failed') });
    const localDelete = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ delete: localDelete });

    const result = await pushNotificationService.clearNotifications('user-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('clear failed');
  });

  it('createNotification returns failure when insert throws error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('insert failed') });

    const result = await pushNotificationService.createNotification('user-1', {
      type: 'order',
      title: 'X',
      message: 'Y',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('insert failed');
  });

  it('subscribeToNotifications forwards new payload and status changes', () => {
    const onNewNotification = vi.fn();
    const onStatusChange = vi.fn();
    const sendSpy = vi.spyOn(pushNotificationService, 'sendNotification').mockReturnValue(true);

    const unsubscribe = pushNotificationService.subscribeToNotifications(
      'user-1',
      onNewNotification,
      onStatusChange
    );

    expect(mockChannel).toHaveBeenCalledWith('notifications-user-1');
    expect(onStatusChange).toHaveBeenCalledWith('SUBSCRIBED');

    onInsertCallback({
      new: {
        id: 'n-2',
        title: 'New Alert',
        message: 'Body',
        type: 'order',
        data: {},
      },
    });

    expect(onNewNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-2', title: 'New Alert' })
    );
    expect(sendSpy).toHaveBeenCalled();

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    sendSpy.mockRestore();
  });

  it('subscribeToNotifications works when status callback is omitted', () => {
    const original = window.Notification;
    const notificationCtor = vi.fn();
    notificationCtor.permission = 'granted';
    window.Notification = notificationCtor;

    const onNewNotification = vi.fn();

    const unsubscribe = pushNotificationService.subscribeToNotifications('user-2', onNewNotification);

    onInsertCallback({
      new: {
        id: 'n-22',
        title: 'Silent Status',
        message: 'No status callback',
        type: 'order',
        data: {},
      },
    });

    expect(onNewNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-22', title: 'Silent Status' })
    );
    unsubscribe();

    window.Notification = original;
  });
});
