// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import petronLogo from '../assets/images/petron-logo.png';
import { supabase } from '../lib/supabase';

const ADMIN_ROLE = 'admin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecoveryState = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const queryParams = new URLSearchParams(window.location.search);
      const type = hashParams.get('type') || queryParams.get('type');

      if (type === 'recovery') {
        setShowRecoveryModal(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setShowRecoveryModal(true);
      }
    };

    checkRecoveryState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowRecoveryModal(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your admin email.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      let isConfirmedAdmin = false;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      // Anonymous clients may be blocked by RLS from reading profiles.
      // In that case, continue with reset email and enforce role on recovery.
      if (profileError && profileError.code !== '42501') {
        throw profileError;
      }

      if (profile?.role && profile.role !== ADMIN_ROLE) {
        setError('This email is not registered as an admin account.');
        return;
      }

      if (profile?.role === ADMIN_ROLE) {
        isConfirmedAdmin = true;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/password-recovery`,
      });

      if (resetError) throw resetError;

      setShowForgotModal(false);
      setResetEmail('');
      setSuccessMessage(
        isConfirmedAdmin
          ? 'Password reset link sent. Please check your email inbox.'
          : 'If this email belongs to an admin account, a reset link has been sent.'
      );
    } catch (err) {
      setError(err.message || 'Unable to send reset link. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newPassword || !confirmNewPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdatePasswordLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const authUser = userData?.user;
      if (!authUser?.id) {
        throw new Error('Recovery session is missing. Please open the reset link again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== ADMIN_ROLE) {
        await supabase.auth.signOut();
        throw new Error('This recovery link is not for an admin account.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setShowRecoveryModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      window.history.replaceState({}, document.title, '/login');
      navigate('/password-reset-success');
    } catch (err) {
      setError(err.message || 'Unable to update password. Please request another reset link.');
    } finally {
      setUpdatePasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-petron-blue flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Petron colors */}
        <div className="bg-petron-red p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
              <img 
                src={petronLogo} 
                alt="Petron Logo" 
                className="w-full h-full object-contain p-2 rounded-xl"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
          <p className="text-white/80 mt-2">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-[#ED1C24] p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="text-[#ED1C24] mr-2 flex-shrink-0" size={20} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none transition"
                placeholder="admin@petron.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0] focus:ring-2" 
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <button 
              type="button" 
              className="text-sm text-[#0033A0] hover:text-[#ED1C24] font-medium transition-colors duration-200"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setResetEmail(email);
                setShowForgotModal(true);
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-petron-red hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Need an admin account?{' '}
              <Link 
                to="/register" 
                className="text-[#0033A0] font-bold hover:text-[#ED1C24] hover:underline transition-colors duration-200"
              >
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-[#0033A0] mb-2">Reset Admin Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your admin email to receive a password reset link.
            </p>

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none transition"
                    placeholder="admin@petron.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-lg bg-petron-red text-white font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-[#0033A0] mb-2">Set New Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your new password to complete account recovery.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none transition"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none transition"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setShowRecoveryModal(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    window.history.replaceState({}, document.title, '/login');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePasswordLoading}
                  className="px-4 py-2 rounded-lg bg-petron-red text-white font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {updatePasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}