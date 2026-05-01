import React from 'react';
import { motion } from 'motion/react';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1120] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated 404 text */}
          <div className="relative mb-8">
            <motion.h1 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 100, 
                damping: 10,
                repeat: Infinity,
                repeatType: 'mirror',
                duration: 2
              }}
              className="text-[120px] sm:text-[180px] font-black text-gray-100 dark:text-white/5 leading-none select-none"
            >
              404
            </motion.h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-emerald-500/20">
                <Search className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-500 animate-bounce" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Sahifa topilmadi
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan bo'lishi mumkin.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              className="w-full sm:w-auto px-8 py-6 rounded-2xl border-gray-200 dark:border-white/10 text-lg font-bold bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10"
              leftIcon={<ArrowLeft className="w-5 h-5" />}
            >
              Orqaga qaytish
            </Button>
            
            <Link to="/" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold shadow-lg shadow-emerald-500/20 group"
                leftIcon={<Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />}
              >
                Bosh sahifaga
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <Link to="/blog" className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-emerald-500/30 transition-all group">
              <Search className="w-6 h-6 text-emerald-500 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">Blogni o'qing</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Eng so'nggi yangiliklar va maqolalar.</p>
            </Link>
            
            <Link to="/admin/statistics" className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-emerald-500/30 transition-all group">
              <HelpCircle className="w-6 h-6 text-blue-500 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">Statistika</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Xizmatimiz haqida qiziqarli ko'rsatkichlar.</p>
            </Link>

            <a href="#help" className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-emerald-500/30 transition-all group">
              <HelpCircle className="w-6 h-6 text-amber-500 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">Yordam</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Savollaringizga javob olishingiz mumkin.</p>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 right-[15%] w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-20 hidden sm:block" />
      <div className="absolute bottom-40 left-[10%] w-3 h-3 bg-blue-500 rounded-full animate-bounce opacity-20 hidden sm:block" />
    </div>
  );
}
