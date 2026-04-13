import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, Mail, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Successful() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#111827] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-500/10 border border-gray-100 dark:border-white/5 text-center relative z-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4"
        >
          Email Tasdiqlandi!
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed"
        >
          Tabriklaymiz! Sizning elektron pochta manzilingiz muvaffaqiyatli tasdiqlandi. Endi siz barcha imkoniyatlardan to'liq foydalanishingiz mumkin.
        </motion.p>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/login">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-2xl shadow-lg shadow-emerald-500/20 group text-lg font-bold">
                <span>Tizimga Kirish</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link to="/">
              <Button variant="secondary" className="w-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 py-6 rounded-2xl border border-gray-200 dark:border-white/10 text-lg font-bold">
                <Home className="w-5 h-5 mr-2" />
                <span>Bosh Sahifaga</span>
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5"
        >
          <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500 text-sm font-medium">
            <Mail className="w-4 h-4" />
            <span>tezchipta.uz</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Text */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-sm text-gray-400 dark:text-gray-500 font-medium"
      >
        © {new Date().getFullYear()} Tez Chipta. Barcha huquqlar himoyalangan.
      </motion.p>
    </div>
  );
}
