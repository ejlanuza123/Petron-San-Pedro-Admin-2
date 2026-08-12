// src/components/common/SearchBar.jsx
import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function SearchBar({ onSearch, placeholder = 'Search...', className = '' }) {
  const [query, setQuery] = useState('');
  const { isDarkMode } = useTheme();
  const inputRef = useRef(null);

  const handleSearch = (value) => {
    setQuery(value);
    onSearch(value);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-10 pr-16 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
      />
      {query ? (
        <button
          onClick={() => handleSearch('')}
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <X size={18} />
        </button>
      ) : (
        <kbd className={`absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-800 border-slate-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-400'
        }`}>
          Ctrl+K
        </kbd>
      )}
    </div>
  );
}