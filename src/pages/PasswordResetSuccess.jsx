import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function PasswordResetSuccess() {
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-petron-blue'}`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 text-center transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="text-green-600" size={56} />
        </div>

        <h1 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-[#0033A0]'}`}>Password Reset Successful</h1>
        <p className={`mt-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Your admin password has been updated. You can now sign in using your new password.
        </p>

        <Link
          to="/login"
          className="inline-block mt-6 bg-petron-red hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}