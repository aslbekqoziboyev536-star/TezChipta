import React from 'react';
import { motion } from 'motion/react';
import { Bus } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...', fullScreen = true }) => {
  const containerClasses = fullScreen 
    ? "fixed inset-0 bg-[#0B1120] z-50 flex flex-col items-center justify-center"
    : "w-full py-12 flex flex-col items-center justify-center bg-[#0B1120] rounded-2xl";

  return (
    <div className={containerClasses}>
      <div className="relative w-full max-w-md h-48 flex flex-col items-center justify-center overflow-hidden">
        {/* Road line */}
        <div className="absolute bottom-16 left-10 right-10 h-[1px] bg-white/10" />
        
        {/* Animated Bus Container */}
        <div className="relative w-full h-24 mb-8">
          <motion.div
            initial={{ x: "-20%" }}
            animate={{ x: "120%" }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-0 flex items-center"
          >
            {/* Speed lines */}
            <div className="flex flex-col gap-1.5 mr-4 opacity-40">
              <motion.div 
                animate={{ opacity: [0, 1, 0], x: [0, -20] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="h-[2px] w-6 bg-emerald-500 rounded-full" 
              />
              <motion.div 
                animate={{ opacity: [0, 1, 0], x: [0, -15] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                className="h-[2px] w-4 bg-emerald-500 rounded-full" 
              />
            </div>

            <div className="relative">
              {/* Custom Bus SVG matching the image */}
              <svg viewBox="0 0 120 60" className="w-32 h-16 drop-shadow-2xl overflow-visible">
                {/* Bus Body */}
                <rect 
                  x="10" y="10" width="100" height="40" rx="8" 
                  fill="#10B981" 
                />
                
                {/* Windows */}
                <rect x="18" y="18" width="18" height="15" fill="#34D399" rx="3" />
                <rect x="41" y="18" width="18" height="15" fill="#34D399" rx="3" />
                <rect x="64" y="18" width="18" height="15" fill="#34D399" rx="3" />
                <rect x="87" y="18" width="18" height="15" fill="#34D399" rx="3" />
                
                {/* Headlight (Yellow) */}
                <circle cx="106" cy="38" r="3" fill="#FBBF24" />
                
                {/* Taillight (Red) */}
                <rect x="10" y="35" width="2" height="8" fill="#EF4444" rx="1" />
                
                {/* Wheels */}
                <g>
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    style={{ originX: 0.5, originY: 0.5 }}
                  >
                    <circle cx="30" cy="50" r="8" fill="#1F2937" stroke="#10B981" strokeWidth="2" />
                    <line x1="25" y1="45" x2="35" y2="55" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
                    <line x1="35" y1="45" x2="25" y2="55" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
                  </motion.g>
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    style={{ originX: 0.5, originY: 0.5 }}
                  >
                    <circle cx="90" cy="50" r="8" fill="#1F2937" stroke="#10B981" strokeWidth="2" />
                    <line x1="85" y1="45" x2="95" y2="55" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
                    <line x1="95" y1="45" x2="85" y2="55" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
                  </motion.g>
                </g>
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Loading dots matching the image */}
        <div className="flex gap-3 mt-12">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: i === 0 ? ["#064e3b", "#10B981", "#064e3b"] : ["#064e3b", "#064e3b", "#064e3b"],
                scale: i === 0 ? [1, 1.2, 1] : [1, 1, 1],
                opacity: i === 0 ? [0.5, 1, 0.5] : [0.3, 0.3, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3
              }}
              className="w-3 h-3 rounded-full bg-[#064e3b]"
            />
          ))}
        </div>
      </div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 text-emerald-500/60 text-sm font-medium tracking-widest uppercase"
      >
        {message}
      </motion.p>
    </div>
  );
};
