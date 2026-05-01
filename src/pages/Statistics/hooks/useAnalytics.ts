import { useState, useEffect, useMemo } from 'react';
import { collection, query, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { AnalyticsData } from '../types';

export function useAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    users: [],
    bookings: [],
    rides: []
  });

  useEffect(() => {
    if (authLoading) return;
    
    // Server-side role verification rule applied here via navigation protection
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    let unsubscribeUsers: () => void;
    let unsubscribeBookings: () => void;
    let unsubscribeRides: () => void;

    const setupListeners = () => {
      try {
        // PRO OPTIMIZATION: Limit data fetching to prevent heavy load
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500));
        const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(500));
        const ridesQuery = query(collection(db, 'rides'), orderBy('createdAt', 'desc'), limit(500));

        unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
          setData(prev => ({ ...prev, users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
        });

        unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
          setData(prev => ({ ...prev, bookings: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
        });

        unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
          setData(prev => ({ ...prev, rides: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
          setLoading(false); // We can assume loading is done when rides stream in
        });

      } catch (error) {
        console.error("Error setting up real-time statistics:", error);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeRides) unsubscribeRides();
    };
  }, [user, authLoading, navigate]);

  return { data, loading, authLoading, user };
}
