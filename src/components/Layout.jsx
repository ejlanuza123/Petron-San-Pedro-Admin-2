// src/components/Layout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut, 
  Menu, 
  X,
  Bell,
  User,
  Settings,
  ChevronDown
} from 'lucide-react';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <button
        onClick={() => {
          navigate(to);
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${
          isActive 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
        }`}
      >
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Petron Admin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/orders" icon={ShoppingCart} label="Orders" />
          <NavItem to="/products" icon={Package} label="Inventory" />
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t">
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
              <ChevronDown size={18} className="text-gray-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                  <User size={16} className="mr-2" />
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                  <Settings size={16} className="mr-2" />
                  Settings
                </button>
                <div className="border-t my-2"></div>
                <button 
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center z-20">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Petron Admin</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-white z-10 p-4">
            <nav className="space-y-2">
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/orders" icon={ShoppingCart} label="Orders" />
              <NavItem to="/products" icon={Package} label="Inventory" />
            </nav>
            
            <div className="absolute bottom-4 left-4 right-4">
              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                    {profile?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{profile?.full_name || 'Admin'}</p>
                    <p className="text-sm text-gray-500">{profile?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-full bg-red-50 text-red-600 px-4 py-3 rounded-lg hover:bg-red-100"
                >
                  <LogOut size={20} className="mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}