import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, ShoppingCart, Package, LogOut, Menu, X } from 'lucide-react';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
        className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
          isActive ? 'bg-blue-800 text-white' : 'text-gray-600 hover:bg-blue-50'
        }`}
      >
        <Icon size={20} className="mr-3" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-900">Petron Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Management System</p>
        </div>
        <nav className="flex-1 px-4">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/orders" icon={ShoppingCart} label="Orders" />
          <NavItem to="/products" icon={Package} label="Inventory" />
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleSignOut} className="flex items-center text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg w-full">
            <LogOut size={20} className="mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center z-20">
          <h1 className="text-xl font-bold text-blue-900">Petron Admin</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg z-10 p-4 border-b">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/orders" icon={ShoppingCart} label="Orders" />
            <NavItem to="/products" icon={Package} label="Inventory" />
            <button onClick={handleSignOut} className="flex items-center text-red-600 px-4 py-3 mt-2 w-full">
              <LogOut size={20} className="mr-3" />
              Sign Out
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}