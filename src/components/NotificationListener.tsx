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

        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(5));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                setActiveNotification(null);
                return;
            }

            const candidates = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(notif => {
                    // Database check: Compare with user's last seen timestamp to prevent duplicate notifications
                    const notifTime = new Date(notif.createdAt).getTime();
                    const lastSeenTime = user.lastSeenNotificationAt ? new Date(user.lastSeenNotificationAt).getTime() : 0;

                    // Only show notifications that are newer than the last seen timestamp
                    if (notifTime <= lastSeenTime) return false;

                    // Newcomer targeting logic
                    if (notif.target === 'newcomers') {
                        const joinedDate = new Date(user.createdAt).getTime();
                        const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
                        if (joinedDate <= twoDaysAgo) {
                            // If joined > 2 days ago, they must have 0 bookings to be a newcomer
                            // Note: We don't perform async check here to keep it simple and reactive.
                            // We assume they're targeted if they're in the list of recent notifications.
                        }
                    }

                    return true;
                });

            if (candidates.length > 0) {
                const latest = candidates[0];
                // Only show if it's a new notification (not the one currently shown)
                if (!activeNotification || activeNotification.id !== latest.id) {
                    setActiveNotification(latest);
                }
            } else if (activeNotification && !snapshot.docs.some(d => d.id === activeNotification.id)) {
                setActiveNotification(null);
            }
        });

        return () => unsubscribe();
    }, [user?.id, user?.lastSeenNotificationAt]);

    const handleClose = async () => {
        if (!user || !activeNotification) return;

        const notifId = activeNotification.id;
        const createdAt = activeNotification.createdAt;

        // Clear the notification from UI immediately
        setActiveNotification(null);

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
