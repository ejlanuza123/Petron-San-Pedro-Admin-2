// src/components/Layout.jsx
import React, { useState, useCallback, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../context/NotificationContext';
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
  FileText,
  Bell,
  Check,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import petronLogo from '../assets/images/petron-logo.png';
import PageTransition from './PageTransition';
import SettingsModal from './SettingsModal';


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
          ? 'bg-petron-blue text-white shadow-lg' 
          : 'text-gray-600 hover:bg-[#E5EEFF] hover:text-[#0033A0]'
        }
      `}
    >
      {/* Animated background for active state */}
      {isActive && (
        <motion.div 
          className="absolute inset-0 bg-petron-blue rounded-lg opacity-50"
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

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return '';

  const createdAt = new Date(timestamp);
  if (Number.isNaN(createdAt.getTime())) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return createdAt.toLocaleDateString();
};

const NotificationMenu = memo(({ notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, onNotificationClick, requestNotificationPermission, className = '', placement = 'bottom-right', buttonClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const previewNotifications = notifications.slice(0, 8);

  const panelPositionClass = placement === 'top-right'
    ? 'absolute right-0 left-auto bottom-full mb-2 origin-bottom-right'
    : placement === 'mobile-center'
      ? 'fixed left-1/2 -translate-x-1/2 top-16 mt-2 origin-top'
    : placement === 'right-start'
      ? 'absolute left-full top-0 ml-2 origin-top-left'
      : 'absolute right-0 left-auto top-full mt-2 origin-top-right';

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={async () => {
          if (typeof requestNotificationPermission === 'function') {
            await requestNotificationPermission();
          }
          setIsOpen(prev => !prev);
        }}
        className={`relative p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition ${buttonClassName}`}
        aria-label="Open notifications"
      >
        <Bell size={20} className="text-current" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ED1C24] ring-2 ring-white text-white text-[10px] flex items-center justify-center font-semibold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            exit={{ y: 8 }}
            transition={{ duration: 0.2 }}
            className={`${panelPositionClass} w-[min(22rem,calc(100vw-1rem))] max-h-[420px] bg-white border border-gray-200 rounded-xl shadow-xl z-[120] overflow-hidden`}
            style={{ opacity: 1 }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    await markAllAsRead();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium"
                >
                  <CheckCheck size={14} />
                  Mark all as read
                </button>
                <button
                  onClick={async () => {
                    await clearAll();
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-[#ED1C24]"
                >
                  <Trash2 size={14} />
                  Remove all
                </button>
              </div>
            )}

            <div className="max-h-[340px] overflow-auto">
              {previewNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No notifications yet</div>
              ) : (
                <div className="divide-y">
                  {previewNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={async () => {
                        if (!notification.is_read) {
                          await markAsRead(notification.id);
                        }
                        if (typeof onNotificationClick === 'function') {
                          onNotificationClick(notification);
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 transition hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-1 break-words">{notification.message}</p>
                          <p className="text-[11px] text-gray-400 mt-2">
                            {formatNotificationTime(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await markAsRead(notification.id);
                            }}
                            className="mt-0.5 p-1 rounded text-blue-600 hover:bg-blue-100"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        ) : (
                          <span className="mt-1 text-green-600" title="Read">
                            <CheckCheck size={14} />
                          </span>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await removeNotification(notification.id);
                          }}
                          className="mt-0.5 p-1 rounded text-gray-500 hover:bg-red-100 hover:text-[#ED1C24]"
                          title="Remove notification"
                          aria-label="Remove notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

NotificationMenu.displayName = 'NotificationMenu';

// Sidebar component
const Sidebar = memo(({ profile, handleSignOut, isActive, handleNavigation, setSlideDirection, onSettingsClick, onProfileClick, notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, requestNotificationPermission, onNotificationClick }) => {
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
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/audit-logs', icon: FileText, label: 'Audit Logs' }
  ];

  return (
    <motion.aside 
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200 relative z-40 overflow-visible"
    >
      {/* Logo Section */}
      <motion.div 
        className="p-6 border-b bg-petron-blue"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <motion.img 
              src={petronLogo} 
              alt="Petron Logo" 
              className="h-12 w-auto object-contain bg-white rounded-lg p-1"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="min-w-0"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-xl font-bold text-white truncate">Admin Portal</h1>
              <p className="text-xs text-white/80 truncate">Management System</p>
            </motion.div>
          </div>

          <NotificationMenu
            notifications={notifications}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            removeNotification={removeNotification}
            clearAll={clearAll}
            onNotificationClick={onNotificationClick}
            requestNotificationPermission={requestNotificationPermission}
            placement="right-start"
            className="translate-x-2"
            buttonClassName="bg-white border-white/70 text-[#0033A0] hover:bg-[#E5EEFF]"
          />
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
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile?.full_name || 'Admin'}
                className="w-8 h-8 rounded-lg object-cover mr-3 flex-shrink-0 border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 bg-petron-blue rounded-lg flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
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
                className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button 
                  whileHover={{ x: 5 }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] flex items-center"
                  onClick={() => {
                    onProfileClick();
                    setIsProfileMenuOpen(false);
                  }}
                >
                  <User size={16} className="mr-2" />
                  Profile
                </motion.button>
                <motion.button 
                  whileHover={{ x: 5 }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] flex items-center"
                  onClick={() => {
                    onSettingsClick();
                    setIsProfileMenuOpen(false);
                  }}
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
const MobileHeader = memo(({ profile, handleSignOut, isActive, handleNavigation, setSlideDirection, notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, requestNotificationPermission, onSettingsClick, onProfileClick, onNotificationClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);

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
      <header className="md:hidden bg-petron-blue border-b border-white/20 px-4 py-3 flex justify-between items-center z-20">
        <motion.div 
          className="flex items-center min-w-0 flex-1"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <motion.img 
            src={petronLogo} 
            alt="Petron Logo" 
            className="h-12 w-auto object-contain bg-white rounded-lg p-1 border border-white/60 mr-3 shrink-0"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Admin Portal</h1>
            <p className="text-[11px] text-white/80 truncate">Management System</p>
          </div>
        </motion.div>
        <div className="flex items-center gap-2 pl-2 shrink-0">
          <NotificationMenu
            notifications={notifications}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            removeNotification={removeNotification}
            clearAll={clearAll}
            onNotificationClick={onNotificationClick}
            requestNotificationPermission={requestNotificationPermission}
            placement="mobile-center"
          />
          <motion.button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-white/20 rounded-lg text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
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
                <button
                  onClick={() => setIsMobileProfileMenuOpen(prev => !prev)}
                  className="w-full flex items-center mb-2 p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile?.full_name || 'Admin'}
                      className="w-10 h-10 rounded-lg object-cover mr-3 border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-petron-blue rounded-lg flex items-center justify-center text-white font-bold mr-3">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="min-w-0 text-left flex-1">
                    <p className="font-medium text-gray-900 truncate">{profile?.full_name || 'Admin'}</p>
                    <p className="text-sm text-gray-500 truncate">{profile?.email || 'admin@petron.com'}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isMobileProfileMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-500"
                  >
                    <ChevronDown size={18} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isMobileProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-2"
                    >
                      <button
                        onClick={() => {
                          onProfileClick();
                          setIsMobileProfileMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] rounded-md flex items-center"
                      >
                        <User size={16} className="mr-2" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          onSettingsClick();
                          setIsMobileProfileMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0] rounded-md flex items-center"
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    permissionStatus,
    requestNotificationPermission
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [slideDirection, setSlideDirection] = useState('right');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  const handleNavigation = useCallback((to) => {
    navigate(to);
  }, [navigate]);

  const handleProfileClick = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleNotificationClick = useCallback((notification) => {
    const type = notification?.type || '';
    const data = notification?.data || {};
    const event = data?.event || '';
    const focusNonce = Date.now();

    const orderId = data?.order_id ? Number(data.order_id) : null;
    const productId = data?.product_id ? Number(data.product_id) : null;
    const riderId = data?.rider_id || data?.assigned_rider_id || null;
    const customerId = data?.user_id || data?.customer_id || null;

    if (data?.order_id || type.includes('order') || event.includes('order')) {
      navigate('/orders', {
        state: {
          focusOrderId: Number.isFinite(orderId) ? orderId : null,
          focusNonce
        }
      });
      return;
    }

    if (data?.product_id || event === 'low_stock') {
      navigate('/products', {
        state: {
          focusProductId: Number.isFinite(productId) ? productId : null,
          focusNonce
        }
      });
      return;
    }

    if (type.includes('rider')) {
      navigate('/riders', {
        state: {
          focusRiderId: riderId,
          focusNonce
        }
      });
      return;
    }

    if (type.includes('customer')) {
      navigate('/customers', {
        state: {
          focusCustomerId: customerId,
          focusNonce
        }
      });
      return;
    }

    navigate('/');
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
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onProfileClick={handleProfileClick}
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        removeNotification={removeNotification}
        clearAll={clearAll}
        requestNotificationPermission={requestNotificationPermission}
        onNotificationClick={handleNotificationClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader 
          profile={profile} 
          handleSignOut={handleSignOut}
          isActive={isActive}
          handleNavigation={handleNavigation}
          setSlideDirection={setSlideDirection}
          notifications={notifications}
          unreadCount={unreadCount}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          removeNotification={removeNotification}
          clearAll={clearAll}
          requestNotificationPermission={requestNotificationPermission}
          onSettingsClick={() => setIsSettingsModalOpen(true)}
          onProfileClick={handleProfileClick}
          onNotificationClick={handleNotificationClick}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50">
          {(permissionStatus === 'denied' || permissionStatus === 'unsupported') && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {permissionStatus === 'denied'
                    ? 'Browser notifications are blocked. Enable notifications in your browser settings to receive popup alerts.'
                    : 'This browser does not support notification popups. You can still use the in-app notification bell.'}
                </p>
                {permissionStatus === 'denied' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Retry Permission
                  </button>
                )}
              </div>
            </div>
          )}
          <Outlet/>
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  );
}