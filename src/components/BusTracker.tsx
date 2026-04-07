import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bus, Navigation, X, Gauge } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { io, Socket } from 'socket.io-client';

interface BusTrackerProps {
  rideId: string;
  onClose: () => void;
}

export const BusTracker: React.FC<BusTrackerProps> = ({ rideId, onClose }) => {
  const { t } = useLanguage();
  
  const [rideData, setRideData] = useState<any>(null);
  const [busLocation, setBusLocation] = useState<{ lat: number, lng: number, speed?: number } | null>(null);

  useEffect(() => {
    if (!rideId) return;

    // Fetch initial ride data
    const fetchRide = async () => {
      const docRef = doc(db, 'rides', rideId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRideData(docSnap.data());
      }
    };
    fetchRide();

    // Socket.IO setup
    const socket: Socket = io();
    
    socket.emit('join_bus', rideId);

    socket.on('location_update', (data) => {
      console.log('Received location update via socket:', data);
      setBusLocation(data);
    });

    return () => {
      socket.emit('leave_bus', rideId);
      socket.disconnect();
    };
  }, [rideId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-[#111827] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-emerald-500 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('profile.bus_location_title')}</h3>
              <p className="text-xs text-white/80">{t('profile.live_tracking')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center justify-center min-h-[300px] bg-gray-50 dark:bg-[#0B1120]">
          {!busLocation ? (
            <div className="text-center">
              <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('profile.location_not_found')}</h4>
              <p className="text-gray-500 dark:text-gray-400">{t('profile.driver_not_sharing')}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Bus className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-[#0B1120] flex items-center justify-center animate-pulse">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Avtobus harakatda</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Kenglik: {busLocation.lat.toFixed(4)} <br/>
                Uzunlik: {busLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white dark:bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Yo'nalish</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {rideData?.from} → {rideData?.to}
              </span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Vaqt</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {rideData?.departureTime} - {rideData?.arrivalTime}
              </span>
            </div>
            {busLocation?.speed !== undefined && (
              <>
                <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> Tezlik
                  </span>
                  <span className="text-sm font-bold text-emerald-500">
                    {Math.round(busLocation.speed * 3.6)} km/h
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full font-medium">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            {t('profile.live_status')}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
