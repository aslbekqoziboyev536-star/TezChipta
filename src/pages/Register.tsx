import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import { Button } from '../components/ui/Button';
import { Bus, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAsync } from '../hooks/useAsync';
import { SafeImage } from '../components/SafeImage';

import { getAuthErrorMessage } from '../utils/authErrors';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

export default function Register() {
  const { t } = useLanguage();
  const { logoUrl } = useSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const navigate = useNavigate();
  const { registerWithEmail, user } = useAuth();
  const { loading, error, execute, reset } = useAsync();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      await execute(() => registerWithEmail(email, password, name));
      toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz! Iltimos, pochtangizni tekshiring va havolani tasdiqlang.", {
        duration: 8000
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>
      
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
        <Link to="/login" className="flex items-center text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm font-medium">Back to login</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-12 sm:mt-0">
        <div className="flex justify-center">
          <SafeImage src={logoUrl} alt="Tez Chipta" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white px-4">
          Create a new account
        </h2>
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4">
          For regular users. Drivers must register through admin.
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#111827] py-6 sm:py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200 dark:border-white/5">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm flex gap-3 items-start overflow-hidden shadow-sm shadow-red-500/5 mb-2"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">{getAuthErrorMessage(error)}</span>
                  {error.toString().includes('registered') && (
                    <Link to="/login" className="text-xs font-bold underline flex items-center gap-1 hover:opacity-80 transition-opacity">
                      Tizimga kirish sahifasiga o'tish
                    </Link>
                  )}
                  <Link to="/errors" className="text-[10px] opacity-70 underline hover:opacity-100">
                    Xatoliklar markazidan yordam olish
                  </Link>
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  placeholder="Ism Familiya"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.login.email_label')}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  placeholder="example@mail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.login.password_label')}</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                loading={loading}
                className="w-full"
              >{t('auth.login.register_link')}</Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-[#111827] text-gray-500">Yoki</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={() => navigate('/login', { state: { method: 'phone' } })}
                className="w-full"
                leftIcon={<Phone className="w-5 h-5" />}
              >
                Telefon orqali ro'yxatdan o'tish
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hisobingiz bormi?{' '}
              <Link to="/login" className="font-medium text-emerald-500 hover:text-emerald-600">
                Kirish
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
