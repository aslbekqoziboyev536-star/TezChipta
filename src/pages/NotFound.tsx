import React from 'react';
import { motion } from 'motion/react';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="max-w-xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated 404 Text */}
          <div className="relative inline-block">
            <motion.h1 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1 
              }}
              className="text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 leading-none"
            >
              404
            </motion.h1>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                y: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-4 -right-4"
            >
              <Search className="w-12 h-12 text-emerald-500 opacity-50" />
            </motion.div>
          </div>

          <h2 className="text-3xl font-bold text-white mt-8 mb-4">
            Sahifa topilmadi
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-md mx-auto">
            Siz qidirayotgan sahifa o'chirilgan, nomi o'zgartirilgan yoki vaqtinchalik mavjud emas bo'lishi mumkin.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors border border-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Orqaga qaytish
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
            >
              <Home className="w-5 h-5" />
              Bosh sahifa
            </motion.button>
          </div>
        </motion.div>

        {/* Decorative Grid */}
        <div className="absolute inset-x-0 -bottom-40 h-80 bg-gradient-to-t from-[#0B1120] to-transparent z-20" />
      </div>
    </div>
  );
}
