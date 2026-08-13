// src/pages/Register.jsx
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-xl transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-800/50 shadow-inner">
          <ShieldAlert size={32} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Public Registration Disabled</h2>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          Admin account registration is restricted. Admin accounts can only be created by the <strong>Super Admin</strong> inside the secret Super Admin Portal.
        </p>

        <Link
          to="/login"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0033A0] hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition shadow-md"
        >
          <ArrowLeft size={16} /> Return to Admin Login
        </Link>
      </div>
    </div>
  );
}