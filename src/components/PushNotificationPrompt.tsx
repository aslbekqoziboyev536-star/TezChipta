import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { Button } from './ui/Button';

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only check if notifications are supported
    if (!('Notification' in window)) return;

    // We only prompt if permission is 'default'
    if (Notification.permission !== 'default') return;

    const DISMISS_KEY = 'notification_prompt_dismissed';
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let firstVisit = sessionStorage.getItem('first_visit_time');
    const now = Date.now();
    
    if (!firstVisit) {
      firstVisit = now.toString();
      sessionStorage.setItem('first_visit_time', firstVisit);
    }

    const timeSinceVisit = now - parseInt(firstVisit, 10);
    // 2 minutes = 120,000 ms
    if (timeSinceVisit > 120000) {
      return; 
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      // Re-check permission in case they granted it
      if (Notification.permission === 'default') {
        setShow(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShow(false);
      } else {
        handleDismiss();
      }
    } catch (e) {
      console.error(e);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 w-[calc(100%-2rem)] sm:w-auto max-w-sm bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-5"
      >
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1.5 text-sm sm:text-base">Bildirishnomalarni yoqish</h4>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Yangi reyslar va muhim xabarlardan birinchilardan bo'lib xabardor bo'lish uchun bildirishnomalarni yoqing.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRequest} className="bg-blue-500 hover:bg-blue-600 text-white flex-1 text-xs sm:text-sm py-2">Ruxsat berish</Button>
              <Button size="sm" variant="secondary" onClick={handleDismiss} className="flex-1 text-xs sm:text-sm py-2 bg-gray-100 dark:bg-white/5 border-0">Keyinroq</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
