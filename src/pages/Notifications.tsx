import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, CheckCircle2, Info, AlertTriangle, PartyPopper } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Notifications() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, navigate]);

    const handleMarkAsRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        try {
            await updateDoc(doc(db, 'notifications', id), {
                isRead: true
            });
        } catch (err) {
            console.error("Error marking as read", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const batch = writeBatch(db);
            const unread = notifications.filter(n => !n.isRead);
            unread.forEach(n => {
                batch.update(doc(db, 'notifications', n.id), { isRead: true });
            });
            await batch.commit();
        } catch (err) {
            console.error("Error marking all as read", err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <PartyPopper className="w-6 h-6 text-emerald-500" />;
            case 'alert': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            default: return <Info className="w-6 h-6 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 font-inter pb-20">
            <div className="max-w-2xl mx-auto space-y-6 mt-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => navigate(-1)}
                            className="p-2 border-0 bg-white dark:bg-[#111827] shadow-sm hover:scale-105 h-auto rounded-full"
                            leftIcon={<ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
                        />
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">
                            Bildirishnomalar
                        </h1>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            onClick={handleMarkAllAsRead}
                            className="text-emerald-500 hover:text-emerald-600 text-sm font-medium border-0 h-auto p-2"
                            leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        >
                            Barchasini o'qish
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="space-y-4">
                    {notifications.length > 0 ? (
                        notifications.map((notif, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif.id, notif.isRead)}
                                className={`relative overflow-hidden bg-white dark:bg-[#111827] p-6 rounded-3xl cursor-pointer transition-all border ${notif.isRead ? 'border-gray-100 dark:border-white/5 opacity-70' : 'border-emerald-500/30 shadow-lg shadow-emerald-500/10'}`}
                            >
                                {!notif.isRead && (
                                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                                )}
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notif.isRead ? 'bg-gray-100 dark:bg-white/5' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className={`font-bold ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-xs font-medium text-gray-400 shrink-0">
                                                {new Date(notif.createdAt).toLocaleDateString('uz-UZ')}
                                            </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-[#111827] rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Bell className="w-10 h-10 text-emerald-500 opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hozircha bildirishnomalar yo'q</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">Sizga kelgan barcha yangiliklar va eslatmalar shu yerda ko'rinadi.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
