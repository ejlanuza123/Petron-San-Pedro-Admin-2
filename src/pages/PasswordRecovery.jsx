import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

function readAuthParamsFromUrl() {
  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

  const pick = (key) => hashParams.get(key) || queryParams.get(key) || null;

  return {
    type: pick('type'),
    accessToken: pick('access_token') || pick('accessToken'),
    refreshToken: pick('refresh_token') || pick('refreshToken'),
    tokenHash: pick('token_hash') || pick('token'),
    code: pick('code'),
  };
}

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const [bootLoading, setBootLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const params = useMemo(() => readAuthParamsFromUrl(), []);

  useEffect(() => {
    const initRecovery = async () => {
      setError('');
      try {
        const hasRecoveryIntent =
          params.type === 'recovery' ||
          !!params.accessToken ||
          !!params.refreshToken ||
          !!params.tokenHash ||
          !!params.code;

        if (!hasRecoveryIntent) {
          throw new Error('Invalid or missing recovery link. Please request a new reset email.');
        }

        if (params.accessToken && params.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (params.tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: params.tokenHash,
          });
          if (otpError) throw otpError;
        } else if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionReadError } = await supabase.auth.getSession();
        if (sessionReadError) throw sessionReadError;
        if (!data?.session) {
          throw new Error('Recovery session not found. Please open the latest reset link again.');
        }

        setReady(true);
      } catch (err) {
        setError(err.message || 'Unable to start password recovery.');
      } finally {
        setBootLoading(false);
      }
    };

    initRecovery();
  }, [params]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

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

    setSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const authUser = userData?.user;
      if (!authUser?.id) {
        throw new Error('Recovery session expired. Please request a new reset email.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('This recovery link is not for an admin account.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      window.history.replaceState({}, document.title, '/password-reset-success');
      navigate('/password-reset-success');
    } catch (err) {
      setError(err.message || 'Unable to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-petron-blue flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-[#0033A0] mb-2">Reset Admin Password</h1>
        <p className="text-sm text-gray-600 mb-6">Set a new password for your admin account.</p>

        {bootLoading && (
          <div className="flex items-center text-sm text-gray-700">
            <Loader2 className="animate-spin mr-2" size={18} />
            Verifying reset link...
          </div>
        )}

        {!bootLoading && error && (
          <div className="bg-red-50 border-l-4 border-[#ED1C24] p-4 rounded mb-4">
            <div className="flex items-center">
              <AlertCircle className="text-[#ED1C24] mr-2 flex-shrink-0" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!bootLoading && ready && (
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-petron-red hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-[#0033A0] hover:text-[#ED1C24] font-medium transition-colors duration-200"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
