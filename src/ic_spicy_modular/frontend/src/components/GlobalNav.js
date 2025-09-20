import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { ConnectWallet, useIdentityKit } from '@nfid/identitykit/react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/navigation.css';

const GlobalNav = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  
  const {
    principal,
    iiLoggedIn,
    loginII,
    logoutII,
    plugConnected,
    connectPlug,
    disconnectPlug,
    phantomConnected,
    connectPhantom,
    disconnectPhantom
  } = useWallet();

  const { user, signer } = useIdentityKit();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsWalletDropdownOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsWalletDropdownOpen(false);
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isConnected = !!(user?.principal || iiLoggedIn || plugConnected || phantomConnected);

  const getWalletType = () => {
    if (user?.principal) {
      if (signer?.signerType === 'OISY' || signer?.name?.includes('OISY') || signer?.id === 'OISY') return 'OISY';
      if (signer?.signerType === 'NFIDW' || signer?.name?.includes('NFID') || signer?.id === 'NFIDW') return 'NFID';
    }
    if (iiLoggedIn) return 'Internet Identity';
    if (plugConnected) return 'Plug';
    if (phantomConnected) return 'Phantom';
    return null;
  };

  const getWalletTypeColor = (type) => {
    switch (type) {
      case 'OISY': return 'from-emerald-500 to-emerald-600';
      case 'NFID': return 'from-blue-500 to-blue-600';
      case 'Internet Identity': return 'from-purple-500 to-purple-600';
      case 'Plug': return 'from-pink-500 to-pink-600';
      case 'Phantom': return 'from-purple-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Primary navigation items (always visible on desktop)
  const primaryNavItems = [
    { path: '/', label: 'Home', icon: '🏠', mobileLabel: 'Home' },
    { path: '/portal', label: 'Portal', icon: '🚪', mobileLabel: 'Portal' },
    { path: '/wallet', label: 'Wallet', icon: '💎', mobileLabel: 'Wallet' },
    { path: '/shop', label: 'Shop', icon: '🛍️', mobileLabel: 'Shop' },
    { path: '/blog', label: 'Blog', icon: '📝', mobileLabel: 'Blog' }
  ];

  // Secondary navigation items (dropdown on desktop, separate section on mobile)
  const secondaryNavItems = [
    { path: '/ai', label: 'AI Chat', icon: '🤖', mobileLabel: 'AI' },
    { path: '/game', label: 'Game', icon: '🎮', mobileLabel: 'Game' },
    { path: '/membership', label: 'Membership', icon: '👑', mobileLabel: 'Member' },
    { path: '/coop-logistics', label: 'Co-op Logistics', icon: '📦', mobileLabel: 'Co-op' },
    { path: '/logistics', label: 'Logistics', icon: '🚚', mobileLabel: 'Logistics' },
    { path: '/profile', label: 'Profile', icon: '👤', mobileLabel: 'Profile' }
  ];

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleDisconnect = () => {
    if (phantomConnected) disconnectPhantom();
    if (iiLoggedIn) logoutII();
    if (plugConnected) disconnectPlug();
    setIsWalletDropdownOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0"
          >
            <Link to="/" className="flex items-center space-x-2 lg:space-x-3 group">
              <div className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform duration-300">
                🌶️
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-bold luxury-heading">IC SPICY</h1>
                <p className="text-xs text-gray-400 -mt-1 hidden lg:block">The Future of Spice</p>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-3xl">
            {/* Primary Navigation */}
            {primaryNavItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              </motion.div>
            ))}

            {/* More Menu for Secondary Items */}
            <div className="relative dropdown-container">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                  secondaryNavItems.some(item => location.pathname === item.path)
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-sm">⚡</span>
                <span className="hidden xl:inline">More</span>
                <motion.svg
                  animate={{ rotate: isMoreMenuOpen ? 180 : 0 }}
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </motion.button>

              {/* More Menu Dropdown */}
              <AnimatePresence>
                {isMoreMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-56 luxury-glass-dark rounded-xl shadow-2xl border border-white/20 z-50"
                  >
                    <div className="p-2">
                      {secondaryNavItems.map((item) => (
                        <motion.div
                          key={item.path}
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            to={item.path}
                            onClick={() => setIsMoreMenuOpen(false)}
                            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                              location.pathname === item.path
                                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200'
                                : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
            {/* IdentityKit handles OISY and NFID automatically */}
            <div className="hidden sm:block">
              <ConnectWallet />
            </div>
            
            {/* Additional Wallet Options */}
            {!isConnected && (
              <div className="relative dropdown-container">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                  className="px-3 py-2 rounded-lg text-xs lg:text-sm luxury-btn hidden sm:flex items-center"
                >
                  <span className="lg:inline hidden">🔐 More</span>
                  <span className="lg:hidden">🔐</span>
                  <motion.svg
                    animate={{ rotate: isWalletDropdownOpen ? 180 : 0 }}
                    className="w-3 h-3 ml-1 lg:ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </motion.button>
                
                {/* Wallet Dropdown */}
                <AnimatePresence>
                  {isWalletDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-72 luxury-glass-dark rounded-xl shadow-2xl border border-white/20"
                    >
                      <div className="p-4">
                        {/* OISY/NFID Info */}
                        <div className="text-xs text-gray-400 px-3 py-2 border-b border-white/10 mb-3">
                          Already Available Above
                        </div>
                        
                        <div className="px-3 py-3 text-center mb-4">
                          <div className="text-sm text-gray-300 mb-2">
                            OISY & NFID are handled by the ConnectWallet button above
                          </div>
                          <div className="text-xs text-gray-500">
                            Click the button above to connect with OISY or NFID
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 px-3 py-2 border-b border-white/10 mb-3">
                          Other Options
                        </div>
                        
                        {/* Internet Identity */}
                        <motion.button
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={loginII}
                          className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 transition-all flex items-center gap-3 group/item mb-2"
                        >
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm">II</span>
                          </div>
                          <div>
                            <div className="font-medium text-white">Internet Identity</div>
                            <div className="text-xs text-gray-400">IC native authentication</div>
                          </div>
                        </motion.button>
                        
                        {/* Plug Wallet */}
                        <motion.button
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={connectPlug}
                          className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 transition-all flex items-center gap-3 group/item mb-2"
                        >
                          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm">P</span>
                          </div>
                          <div>
                            <div className="font-medium text-white">Plug Wallet</div>
                            <div className="text-xs text-gray-400">IC ecosystem wallet</div>
                          </div>
                        </motion.button>
                        
                        {/* Phantom Wallet */}
                        <motion.button
                          whileHover={{ x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={connectPhantom}
                          className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/10 transition-all flex items-center gap-3 group/item"
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm">👻</span>
                          </div>
                          <div>
                            <div className="font-medium text-white">Phantom Wallet</div>
                            <div className="text-xs text-gray-400">Multi-chain wallet</div>
                          </div>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Disconnect Button when connected */}
            {isConnected && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnect}
                className="px-2 lg:px-3 py-2 rounded-lg text-xs spicy-btn hidden sm:block"
              >
                <span className="lg:inline hidden">Disconnect</span>
                <span className="lg:hidden">🚪</span>
              </motion.button>
            )}

            {/* Connected Wallet Badge */}
            {isConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 lg:px-3 py-1 rounded-full text-xs font-medium hidden sm:block"
                style={{
                  background: `linear-gradient(135deg, ${getWalletTypeColor(getWalletType())})`,
                  color: 'white'
                }}
              >
                <span className="lg:inline hidden">{getWalletType()}</span>
                <span className="lg:hidden">
                  {getWalletType() === 'OISY' ? '🟢' : 
                   getWalletType() === 'NFID' ? '🔵' :
                   getWalletType() === 'Internet Identity' ? '🟣' :
                   getWalletType() === 'Plug' ? '🩷' :
                   getWalletType() === 'Phantom' ? '👻' : '🔗'}
                </span>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden luxury-glass-dark rounded-xl mb-4 border border-white/20 overflow-hidden"
            >
              <div className="p-4">
                {/* Wallet Connection on Mobile */}
                {!isConnected && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <div className="text-xs text-gray-400 mb-2">Connect Wallet</div>
                    <div className="flex flex-col space-y-2">
                      <ConnectWallet />
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={loginII}
                          className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-300 text-xs flex items-center justify-center space-x-2"
                        >
                          <span>II</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={connectPlug}
                          className="px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 text-xs flex items-center justify-center space-x-2"
                        >
                          <span>Plug</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connected Wallet Info on Mobile */}
                {isConnected && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: `linear-gradient(135deg, ${getWalletTypeColor(getWalletType())})` }}
                        />
                        <span className="text-sm text-white font-medium">{getWalletType()}</span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDisconnect}
                        className="px-3 py-1 rounded-lg bg-red-600/20 text-red-300 text-xs"
                      >
                        Disconnect
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Primary Navigation */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">Main</div>
                  <div className="grid grid-cols-2 gap-2">
                    {primaryNavItems.map((item) => (
                      <motion.div
                        key={item.path}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link
                          to={item.path}
                          className={`block px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center space-y-1 ${
                            location.pathname === item.path
                              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-500/30'
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs">{item.mobileLabel}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Secondary Navigation */}
                <div>
                  <div className="text-xs text-gray-400 mb-2">More</div>
                  <div className="grid grid-cols-2 gap-2">
                    {secondaryNavItems.map((item) => (
                      <motion.div
                        key={item.path}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link
                          to={item.path}
                          className={`block px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center space-y-1 ${
                            location.pathname === item.path
                              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-500/30'
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs">{item.mobileLabel}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default GlobalNav;
