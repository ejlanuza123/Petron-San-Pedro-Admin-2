import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import BroadcastNotifications from '../../pages/BroadcastNotifications';

const mocks = vi.hoisted(() => ({
  getAudienceEstimates: vi.fn(),
  sendBroadcast: vi.fn(),
  getBroadcastHistory: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

vi.mock('../../utils/successNotifier', () => ({
  notifySuccess: (...args) => mocks.notifySuccess(...args),
}));

vi.mock('../../services/broadcastNotificationService', () => ({
  broadcastNotificationService: {
    getAudienceEstimates: () => mocks.getAudienceEstimates(),
    sendBroadcast: (args) => mocks.sendBroadcast(args),
    getBroadcastHistory: (args) => mocks.getBroadcastHistory(args),
  },
  BROADCAST_CATEGORIES: [
    { id: 'weather_advisory', name: 'Weather & Operations', icon: 'CloudRain', color: '#EAB308' },
    { id: 'promo', name: 'Flash Promo & Discounts', icon: 'Flame', color: '#EC4899' },
    { id: 'announcement', name: 'General Announcement', icon: 'Megaphone', color: '#3B82F6' },
    { id: 'emergency', name: 'Emergency & Advisories', icon: 'AlertTriangle', color: '#EF4444' }
  ],
  PRESET_TEMPLATES: [
    {
      id: 'rain_advisory',
      category: 'weather_advisory',
      targetAudience: 'all',
      title: '🌧️ Heavy Rain Advisory',
      message: 'Deliveries in San Pedro may be delayed by 10–15 mins for rider safety.'
    }
  ]
}));

describe('BroadcastNotifications Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getAudienceEstimates.mockResolvedValue({
      success: true,
      customers: 25,
      riders: 5,
      total: 30,
      pushTokens: { customers: 20, riders: 4, total: 24 }
    });

    mocks.getBroadcastHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'b-1',
          created_at: '2026-09-11T09:00:00Z',
          target_audience: 'all',
          category: 'weather_advisory',
          title: '🌧️ Heavy Rain Advisory',
          message: 'Deliveries in San Pedro may be delayed by 10–15 mins for rider safety.',
          recipient_count: 30,
          push_tokens_count: 24,
          profiles: { full_name: 'Admin User' }
        }
      ]
    });
  });

  it('renders title, audience selectors, and initial audience estimates', async () => {
    render(<BroadcastNotifications />);

    expect(screen.getByText('Push Notification Broadcaster')).toBeTruthy();
    expect(screen.getByText('1. Select Target Audience')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Everyone')).toBeTruthy();
      expect(screen.getByText('Customers')).toBeTruthy();
      expect(screen.getByText('Riders')).toBeTruthy();
    });
  });

  it('clicking a preset template fills title and message inputs', async () => {
    render(<BroadcastNotifications />);

    await waitFor(() => {
      expect(screen.getByText(/Heavy Rain Advisory/i)).toBeTruthy();
    });

    const presetBtn = screen.getByText(/Heavy Rain Advisory/i);
    fireEvent.click(presetBtn);

    const titleInput = screen.getByPlaceholderText(/e.g. 🌧️ Heavy Rain Advisory/i);
    expect(titleInput.value).toContain('Heavy Rain Advisory');

    const messageInput = screen.getByPlaceholderText(/Deliveries in San Pedro may be delayed/i);
    expect(messageInput.value).toContain('Deliveries in San Pedro may be delayed');
  });

  it('submits form, opens confirmation modal, and confirms dispatch', async () => {
    mocks.sendBroadcast.mockResolvedValueOnce({
      success: true,
      broadcastId: 'b-999',
      recipientCount: 30,
      pushSentCount: 24
    });

    render(<BroadcastNotifications />);

    // Fill form
    const titleInput = screen.getByPlaceholderText(/e.g. 🌧️ Heavy Rain Advisory/i);
    const messageInput = screen.getByPlaceholderText(/Deliveries in San Pedro may be delayed/i);

    fireEvent.change(titleInput, { target: { value: 'Flash Promo Alert' } });
    fireEvent.change(messageInput, { target: { value: 'Buy 1 get 1 free today!' } });

    const submitBtn = screen.getByText(/Review & Dispatch Broadcast/i);
    fireEvent.click(submitBtn);

    // Confirmation modal should appear
    const confirmModalTitle = await screen.findByText('Confirm Broadcast Dispatch');
    expect(confirmModalTitle).toBeTruthy();

    const confirmBtn = screen.getByText('Yes, Dispatch Now');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mocks.sendBroadcast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Flash Promo Alert',
        message: 'Buy 1 get 1 free today!'
      }));
      expect(mocks.notifySuccess).toHaveBeenCalled();
    });
  });

  it('switches to history tab and displays past broadcasts', async () => {
    render(<BroadcastNotifications />);

    const historyTabBtn = screen.getByRole('button', { name: /History/i });
    fireEvent.click(historyTabBtn);

    const pastHeader = await screen.findByText('Past Dispatched Broadcasts');
    expect(pastHeader).toBeTruthy();
    expect(screen.getByText('🌧️ Heavy Rain Advisory')).toBeTruthy();
  });
});
