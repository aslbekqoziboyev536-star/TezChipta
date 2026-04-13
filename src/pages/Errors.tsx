import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, HelpCircle, ShieldAlert, WifiOff, UserX, Lock, CreditCard, Clock, RefreshCw, AlertTriangle, Activity, Server, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ThemeToggle';

interface ErrorItem {
  code: string;
  title: string;
  description: string;
  solution: string;
  icon: React.ReactNode;
}

const errorList: ErrorItem[] = [
  {
    code: '400',
    title: 'Bad Request / Popup Closed',
    description: 'The request could not be understood by the server or the authentication popup was closed prematurely.',
    solution: 'Please check your input and try again. If you were signing in, keep the popup window open until the process is finished.',
    icon: <UserX className="w-6 h-6 text-orange-500" />
  },
  {
    code: '401',
    title: 'Unauthorized',
    description: 'The request requires user authentication or the credentials provided are invalid.',
    solution: 'Please log in to your account and try again. Double-check your email and password.',
    icon: <Lock className="w-6 h-6 text-red-500" />
  },
  {
    code: '403',
    title: 'Forbidden / Access Denied',
    description: 'The server understood the request but refuses to authorize it.',
    solution: 'You may not have permission to access this resource. Ensure you are logged in with the correct account.',
    icon: <ShieldAlert className="w-6 h-6 text-red-600" />
  },
  {
    code: '404',
    title: 'Not Found',
    description: 'The server can not find the requested resource or page.',
    solution: 'Please check the URL or the resource you are looking for. It might have been moved or deleted.',
    icon: <HelpCircle className="w-6 h-6 text-blue-500" />
  },
  {
    code: '408',
    title: 'Request Timeout',
    description: 'The server timed out waiting for the request.',
    solution: 'Please check your internet connection and try again. The server might be busy.',
    icon: <Clock className="w-6 h-6 text-yellow-500" />
  },
  {
    code: '409',
    title: 'Conflict',
    description: 'The request could not be completed due to a conflict with the current state of the resource.',
    solution: 'This often happens when a document already exists or there is a version conflict. Please refresh and try again.',
    icon: <RefreshCw className="w-6 h-6 text-orange-500" />
  },
  {
    code: '412',
    title: 'Precondition Failed',
    description: 'The server does not meet one of the preconditions that the requester put on the request.',
    solution: 'This is usually a system-level error. Please try again later.',
    icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />
  },
  {
    code: '429',
    title: 'Too Many Requests',
    description: 'The user has sent too many requests in a given amount of time.',
    solution: 'Please wait a few minutes before trying again. This helps protect our services from abuse.',
    icon: <Activity className="w-6 h-6 text-purple-500" />
  },
  {
    code: '500',
    title: 'Internal Server Error',
    description: 'A generic error message, given when an unexpected condition was encountered.',
    solution: 'Something went wrong on our end. Please try again later or contact support if the problem persists.',
    icon: <Server className="w-6 h-6 text-red-500" />
  },
  {
    code: '501',
    title: 'Not Implemented',
    description: 'The server either does not recognize the request method, or it lacks the ability to fulfil the request.',
    solution: 'This feature is currently unavailable. Please check back later.',
    icon: <Settings className="w-6 h-6 text-gray-500" />
  },
  {
    code: '503',
    title: 'Service Unavailable',
    description: 'The server is currently unavailable (overloaded or down for maintenance).',
    solution: 'The service is temporarily down. Please try again in a few minutes.',
    icon: <WifiOff className="w-6 h-6 text-red-500" />
  },
  {
    code: '504',
    title: 'Gateway Timeout',
    description: 'The server was acting as a gateway or proxy and did not receive a timely response.',
    solution: 'The request took too long. Please check your connection and try again.',
    icon: <Clock className="w-6 h-6 text-red-500" />
  },
  {
    code: 'NETWORK_ERROR',
    title: 'Network Connection Lost',
    description: 'Your device is not connected to the internet or the connection is unstable.',
    solution: 'Check your Wi-Fi or mobile data connection and try again.',
    icon: <WifiOff className="w-6 h-6 text-gray-500" />
  },
  {
    code: 'PAYMENT_FAILED',
    title: 'Payment Failed',
    description: 'There was an issue processing your payment through Stripe or manual transfer.',
    solution: 'Ensure your card has sufficient funds and is valid. For manual transfers, make sure the receipt is clear.',
    icon: <CreditCard className="w-6 h-6 text-red-400" />
  }
];


export default function Errors() {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredErrors = errorList.filter(error => 
    error.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    error.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1120] transition-colors duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
        <Link to="/" className="flex items-center space-x-2 text-emerald-500">
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tez<span className="text-emerald-500">Chipta</span></span>
        </Link>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link to="/" className="flex items-center text-sm font-medium text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Error Help Center</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Find explanations and solutions for common error codes.</p>
          
          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Qidiruv (xatolik nomi yoki kodi)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredErrors.length > 0 ? (
            filteredErrors.map((error, index) => (
              <motion.div
                key={error.code}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 hover:border-emerald-500/30 transition-all"
              >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-[#111827] rounded-2xl shadow-sm">
                  {error.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{error.title}</h2>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                      Code: {error.code}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{error.description}</p>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                      <span className="font-bold">Solution:</span> {error.solution}
                    </p>
                  </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Xatolik topilmadi</h3>
              <p className="text-gray-500">Qidiruvingizga mos keladigan xatolik kodi yoki nomi mavjud emas.</p>
            </motion.div>
          )}
        </div>

        <div className="mt-16 p-8 bg-emerald-500 rounded-3xl text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="mb-8 opacity-90">Our support team is available 24/7 to assist you with any issues.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-gray-100">
              Contact Support
            </Button>
            <Link to="/">
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
