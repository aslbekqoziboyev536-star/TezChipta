import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import { Button } from '../components/ui/Button';
import { Bus, ArrowLeft, Mail, Lock, Phone, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAsync } from '../hooks/useAsync';
import { SafeImage } from '../components/SafeImage';
import { ConfirmationResult } from 'firebase/auth';

import { getFirebaseErrorMessage } from '../utils/firebaseErrors';
import { toast } from 'sonner';
import { LoadingScreen } from '../components/LoadingScreen';

export default function Login() {
  const { t } = useLanguage();
  const { logoUrl } = useSettings();
  const location = useLocation();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>((location.state as any)?.method || 'email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, loginWithPhone, user } = useAuth();
  const { loading, error, execute, reset } = useAsync();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    reset();
    setIsGoogleLoading(true);
    try {
      await execute(() => loginWithGoogle());
      setIsRedirecting(true);
      toast.success("Welcome back!");
    } catch (err: any) {
      setIsGoogleLoading(false);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('auth/popup-closed-by-user')) {
        reset();
        return;
      }
      console.error("Google login error:", err);
      toast.error(getFirebaseErrorMessage(err) || "An error occurred during Google login.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      await execute(() => loginWithEmail(email, password));
      setIsRedirecting(true);
      toast.success("Welcome back!");
    } catch (err: any) {
      console.error("Email login error:", err);
      toast.error(getFirebaseErrorMessage(err) || "An error occurred during login.");
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number (e.g., +998901234567).");
      return;
    }

    try {
      const result = await execute(() => loginWithPhone(phoneNumber));
      setConfirmationResult(result as ConfirmationResult);
      toast.success("Verification code sent!");
    } catch (err: any) {
      console.error("Phone login error:", err);
      toast.error(getFirebaseErrorMessage(err) || "An error occurred during phone login.");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    reset();
    try {
      await execute(() => confirmationResult.confirm(verificationCode));
      setIsRedirecting(true);
      toast.success("Welcome back!");
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Invalid verification code.");
    }
  };

  if (isGoogleLoading || isRedirecting) {
    return <LoadingScreen message="Hisobga kirilmoqda..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
        <Link to="/" className="flex items-center text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm font-medium">Asosiyga qaytish</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-12 sm:mt-0">
        <div className="flex justify-center">
          <SafeImage src={logoUrl} alt="Tez Chipta" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white px-4">
          {t('auth.login.title')}
        </h2>
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4">
          {t('auth.login.subtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#111827] py-6 sm:py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200 dark:border-white/5">
          <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-6 sm:mb-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setLoginMethod('email'); setConfirmationResult(null); }}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Email
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Telefon
            </motion.button>
          </div>

          {loginMethod === 'email' ? (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex flex-col gap-1">
                  <span>{error}</span>
                  <Link to="/errors" className="text-xs underline hover:opacity-80">
                    Check Error Help Center for solutions
                  </Link>
                </div>
              )}

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
                >
                  Kirish
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telefon raqami
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                        placeholder="+998901234567"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                  >
                    Kod yuborish
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.login.code_label')}</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                  >
                    Tasdiqlash
                  </Button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setConfirmationResult(null)}
                    className="w-full text-sm text-gray-500 hover:text-emerald-500 transition-colors"
                  >
                    Raqamni o'zgartirish
                  </motion.button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-[#111827] text-gray-500">Yoki</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={handleGoogleLogin}
                loading={loading}
                className="w-full flex justify-center items-center gap-3"
                leftIcon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />}
              >{t('auth.login.google_btn')}</Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hisobingiz yo'qmi?{' '}
              <Link to="/register" className="font-medium text-emerald-500 hover:text-emerald-600">
                Ro'yxatdan o'ting
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
