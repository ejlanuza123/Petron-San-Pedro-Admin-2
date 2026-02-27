// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import petronLogo from '../assets/images/petron-logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0033A0] to-[#ED1C24] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Petron colors */}
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src={petronLogo} 
                alt="Petron Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
          <p className="text-white/80 mt-2">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
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
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0033A0] to-[#ED1C24] hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
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
    </div>
  );
}