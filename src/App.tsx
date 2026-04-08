import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingMenu } from './components/FloatingMenu';
import { ChatWidget } from './components/ChatWidget';
import { NetworkSpeedIndicator } from './components/NetworkSpeedIndicator';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { OnboardingModal } from './components/OnboardingModal';
import { NotificationListener } from './components/NotificationListener';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Admin = lazy(() => import('./pages/Admin'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Profile = lazy(() => import('./pages/Profile'));
const Blog = lazy(() => import('./pages/Blog'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Errors = lazy(() => import('./pages/Errors'));

const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
  </div>
);

export default function App() {
  const isOnline = useNetworkStatus();

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <Toaster position="top-center" richColors />
              <Router>
                <AnimatePresence>
                  {!isOnline && (
                    <motion.div
                      initial={{ y: -100 }}
                      animate={{ y: 0 }}
                      exit={{ y: -100 }}
                      className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4 flex items-center justify-center gap-2 font-medium shadow-lg"
                    >
                      <WifiOff className="w-4 h-4" />
                      Internet connection lost. Some features may not work.
                    </motion.div>
                  )}
                </AnimatePresence>
                <FloatingMenu />
                <ChatWidget />
                <NetworkSpeedIndicator />
                <NotificationListener />
                <OnboardingModal />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/administrator" element={<Admin />} />
                    <Route path="/administrator/:tab" element={<Admin />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/termsofservice" element={<TermsOfService />} />
                    <Route path="/errors" element={<Errors />} />
                  </Routes>
                </Suspense>
              </Router>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
