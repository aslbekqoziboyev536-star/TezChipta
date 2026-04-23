import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Bell, X, Info, Megaphone, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

export const NotificationManager: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkUserStatus = async () => {
      // Check if user has bookings
      const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const hasNoBookings = bookingsSnapshot.empty;

      // Check registration date (assuming createdAt exists on user doc)
      const registrationDate = user.createdAt ? new Date(user.createdAt) : new Date();
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const isRecentlyJoined = registrationDate > twoDaysAgo;

      setIsNewUser(hasNoBookings || isRecentlyJoined);
    };

    checkUserStatus();

    // Listen for notifications
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(5));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as any;
          
          // Check target
          if (notification.target === 'new' && !isNewUser) continue;

          // Check if user has already seen this
          const userNotifRef = doc(db, 'user_notifications', `${user.id}_${notification.id}`);
          const userNotifSnap = await getDocs(query(collection(db, 'user_notifications'), where('__name__', '==', `${user.id}_${notification.id}`)));
          
          if (userNotifSnap.empty) {
            // Only show popup for notifications created in the last 10 minutes to avoid barrage on load
            const createdDate = new Date(notification.createdAt);
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            
            if (createdDate > tenMinutesAgo) {
              setActiveNotification(notification);
            }
          }
        }
      }
    }, (error) => {
      console.error("NotificationManager snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user, isNewUser]);

  const handleDismiss = async () => {
    if (!user || !activeNotification) return;

    try {
      const userNotifRef = doc(db, 'user_notifications', `${user.id}_${activeNotification.id}`);
      await setDoc(userNotifRef, {
        userId: user.id,
        notificationId: activeNotification.id,
        readAt: new Date().toISOString(),
        status: 'read'
      });
      setActiveNotification(null);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'promo': return <Sparkles className="w-6 h-6 text-amber-500" />;
      case 'alert': return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'update': return <Megaphone className="w-6 h-6 text-blue-500" />;
      default: return <Info className="w-6 h-6 text-emerald-500" />;
    }
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#111827] w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center">
                    {getIcon(activeNotification.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('notifications.new')}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {activeNotification.type}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleDismiss}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{t('admin.notifications.title')}</h4>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{activeNotification.title}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{t('admin.notifications.details')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {activeNotification.details}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleDismiss}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20"
              >
                {t('notifications.mark_read')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
