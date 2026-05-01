import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { Menu, X, Home, User, ShieldCheck, LogOut, Info, MessageCircle, HelpCircle, Newspaper, TrendingUp, Ticket, Languages, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { SafeImage } from './SafeImage';

import { useSettings } from '../context/SettingsContext';

export const FloatingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('left');
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { logoUrl } = useSettings();
  const navigate = useNavigate();

  const handleToggle = (e: any) => {
    // Determine side based on button position
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    if (buttonRect.left + buttonRect.width / 2 < centerX) {
      setSide('left');
    } else {
      setSide('right');
    }
    setIsOpen(!isOpen);
    setShowLangMenu(false);
  };

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: t('menu.home'), path: '/' },
    { icon: <Newspaper className="w-5 h-5" />, label: t('menu.blog'), path: '/blog' },
    { icon: <User className="w-5 h-5" />, label: t('menu.profile'), path: '/profile', auth: true },
    { icon: <ShieldCheck className="w-5 h-5" />, label: t('menu.admin'), path: '/administrator/dashboard', admin: true },
    { icon: <TrendingUp className="w-5 h-5" />, label: t('menu.stats'), path: '/admin/statistics', adminOnly: true },
    { icon: <HelpCircle className="w-5 h-5" />, label: t('menu.help'), path: '/#help' },
  ];

  const languages = [
    { code: 'uz', label: t('lang.uz'), flag: '🇺🇿' },
    { code: 'ru', label: t('lang.ru'), flag: '🇷🇺' },
    { code: 'en', label: t('lang.en'), flag: '🇬🇧' },
  ] as const;

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/');
  };

  const isVisible = (item: any) => {
    if (item.auth && !user) return false;
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.admin && user?.role !== 'admin' && user?.role !== 'driver') return false;
    return true;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Floating Button */}
      <Button
        drag
        dragMomentum={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleToggle}
        className="fixed bottom-8 left-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-500/30 z-[110] pointer-events-auto cursor-grab active:cursor-grabbing border-2 border-white/20 p-0"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="flex flex-col gap-1"
            >
              <div className="w-6 h-0.5 bg-white rounded-full"></div>
              <div className="w-6 h-0.5 bg-white rounded-full"></div>
              <div className="w-6 h-0.5 bg-white rounded-full"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] pointer-events-auto"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: side === 'right' ? '100%' : '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: side === 'right' ? '100%' : '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 ${side === 'right' ? 'right-0 border-l' : 'left-0 border-r'} h-full w-72 bg-white dark:bg-[#111827] shadow-2xl z-[100] p-8 flex flex-col border-gray-200 dark:border-white/5 pointer-events-auto`}
            >
              <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center overflow-hidden">
                  <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('menu.title')}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('menu.subtitle')}</p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                {menuItems.map((item, index) => {
                  if (!isVisible(item)) return null;

                  return (
                    <Link
                      key={index}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-500 transition-all group"
                    >
                      <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg group-hover:bg-white dark:group-hover:bg-emerald-500/20 transition-colors">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}

                {/* Language Switcher Section */}
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg group-hover:bg-white dark:group-hover:bg-emerald-500/20 transition-colors">
                        <Languages className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{t('lang.select')}</span>
                    </div>
                    <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 px-2 py-1 rounded-lg uppercase">
                      {language}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showLangMenu && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1 mt-2 ml-4"
                      >
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setShowLangMenu(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                              language === lang.code
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{lang.flag}</span>
                              <span className="font-medium text-sm">{lang.label}</span>
                            </div>
                            {language === lang.code && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {user ? (
                <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border-0 h-auto"
                  >
                    <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{t('menu.logout')}</span>
                  </Button>
                </div>
              ) : (
                <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {t('menu.login')}
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
