// src/components/Layout.jsx
import React, { useState, useCallback, memo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut, 
  Menu, 
  X,
  User,
  Settings,
  ChevronDown,
  Users,
  Truck,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import petronLogo from '../assets/images/petron-logo.png';
import PageTransition from './PageTransition';

// Animated NavItem with scale and slide effects
const NavItem = memo(({ to, icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, x: 5 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative flex items-center w-full px-4 py-3 rounded-lg 
        transition-all duration-300 ease-in-out
        ${isActive 
          ? 'bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white shadow-lg' 
          : 'text-gray-600 hover:bg-[#E5EEFF] hover:text-[#0033A0]'
        }
      `}
    >
      {/* Animated background for active state */}
      {isActive && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg opacity-50"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Icon with animation */}
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        <Icon size={20} className="mr-3 flex-shrink-0" />
      </motion.div>
      
      {/* Label */}
      <span className="font-medium relative z-10">{label}</span>
      
      {/* Active indicator with animation */}
      {isActive && (
        <motion.div 
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
});

NavItem.displayName = 'NavItem';

// Sidebar component
const Sidebar = memo(({ profile, handleSignOut, isActive, handleNavigation, setSlideDirection }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Handle navigation with slide direction
  const onNavigate = (to) => {
    const currentPath = location.pathname;
    const currentIndex = navItems.findIndex(item => item.to === currentPath);
    const newIndex = navItems.findIndex(item => item.to === to);
    
    // Determine slide direction based on navigation
    if (newIndex > currentIndex) {
      setSlideDirection('right'); // Slide in from right
    } else if (newIndex < currentIndex) {
      setSlideDirection('left'); // Slide in from left
    } else {
      setSlideDirection('fadeScale'); // Same page, use fade
    }
    
    handleNavigation(to);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/products', icon: Package, label: 'Inventory' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/riders', icon: Truck, label: 'Riders' },
    { to: '/reports', icon: FileText, label: 'Reports' }
  ];

  return (
    <motion.aside 
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200"
    >
      {/* Logo Section */}
      <motion.div 
        className="p-6 border-b bg-gradient-to-r from-[#0033A0] to-[#ED1C24]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center space-x-3">
          <motion.img 
            src={petronLogo} 
            alt="Petron Logo" 
            className="h-12 w-auto object-contain bg-white rounded-lg p-1"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-xl font-bold text-white">Admin Portal</h1>
            <p className="text-xs text-white/80">Management System</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item, index) => (
          <motion.div
            key={item.to}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <NavItem 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              isActive={isActive(item.to)}
              onClick={() => onNavigate(item.to)}
            />
          </motion.div>
        ))}
      </nav>

      {/* Profile Section */}
      <motion.div 
        className="p-4 border-t"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="relative">
          <motion.button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-[#E5EEFF] transition-all duration-300"
          >
            <motion.div 
              className="w-8 h-8 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg flex items-center justify-center text-white font-bold mr-3 flex-shrink-0"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </motion.div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email || 'admin@petron.com'}</p>
            </div>
            <motion.div
              animate={{ rotate: isProfileMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
            </motion.div>
          </motion.button>

          {/* Profile dropdown */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div 
                className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button 
                  whileHover={{ x: 5 }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] flex items-center"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <User size={16} className="mr-2" />
                  Profile
                </motion.button>
                <motion.button 
                  whileHover={{ x: 5 }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] flex items-center"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <Settings size={16} className="mr-2" />
                  Settings
                </motion.button>
                <div className="border-t my-2"></div>
                <motion.button 
                  whileHover={{ x: 5 }}
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-[#ED1C24] hover:bg-red-50 flex items-center"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.aside>
  );
});

Sidebar.displayName = 'Sidebar';

// Mobile header with animations
const MobileHeader = memo(({ profile, handleSignOut, isActive, handleNavigation, setSlideDirection }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const onNavigate = (to) => {
    const currentPath = location.pathname;
    const navItems = ['/', '/orders', '/products', '/customers', '/riders', '/reports'];
    const currentIndex = navItems.indexOf(currentPath);
    const newIndex = navItems.indexOf(to);
    
    if (newIndex > currentIndex) {
      setSlideDirection('right');
    } else if (newIndex < currentIndex) {
      setSlideDirection('left');
    } else {
      setSlideDirection('fadeScale');
    }
    
    handleNavigation(to);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center z-20">
        <motion.div 
          className="flex items-center"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <img 
            src={petronLogo} 
            alt="Petron Logo" 
            className="h-8 w-auto object-contain mr-3"
          />
          <h1 className="text-lg font-bold text-gray-900">Petron Admin</h1>
        </motion.div>
        <motion.button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden fixed inset-0 top-16 bg-white z-10 overflow-y-auto"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4">
              <nav className="space-y-2">
                {[
                  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
                  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
                  { to: '/products', icon: Package, label: 'Inventory' },
                  { to: '/customers', icon: Users, label: 'Customers' },
                  { to: '/riders', icon: Truck, label: 'Riders' },
                  { to: '/reports', icon: FileText, label: 'Reports' }
                ].map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <NavItem 
                      to={item.to} 
                      icon={item.icon} 
                      label={item.label} 
                      isActive={isActive(item.to)}
                      onClick={() => onNavigate(item.to)}
                    />
                  </motion.div>
                ))}
              </nav>
            </div>
            
            <motion.div 
              className="absolute bottom-4 left-4 right-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg flex items-center justify-center text-white font-bold mr-3">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{profile?.full_name || 'Admin'}</p>
                    <p className="text-sm text-gray-500 truncate">{profile?.email || 'admin@petron.com'}</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                  className="flex items-center justify-center w-full bg-red-50 text-[#ED1C24] px-4 py-3 rounded-lg hover:bg-red-100"
                >
                  <LogOut size={20} className="mr-2" />
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MobileHeader.displayName = 'MobileHeader';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [slideDirection, setSlideDirection] = useState('right');

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  const handleNavigation = useCallback((to) => {
    navigate(to);
  }, [navigate]);

  const isActive = useCallback((path) => location.pathname === path, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        profile={profile} 
        handleSignOut={handleSignOut}
        isActive={isActive}
        handleNavigation={handleNavigation}
        setSlideDirection={setSlideDirection}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader 
          profile={profile} 
          handleSignOut={handleSignOut}
          isActive={isActive}
          handleNavigation={handleNavigation}
          setSlideDirection={setSlideDirection}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50">
          <PageTransition direction={slideDirection}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}