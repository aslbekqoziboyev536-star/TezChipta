/**
 * SUPABASE INTEGRATION EXAMPLES
 * 
 * This file demonstrates how to use Supabase in TezChipta frontend
 */

// ============================================
// EXAMPLE 1: Using Supabase Client in React
// ============================================

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function PaymentHistoryExample() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2>Payment History</h2>
      {payments.map((payment) => (
        <div key={payment.id} className="p-4 border rounded">
          <p><strong>Booking ID:</strong> {payment.booking_id}</p>
          <p><strong>Event:</strong> {payment.event}</p>
          <p><strong>Status:</strong> {payment.status}</p>
          <p><strong>Date:</strong> {new Date(payment.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Real-time Payment Updates
// ============================================

export function RealtimePaymentUpdates() {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Subscribe to real-time changes using channel
    const channel = supabase
      .channel('payment-updates')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_logs'
        },
        (payload: any) => {
          console.log('Payment status changed:', payload.new);
          setStatus(`Payment ${payload.new.booking_id} is now ${payload.new.status}`);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return <div>{status}</div>;
}

// ============================================
// EXAMPLE 3: Get Current User
// ============================================

import { getCurrentSupabaseUser, isSupabaseAuthenticated } from '../lib/supabase';

export async function checkUserAuth() {
  const user = await getCurrentSupabaseUser();
  if (user) {
    console.log('Current user:', user.email);
  } else {
    console.log('No user logged in');
  }

  const isAuth = await isSupabaseAuthenticated();
  console.log('Is authenticated:', isAuth);
}

// ============================================
// EXAMPLE 4: Query Data with Filters
// ============================================

async function fetchUserPayments(userId: string) {
  const { data, error } = await supabase
    .from('payment_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Error fetching user payments:', error);
    return [];
  }

  return data || [];
}

// ============================================
// EXAMPLE 5: Real-time Notifications
// ============================================

export function usePaymentNotifications(userId: string) {
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    // Subscribe to new payment logs for this user using channel
    const channel = supabase
      .channel(`payment-notifications-${userId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_logs',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          setNotification({
            type: payload.new.event,
            status: payload.new.status,
            time: new Date().toLocaleTimeString()
          });

          // Auto-clear notification after 5 seconds
          setTimeout(() => setNotification(null), 5000);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return notification;
}

// ============================================
// EXAMPLE 6: Backend Server Usage
// ============================================

/*
In server.ts or backend files:

import { logToSupabase, queryFromSupabase } from './src/lib/supabaseServer';

// Log payment event
await logToSupabase('payment_logs', {
  booking_id: '123',
  user_id: 'uid123',
  event: 'receipt_uploaded',
  status: 'pending_review',
  uploaded_at: new Date().toISOString()
});

// Query payment logs
const logs = await queryFromSupabase('payment_logs', {
  select: 'id, booking_id, status, created_at',
  filter: { key: 'status', value: 'pending_review' }
});

// Update payment status
await updateSupabase('payment_logs', 'log-id', {
  status: 'completed',
  confirmed_at: new Date().toISOString()
});
*/

export default {};
