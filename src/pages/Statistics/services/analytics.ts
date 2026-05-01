import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export type EventType = 
  | 'page_view'
  | 'booking_created'
  | 'user_login'
  | 'user_registered'
  | 'ride_view'
  | 'admin_action'
  | 'error_spike';

interface EventData {
  userId?: string;
  metadata?: Record<string, any>;
}

export const trackEvent = async (eventName: EventType, data?: EventData) => {
  try {
    await addDoc(collection(db, 'events'), {
      eventName,
      userId: data?.userId || 'anonymous',
      metadata: data?.metadata || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Silently fail in production to prevent UX issues, but log in dev
    console.warn("Failed to track event:", error);
  }
};
