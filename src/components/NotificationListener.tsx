import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { NotificationPopup } from './NotificationPopup';

export function NotificationListener() {
    const { user } = useAuth();
    const [activeNotification, setActiveNotification] = useState<any>(null);

    useEffect(() => {
        if (!user || user.role === 'admin') {
            setActiveNotification(null);
            return;
        }

        const DISMISSED_KEY = `dismissed_notifs_${user.id}`;

        const getDismissed = (): string[] => {
            try {
                return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
            } catch {
                return [];
            }
        };

        const addDismissed = (id: string) => {
            const list = getDismissed();
            if (!list.includes(id)) {
                localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list.slice(-50), id]));
            }
        };

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setActiveNotification(null);
                return;
            }

            const dismissed = getDismissed();
            const candidates = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(notif => {
                    // 1. Persistent check: Don't show if dismissed in this browser
                    if (dismissed.includes(notif.id)) return false;

                    // 2. Database check: Compare with user's last seen timestamp
                    const notifTime = new Date(notif.createdAt).getTime();
                    // Use a more robust check for lastSeenNotificationAt
                    const lastSeenValue = user.lastSeenNotificationAt;
                    const lastSeenTime = lastSeenValue ? new Date(lastSeenValue).getTime() : 0;

                    // If conversion failed or time is older, don't show
                    if (isNaN(notifTime) || notifTime <= lastSeenTime) return false;

                    // 3. User targeting: Show only if it's for them or target is 'all'
                    const isForUser = notif.userId === user.id || notif.target === 'all';
                    // Special case: if user joined AFTER the notification was created, don't show 'all' notifications
                    if (notif.target === 'all') {
                        const userJoinTime = new Date(user.createdAt).getTime();
                        if (notifTime < userJoinTime) return false;
                    }

                    return isForUser;
                });

            if (candidates.length > 0) {
                const latest = candidates[0];
                // Only show if it's a new notification
                if (!activeNotification || activeNotification.id !== latest.id) {
                    setActiveNotification(latest);
                }
            } else if (activeNotification && !snapshot.docs.some(d => d.id === activeNotification.id)) {
                setActiveNotification(null);
            }
        });

        // Expose addDismissed to handleClose via a custom event or shared state if needed, 
        // but it's simpler to just add to localStorage in handleClose.

        return () => unsubscribe();
    }, [user?.id, user?.lastSeenNotificationAt]);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        let isInitialLoadMessages = true;
        let isInitialLoadReviews = true;

        const messagesRef = collection(db, 'messages');
        const qMessages = query(messagesRef, where('status', '==', 'unread'));
        const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
            if (isInitialLoadMessages) {
                isInitialLoadMessages = false;
                return;
            }
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (Notification.permission === 'granted') {
                        new Notification('Yangi xabar (TezChipta)', {
                            body: `${data.name}: ${data.message}`,
                        });
                    }
                }
            });
        });

        const reviewsRef = collection(db, 'reviews');
        const qReviews = query(reviewsRef, where('status', '==', 'pending'));
        const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
            if (isInitialLoadReviews) {
                isInitialLoadReviews = false;
                return;
            }
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (Notification.permission === 'granted') {
                        new Notification('Yangi fikr-mulohaza (TezChipta)', {
                            body: `${data.userName}: ${data.comment}`,
                        });
                    }
                }
            });
        });

        return () => {
            unsubscribeMessages();
            unsubscribeReviews();
        };
    }, [user?.id, user?.role]);

    const handleClose = async () => {
        if (!user || !activeNotification) return;

        const notifId = activeNotification.id;
        const createdAt = activeNotification.createdAt;

        // 1. Add to local storage immediately to prevent re-appearance
        const DISMISSED_KEY = `dismissed_notifs_${user.id}`;
        try {
            const list = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
            if (!list.includes(notifId)) {
                localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list.slice(-50), notifId]));
            }
        } catch (e) {
            console.error("Storage error", e);
        }

        // 2. Clear from UI
        setActiveNotification(null);

        // 3. Sync with database
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                lastSeenNotificationAt: createdAt
            });
        } catch (error) {
            console.error("Error updating lastSeenNotificationAt:", error);
        }
    };

    return (
        <NotificationPopup
            notification={activeNotification}
            onClose={handleClose}
        />
    );
}
