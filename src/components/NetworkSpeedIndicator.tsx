import { useSettings } from '../context/SettingsContext';
import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

export const NetworkSpeedIndicator: React.FC = () => {
  const { logoUrl } = useSettings();
  const [speed, setSpeed] = useState<string>('0.00');

  useEffect(() => {
    const measureSpeed = async () => {
      try {
        const startTime = performance.now();
        const response = await fetch(`${logoUrl}?cache_bust=` + startTime, { 
          cache: 'no-store',
          priority: 'low'
        });
        
        if (!response.ok) return;
        
        const blob = await response.blob();
        const endTime = performance.now();
        
        const durationInSeconds = (endTime - startTime) / 1000;
        const sizeInBits = blob.size * 8;
        
        if (durationInSeconds > 0) {
          const speedMbps = (sizeInBits / durationInSeconds) / (1024 * 1024);
          setSpeed(speedMbps.toFixed(2));
        }
      } catch (error) {
        setSpeed('0.00');
      }
    };

    const interval = setInterval(measureSpeed, 500);
    measureSpeed();

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      drag
      dragConstraints={{ left: -500, right: 0, top: 0, bottom: 800 }}
      initial={{ x: 0, y: 0 }}
      animate={{ 
        y: [0, 5, 0],
      }}
      transition={{
        y: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      className="fixed top-24 right-4 z-[9999] cursor-move flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shadow-xl hover:shadow-emerald-500/20 transition-shadow"
    >
      <div className="flex items-center justify-center">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[8px] opacity-60 uppercase tracking-tighter">Speed</span>
        <span>{speed} <span className="text-[8px]">Mbps</span></span>
      </div>
    </motion.div>
  );
};
