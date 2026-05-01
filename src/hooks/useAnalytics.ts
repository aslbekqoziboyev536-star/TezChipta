import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const socketUrl = import.meta.env.DEV ? 'http://localhost:5174' : '/';
let socket: Socket | null = null;

export const useAnalytics = (event?: 'home' | 'search' | 'booking' | 'success') => {
  useEffect(() => {
    if (!socket) {
      socket = io(socketUrl);
    }

    if (event) {
      socket.emit('track_event', event);
    }
  }, [event]);

  return {
    track: (e: 'home' | 'search' | 'booking' | 'success') => {
      socket?.emit('track_event', e);
    }
  };
};
