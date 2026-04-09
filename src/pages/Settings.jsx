import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Bell, BellOff, Save, User, BookOpen, Search, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import { notifySuccess } from '../utils/successNotifier';
import { pushNotificationService } from '../services/pushNotificationService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const ADMIN_MANUAL_SECTIONS = [
  {
    id: 'access',
    heading: '1. Access, Login, and Session Rules',
    steps: [
      'Open the admin web URL and sign in using your authorized admin account.',
      'If registration is enabled in deployment, complete registration first and then sign in.',
      'Use only role-approved accounts for admin operations and never share credentials.',
      'If session times out due to inactivity, sign in again to continue securely.',
      'Use trusted devices and sign out after shift handover.',
    ],
  },
  {
    id: 'dashboard',
    heading: '2. Daily Dashboard Routine',
    steps: [
      'Start each shift by checking the dashboard totals and recent activity.',
      'Review active deliveries, pending orders, and low-stock indicators first.',
      'Open Orders immediately for new queue processing and assignment decisions.',
      'Use this same dashboard check during end-of-shift handover.',
    ],
  },
  {
    id: 'orders',
    heading: '3. Order Processing Workflow',
    steps: [
      'Open Orders and filter/search by order number, customer, status, or rider.',
      'Validate customer address, items, payment method, and special instructions.',
      'Assign an active rider to unassigned orders as quickly as possible.',
      'Track status progression and intervene if flow is stalled.',
      'For cancellation, select reason, add operational notes, and confirm action.',
      'For completion, verify delivery proof exists before final close when required.',
    ],
  },
  {
    id: 'delivery',
    heading: '4. Delivery and Rider Monitoring',
    steps: [
      'Use delivery tracking details in Orders to monitor assignment and movement.',
      'Check rider availability and workload balance before assigning urgent jobs.',
      'Validate rider issues and update dispatch actions with minimal delay.',
      'Escalate missing proof, stuck statuses, or repeated failed updates quickly.',
    ],
  },
  {
    id: 'products',
    heading: '5. Product and Inventory Management',
    steps: [
      'Open Products to add, edit, or remove catalog items.',
      'Keep names, units, and prices consistent with live operations.',
      'Act on low-stock alerts immediately to avoid invalid customer ordering.',
      'Review product media quality and replace broken/outdated images.',
    ],
  },
  {
    id: 'customers',
    heading: '6. Customer and Rider Records',
    steps: [
      'Use Customers page for profile review, account support, and order history checks.',
      'Use Riders page for availability checks, operational review, and assignment context.',
      'Edit profile records only when required and preserve data accuracy.',
      'Use audit context for disputes and operational validation.',
    ],
  },
  {
    id: 'reports',
    heading: '7. Reports, Audit Logs, and Compliance',
    steps: [
      'Use Reports for daily/weekly/monthly operational and sales review.',
      'Use Audit Logs to verify who changed records and when changes occurred.',
      'Filter logs by entity, date, and identifiers during incident checks.',
      'Export or summarize reporting data for management handover.',
    ],
  },
  {
    id: 'settings',
    heading: '8. Settings and Notification Controls',
    steps: [
      'Use Settings to update profile, avatar, and notification preferences.',
      'Enable browser notifications and send a test notification to validate setup.',
      'Apply configuration updates only when production-approved.',
      'If browser permission is blocked, update browser settings and re-request.',
    ],
  },
  {
    id: 'troubleshoot',
    heading: '9. Troubleshooting and Escalation',
    steps: [
      'Login issue: verify credentials, role, and network, then retry.',
      'Data not updating: refresh page and verify realtime connectivity.',
      'Order stuck: confirm assignment, status flow, proof requirements, and rider updates.',
      'Notification issue: check browser permission and run a test notification.',
      'Escalate repeated failures, inconsistent data, or blocked critical workflows to system admin.',
    ],
  },
];

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('default');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [openManualSections, setOpenManualSections] = useState({ access: true });
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    avatar_url: '',
  });
  const avatarInputRef = useRef(null);

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      avatar_url: profile?.avatar_url || '',
    });
  }, [profile]);

  useEffect(() => {
    if (!isAvatarPreviewOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAvatarPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAvatarPreviewOpen]);

  const fetchNotificationSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      setPermissionState(pushNotificationService.getPermissionState());
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setRequestingPermission(true);
      setError(null);

      const result = await pushNotificationService.requestPermission();
      const newState = result.permission || pushNotificationService.getPermissionState();
      setPermissionState(newState);

      if (result.success) {
        notifySuccess('Push notifications enabled.');
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('Unable to enable push notifications.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to request notification permission');
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleTestNotification = () => {
    const sent = pushNotificationService.sendNotification('Petron Admin Notification', {
      body: 'Push notifications are enabled for this admin panel.',
      tag: 'admin-settings-test',
    });

    if (sent) {
      notifySuccess('Test notification sent.');
      return;
    }

    setError('Could not send test notification. Enable notifications first.');
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!profileForm.full_name.trim()) {
      setError('Full name is required.');
      return;
    }

    try {
      setSavingProfile(true);
      setError(null);

      await updateProfile({
        full_name: profileForm.full_name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
        avatar_url: profileForm.avatar_url.trim() || null,
      });

      notifySuccess('Profile updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChooseAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setUploadingAvatar(true);
      setError(null);

      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `public/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        throw new Error('Could not get public URL for uploaded avatar.');
      }

      await updateProfile({
        avatar_url: publicUrl,
        avatar_updated_at: new Date().toISOString(),
      });

      setProfileForm((prev) => ({
        ...prev,
        avatar_url: publicUrl,
      }));
      notifySuccess('Profile photo updated successfully.');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const isNotificationsEnabled = permissionState === 'granted';

  const filteredManualSections = useMemo(() => {
    const query = manualQuery.trim().toLowerCase();
    if (!query) return ADMIN_MANUAL_SECTIONS;

    return ADMIN_MANUAL_SECTIONS
      .map((section) => {
        const headingMatch = section.heading.toLowerCase().includes(query);
        const matchingSteps = headingMatch
          ? section.steps
          : section.steps.filter((step) => step.toLowerCase().includes(query));

        return {
          ...section,
          steps: matchingSteps,
        };
      })
      .filter((section) => section.steps.length > 0);
  }, [manualQuery]);

  const toggleManualSection = (id) => {
    setOpenManualSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={28} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Configure application-wide settings</p>
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <User size={18} className="text-blue-600" />
                    Profile
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Update your admin profile information.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={profileForm.full_name}
                    onChange={handleProfileInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={profileForm.phone_number}
                    onChange={handleProfileInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="09xxxxxxxxx"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    {profileForm.avatar_url ? (
                      <button
                        type="button"
                        onClick={() => setIsAvatarPreviewOpen(true)}
                        className="rounded-full"
                        title="View full image"
                      >
                        <img
                          src={profileForm.avatar_url}
                          alt="Admin avatar"
                          className="w-16 h-16 rounded-full object-cover border border-gray-300 hover:opacity-90 transition"
                        />
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#0033A0] text-white flex items-center justify-center font-bold text-xl">
                        {(profileForm.full_name || profile?.full_name || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                      <button
                        type="button"
                        onClick={handleChooseAvatar}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </button>
                      <p className="text-xs text-gray-500">JPG, PNG, WEBP accepted</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            {/* Push Notification Section */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage browser notification permission for admin alerts and updates.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Current Permission</p>
                  <p className={`text-xl font-bold ${isNotificationsEnabled ? 'text-green-600' : 'text-gray-700'}`}>
                    {isNotificationsEnabled ? 'Enabled' : permissionState === 'denied' ? 'Blocked' : permissionState === 'unsupported' ? 'Unsupported' : 'Not Enabled'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleEnableNotifications}
                    disabled={requestingPermission || permissionState === 'unsupported' || isNotificationsEnabled}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bell size={18} />
                    {requestingPermission ? 'Requesting...' : 'Enable Notifications'}
                  </button>

                  <button
                    onClick={handleTestNotification}
                    disabled={!isNotificationsEnabled}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BellOff size={18} />
                    Test Notification
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Settings Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">1.</span>
                  <span>Click Enable Notifications to request browser permission.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">2.</span>
                  <span>When permission is granted, you can receive admin alerts in-browser.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">3.</span>
                  <span>Use Test Notification to verify your browser can display alerts.</span>
                </li>
              </ul>
            </div>

            {/* In-App Admin User Manual */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-600" />
                    Admin User Manual
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Detailed in-app guide for daily operations, workflows, and troubleshooting.
                  </p>
                </div>
              </div>

              <div className="mb-4 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Search manual topics or steps"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-3">
                {filteredManualSections.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    No manual sections matched your search.
                  </div>
                ) : (
                  filteredManualSections.map((section) => {
                    const isOpen = !!openManualSections[section.id];

                    return (
                      <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => toggleManualSection(section.id)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                        >
                          <span className="text-left text-sm font-semibold text-gray-900">{section.heading}</span>
                          {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4">
                            <ol className="space-y-2 mt-1">
                              {section.steps.map((step, index) => (
                                <li key={`${section.id}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="mt-0.5 text-blue-600 font-semibold min-w-5">{index + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {isAvatarPreviewOpen && profileForm.avatar_url && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setIsAvatarPreviewOpen(false)}
          >
            <div
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsAvatarPreviewOpen(false)}
                className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-md hover:bg-black"
              >
                Close
              </button>
              <img
                src={profileForm.avatar_url}
                alt="Admin avatar full view"
                className="w-full max-h-[85vh] object-contain rounded-lg bg-black"
              />
            </div>
          </div>
        )}
      </div>
  );
}
